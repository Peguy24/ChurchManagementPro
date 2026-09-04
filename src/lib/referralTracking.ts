import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "cmp_visitor_id";
const CLICK_KEY = "cmp_ref_click_recorded";
const START_KEY = "cmp_ref_start_recorded";

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** Records a referral link click once per visitor/code per browser session. */
export async function recordReferralClick(code: string): Promise<void> {
  const clean = code.trim().toUpperCase();
  if (!clean) return;
  try {
    const marker = `${CLICK_KEY}:${clean}`;
    if (sessionStorage.getItem(marker)) return;
    sessionStorage.setItem(marker, "1");

    await (supabase as any).rpc("record_referral_click", {
      _code: clean,
      _visitor_hash: getVisitorId(),
      _landing_path: window.location.pathname + window.location.search,
      _referrer_url: document.referrer || null,
      _user_agent: navigator.userAgent,
    });
  } catch (e) {
    console.warn("Referral click tracking failed", e);
  }
}

/** Records that a visitor started the church sign-up form from a referral link. */
export async function recordReferralSignupStart(code: string): Promise<void> {
  const clean = code.trim().toUpperCase();
  if (!clean) return;
  try {
    const marker = `${START_KEY}:${clean}`;
    if (sessionStorage.getItem(marker)) return;
    sessionStorage.setItem(marker, "1");
    await (supabase as any).rpc("record_referral_signup_start", {
      _code: clean,
      _visitor_hash: getVisitorId(),
    });
  } catch (e) {
    console.warn("Referral signup-start tracking failed", e);
  }
}

/** Resolves which referral code should be credited, following the platform attribution model. */
export async function resolveAttributedReferralCode(): Promise<string | null> {
  try {
    const { data } = await (supabase as any).rpc("get_attributed_referral_code", {
      _visitor_hash: getVisitorId(),
    });
    return (data as string) || null;
  } catch {
    return null;
  }
}

/** Links a referral click to the church that just signed up. */
export async function markReferralClickConverted(code: string, tenantId: string): Promise<void> {
  const clean = code.trim().toUpperCase();
  if (!clean || !tenantId) return;
  try {
    await (supabase as any).rpc("mark_referral_click_converted", {
      _code: clean,
      _visitor_hash: getVisitorId(),
      _tenant_id: tenantId,
    });
  } catch (e) {
    console.warn("Referral conversion tracking failed", e);
  }
}

