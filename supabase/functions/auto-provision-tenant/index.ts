import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-PROVISION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { church_name, contact_name, contact_email, contact_phone, address, requested_plan, message } = await req.json();

    if (!church_name || !contact_name || !contact_email) {
      return new Response(JSON.stringify({ error: "Required fields missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Server-side validation (defense in depth — re-check even if client is bypassed)
    const trim = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const cn = trim(church_name);
    const ctn = trim(contact_name);
    const em = trim(contact_email).toLowerCase();
    const ph = trim(contact_phone);
    const ad = trim(address);
    const ms = trim(message);

    const validationError = (msg: string) =>
      new Response(JSON.stringify({ error: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });

    if (cn.length < 1 || cn.length > 100) return validationError("Invalid church name (1–100 characters)");
    if (ctn.length < 1 || ctn.length > 100) return validationError("Invalid contact name (1–100 characters)");
    if (!/^[\p{L}\p{M}'’\-.\s]+$/u.test(ctn)) return validationError("Contact name may only contain letters, spaces, apostrophes and hyphens");
    if (em.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return validationError("Invalid email address");
    if (ph && (ph.length < 7 || ph.length > 20 || !/^[+\d()\-\s]+$/.test(ph))) return validationError("Invalid phone number");
    if (ad.length > 255) return validationError("Address too long (max 255 characters)");
    if (ms.length > 2000) return validationError("Message too long (max 2000 characters)");
    if (!["basic", "standard", "premium"].includes(requested_plan)) return validationError("Invalid plan");

    logStep("Request received", { church_name: cn, contact_email: em, requested_plan });

    // Check if email already has an active tenant (this is a hard block)
    const { data: existingTenantContact } = await supabase
      .from("tenants")
      .select("id")
      .eq("contact_email", em)
      .maybeSingle();

    if (existingTenantContact) {
      return new Response(JSON.stringify({ error: "A church is already registered with this email address." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if email is registered as an auth user — only block if user is actually in use
    let existingUserId: string | null = null;
    try {
      let page = 1;
      const perPage = 200;
      while (page <= 50) {
        const { data: list } = await supabase.auth.admin.listUsers({ page, perPage });
        const users = list?.users || [];
        if (users.length === 0) break;
        const match = users.find(u => u.email?.toLowerCase() === em);
        if (match) { existingUserId = match.id; break; }
        if (users.length < perPage) break;
        page++;
      }
    } catch (e) {
      logStep("listUsers warning", { error: String(e) });
    }

    if (existingUserId) {
      // Block only if this user has an actual role somewhere
      const { data: platformRole } = await supabase
        .from("platform_user_roles")
        .select("role")
        .eq("user_id", existingUserId)
        .maybeSingle();
      const { data: tenantRoles } = await supabase
        .from("tenant_user_roles")
        .select("tenant_id")
        .eq("user_id", existingUserId)
        .limit(1);

      if (platformRole || (tenantRoles && tenantRoles.length > 0)) {
        return new Response(JSON.stringify({ error: "This email is already registered. Please use a different email address." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Orphan auth user — clean it up so registration can proceed
      logStep("Cleaning up orphan auth user", { userId: existingUserId, email: em });
      await supabase.from("user_roles").delete().eq("user_id", existingUserId);
      await supabase.from("profiles").delete().eq("id", existingUserId);
      const { error: delErr } = await supabase.auth.admin.deleteUser(existingUserId);
      if (delErr) {
        logStep("Failed to delete orphan auth user", { error: delErr.message });
        return new Response(JSON.stringify({ error: "This email is already registered. Please use a different email address." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    // Also clear stale tenant_requests / admin_invitations referencing this email
    try { await supabase.from("admin_invitations").delete().eq("email", em); } catch (_e) {}
    try { await supabase.from("tenant_requests").delete().eq("contact_email", em); } catch (_e) {}

    // 1. Generate slug
    const baseSlug = church_name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("slug", baseSlug)
      .maybeSingle();

    const slug = existingTenant ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;
    logStep("Slug generated", { slug });

    // 2. Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: church_name,
        slug,
        contact_email,
        contact_phone: contact_phone || null,
        address: address || null,
      })
      .select()
      .single();

    if (tenantError) throw new Error(`Error creating tenant: ${tenantError.message}`);
    logStep("Tenant created", { tenantId: tenant.id, slug });

    // 3. Create trial subscription
    const planConfig: Record<string, { price: number; members: number; branches: number; users: number; storage: number }> = {
      free: { price: 0, members: 100, branches: 1, users: 3, storage: 200 },
      basic: { price: 29.99, members: 200, branches: 1, users: 5, storage: 500 },
      standard: { price: 59.99, members: 1000, branches: 3, users: 15, storage: 2000 },
      premium: { price: 99.99, members: -1, branches: -1, users: -1, storage: -1 },
    };

    const plan = requested_plan || "basic";
    const config = planConfig[plan] || planConfig.basic;
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error: subError } = await supabase
      .from("tenant_subscriptions")
      .insert({
        tenant_id: tenant.id,
        plan: plan,
        status: "trial",
        price_monthly: config.price,
        max_members: config.members,
        max_branches: config.branches,
        max_users: config.users,
        max_storage_mb: config.storage,
        trial_ends_at: trialEndsAt,
      });

    if (subError) throw new Error(`Error creating subscription: ${subError.message}`);
    logStep("Trial subscription created", { plan, trialEndsAt });

    // 4. Store request record
    await supabase.from("tenant_requests").insert({
      church_name,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      address: address || null,
      requested_plan: plan,
      message: message || null,
      status: "approved",
      created_tenant_id: tenant.id,
      reviewed_at: new Date().toISOString(),
    });
    logStep("Request record saved");

    // 5. Create admin invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("admin_invitations")
      .insert({
        tenant_id: tenant.id,
        email: contact_email,
      })
      .select("token")
      .single();

    if (inviteError) throw new Error(`Error creating invitation: ${inviteError.message}`);
    logStep("Admin invitation created");

    // 6. Send email with invitation link
    const siteUrl = "https://churchmanagementpro.com";
    const registrationLink = `${siteUrl}/t/${slug}/auth?invite=${invitation.token}`;
    logStep("Registration link generated", { registrationLink });

    const planLabels: Record<string, string> = {
      basic: "Essential",
      standard: "Professional",
      premium: "Enterprise",
    };

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const emailResponse = await resend.emails.send({
          from: "Church Management Pro <noreply@churchmanagementpro.com>",
          to: [contact_email],
          subject: `Welcome to Church Management Pro - ${church_name}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Welcome!</h1>
                  <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Your Church Management Pro space is ready</p>
                </div>
                
                <div style="padding: 40px 30px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hello <strong>${contact_name}</strong>,
                  </p>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your church <strong>${church_name}</strong> has been successfully registered on Church Management Pro! 
                    You have a <strong>14-day free trial</strong> with all features included.
                  </p>

                  <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="color: #1E40AF; font-size: 14px; margin: 0;">
                      <strong>📋 Summary</strong><br>
                      <strong>Church:</strong> ${church_name}<br>
                      <strong>Plan:</strong> ${planLabels[plan] || plan} (free trial)<br>
                      <strong>Trial ends:</strong> ${new Date(trialEndsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Click the button below to create your admin account and start managing your church.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${registrationLink}" style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      ✨ Create My Admin Account
                    </a>
                  </div>

                  <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="color: #92400E; font-size: 14px; margin: 0;">
                      <strong>⚠️ Personal & Secure Link</strong><br>
                      This link is unique and valid for 7 days. Do not share it with anyone.
                    </p>
                  </div>
                  
                  <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                    If the button doesn't work, copy this link into your browser:<br>
                    <a href="${registrationLink}" style="color: #3B82F6; word-break: break-all;">${registrationLink}</a>
                  </p>
                </div>
                
                <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                  <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Church Management Pro. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        if (emailResponse.error) {
          throw new Error(`Resend error: ${emailResponse.error.message}`);
        }

        emailSent = true;
        logStep("Welcome email sent successfully", { messageId: emailResponse.data?.id });

        // Notify super admins about new tenant signup
        try {
          const { data: platformAdmins } = await supabase
            .from("platform_user_roles")
            .select("user_id")
            .eq("role", "super_admin");

          const superAdminEmails: string[] = [];
          for (const admin of platformAdmins || []) {
            const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
            if (userData?.user?.email) {
              superAdminEmails.push(userData.user.email);
            }
          }

          if (superAdminEmails.length > 0) {
            await resend.emails.send({
              from: "Church Management Pro <noreply@churchmanagementpro.com>",
              to: superAdminEmails,
              subject: `🆕 New Church Registered: ${church_name}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
                  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏛️ New Church Registration</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">A new tenant has joined the platform</p>
                    </div>
                    <div style="padding: 30px;">
                      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 20px;">
                        <h2 style="margin: 0 0 15px 0; color: #166534;">Church Details</h2>
                        <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${church_name}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Contact:</strong> ${contact_name}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${contact_email}</p>
                        ${contact_phone ? `<p style="margin: 0 0 8px 0;"><strong>Phone:</strong> ${contact_phone}</p>` : ''}
                        ${address ? `<p style="margin: 0 0 8px 0;"><strong>Address:</strong> ${address}</p>` : ''}
                        <p style="margin: 0 0 8px 0;"><strong>Plan:</strong> ${planLabels[plan] || plan} (14-day trial)</p>
                        <p style="margin: 0;"><strong>Slug:</strong> ${slug}</p>
                      </div>
                      <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe;">
                        <p style="margin: 0; color: #1e40af; font-size: 14px;">
                          <strong>📊 Trial ends:</strong> ${new Date(trialEndsAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <p style="color: #6b7280; font-size: 13px; margin-top: 20px; text-align: center;">
                        This is an automated notification from Church Management Pro.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            });
            logStep("Super admin notification sent", { adminCount: superAdminEmails.length });
          }
        } catch (adminNotifyErr) {
          logStep("Failed to notify super admins", { error: String(adminNotifyErr) });
        }

      } catch (emailErr) {
        logStep("Failed to send email", { error: String(emailErr) });
      }
    } else {
      logStep("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(JSON.stringify({
      success: true,
      tenantId: tenant.id,
      slug: tenant.slug,
      registrationLink,
      emailSent,
      message: emailSent 
        ? "Your church has been created! Check your email to activate your account."
        : "Your church has been created! Use the link below to activate your account.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
