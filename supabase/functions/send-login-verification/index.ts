import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const translations = {
  en: {
    subject: 'Your login verification code',
    heading: 'Login Verification',
    text: 'Use the code below to complete your login:',
    footer: 'This code expires in 10 minutes. If you did not attempt to log in, please secure your account immediately.',
    greeting: 'Hello',
  },
  fr: {
    subject: 'Votre code de vérification de connexion',
    heading: 'Vérification de connexion',
    text: 'Utilisez le code ci-dessous pour compléter votre connexion :',
    footer: 'Ce code expire dans 10 minutes. Si vous n\'avez pas tenté de vous connecter, veuillez sécuriser votre compte immédiatement.',
    greeting: 'Bonjour',
  },
  ht: {
    subject: 'Kòd verifikasyon koneksyon ou',
    heading: 'Verifikasyon koneksyon',
    text: 'Itilize kòd ki anba a pou konplete koneksyon ou :',
    footer: 'Kòd sa a ekspire nan 10 minit. Si ou pa t eseye konekte, tanpri sekirize kont ou imedyatman.',
    greeting: 'Bonjou',
  },
}

type Lang = 'en' | 'fr' | 'ht'

function getLang(raw?: string | null): Lang {
  if (!raw) return 'en'
  const l = raw.toLowerCase().slice(0, 2)
  if (l === 'fr') return 'fr'
  if (l === 'ht') return 'ht'
  return 'en'
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, '').trim()
}

async function hashCode(code: string): Promise<string> {
  const normalized = normalizeCode(code)
  const data = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const LOGO_URL = 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/storage/v1/object/public/email-assets/logo.png'
const SITE_NAME = 'Church Management Pro'

function buildEmailHtml(code: string, lang: Lang, firstName?: string): string {
  const t = translations[lang]
  const name = firstName || t.greeting
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:30px 25px;">
    <img src="${LOGO_URL}" alt="${SITE_NAME}" width="180" style="margin:0 0 24px;" />
    <h1 style="font-size:22px;font-weight:bold;color:hsl(222,47%,11%);margin:0 0 20px;">${t.heading}</h1>
    <p style="font-size:14px;color:hsl(221,16%,47%);line-height:1.6;margin:0 0 10px;">${name},</p>
    <p style="font-size:14px;color:hsl(221,16%,47%);line-height:1.6;margin:0 0 25px;">${t.text}</p>
    <div style="background-color:hsl(221,83%,97%);border:2px solid hsl(221,83%,40%);border-radius:12px;padding:20px;text-align:center;margin:0 0 30px;">
      <span style="font-family:'Courier New',monospace;font-size:36px;font-weight:bold;color:hsl(221,83%,40%);letter-spacing:8px;">${code}</span>
    </div>
    <p style="font-size:12px;color:#999999;margin:30px 0 0;">${t.footer}</p>
  </div>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, email, code: verifyCode, userId } = await req.json()

    // === SEND CODE ===
    if (action === 'send') {
      if (!email || !userId) {
        return new Response(JSON.stringify({ error: 'Missing email or userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Invalidate previous unused codes
      await supabase
        .from('login_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('used_at', null)

      // Generate new code and store only its hash at rest
      const newCode = generateCode()
      const hashedCode = await hashCode(newCode)

      const { error: insertError } = await supabase
        .from('login_verification_codes')
        .insert({
          user_id: userId,
          email,
          code: hashedCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })

      if (insertError) {
        console.error('Failed to store verification code:', insertError)
        return new Response(JSON.stringify({ error: 'Failed to generate code' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get user language from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('language, first_name')
        .eq('email', email)
        .maybeSingle()

      const lang = getLang(profile?.language)
      const t = translations[lang]
      const html = buildEmailHtml(newCode, lang, profile?.first_name)

      // Send email via Resend
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured')
        return new Response(JSON.stringify({ error: 'Email service not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${SITE_NAME} <noreply@churchmanagementpro.com>`,
          to: [email],
          subject: t.subject,
          html,
        }),
      })

      if (!emailRes.ok) {
        const errBody = await emailRes.text()
        console.error('Resend error:', errBody)
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log('Login verification code sent', { email, lang })

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === VERIFY CODE ===
    if (action === 'verify') {
      if (!email || !verifyCode || !userId) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const normalizedVerifyCode = normalizeCode(verifyCode)
      const hashedVerifyCode = await hashCode(normalizedVerifyCode)

      const { data: codeRecord, error: fetchError } = await supabase
        .from('login_verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('email', email)
        .in('code', [hashedVerifyCode, normalizedVerifyCode])
        .is('used_at', null)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError || !codeRecord) {
        return new Response(JSON.stringify({ error: 'invalid_code', valid: false }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Mark code as used
      await supabase
        .from('login_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeRecord.id)

      return new Response(JSON.stringify({ valid: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Login verification error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
