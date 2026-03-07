import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    logStep("Request received", { church_name, contact_email, requested_plan });

    // Check if email is already registered as a user
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === contact_email.toLowerCase());
    if (emailExists) {
      return new Response(JSON.stringify({ error: "This email is already registered. Please use a different email address." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check if email already has a tenant
    const { data: existingTenantContact } = await supabase
      .from("tenants")
      .select("id")
      .eq("contact_email", contact_email.toLowerCase())
      .maybeSingle();

    if (existingTenantContact) {
      return new Response(JSON.stringify({ error: "A church is already registered with this email address." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

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
      basic: { price: 49, members: 200, branches: 1, users: 5, storage: 500 },
      standard: { price: 99, members: 1000, branches: 3, users: 15, storage: 2000 },
      premium: { price: 199, members: -1, branches: -1, users: -1, storage: -1 },
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
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://cogmpw-sys.lovable.app";
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
          from: "Church Manager Pro <noreply@churchmanagementpro.com>",
          to: [contact_email],
          subject: `Welcome to Church Manager Pro - ${church_name}`,
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
                  <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Your Church Manager Pro space is ready</p>
                </div>
                
                <div style="padding: 40px 30px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Hello <strong>${contact_name}</strong>,
                  </p>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your church <strong>${church_name}</strong> has been successfully registered on Church Manager Pro! 
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
                    © ${new Date().getFullYear()} Church Manager Pro. All rights reserved.
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
