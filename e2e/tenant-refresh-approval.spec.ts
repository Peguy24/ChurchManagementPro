import { expect, test, type Page } from "@playwright/test";

type BackendApprovalStatus = {
  approved: boolean;
  tenantId: string | null;
  tenantName: string | null;
  roles: Array<{ role: string; is_approved: boolean }>;
};

const storageKey = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY ?? process.env.E2E_SUPABASE_STORAGE_KEY;
const sessionJson = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON ?? process.env.E2E_SUPABASE_SESSION_JSON;
const cookiesJson = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON ?? process.env.E2E_SUPABASE_COOKIES_JSON;

test.skip(!storageKey || !sessionJson, "Tenant refresh regression needs an injected tenant auth session.");

async function restoreInjectedSession(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
      window.sessionStorage.setItem("app_session_active", "true");
    },
    { key: storageKey ?? "", value: sessionJson ?? "" },
  );
}

test.beforeEach(async ({ context, page }) => {
  if (cookiesJson) {
    const parsedCookies = JSON.parse(cookiesJson) as Array<Record<string, unknown>>;
    const scopedCookies = parsedCookies.map((cookie) => ({ ...cookie, url: "http://localhost:8080" }));
    await context.addCookies(scopedCookies);
  }
  await restoreInjectedSession(page);
});

test("approved tenant refresh never flashes pending approval or platform branding", async ({ page }) => {
  await page.goto("/members", { waitUntil: "domcontentloaded" });

  const backendStatus = await page.evaluate(async (): Promise<BackendApprovalStatus> => {
    const { supabase } = await import("/src/integrations/supabase/client.ts");
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      throw new Error("No authenticated user available to verify backend approval status.");
    }

    const profileResult = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      throw new Error(`Unable to verify backend profile status: ${profileResult.error.message}`);
    }

    const tenantId = profileResult.data?.tenant_id ?? null;
    if (!tenantId) {
      return { approved: false, tenantId: null, tenantName: null, roles: [] };
    }

    const [roleResult, tenantResult] = await Promise.all([
      supabase
        .from("tenant_user_roles")
        .select("role, is_approved")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id),
      supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .maybeSingle(),
    ]);

    if (roleResult.error) {
      throw new Error(`Unable to verify backend tenant role status: ${roleResult.error.message}`);
    }
    if (tenantResult.error) {
      throw new Error(`Unable to verify backend tenant status: ${tenantResult.error.message}`);
    }

    const roles = roleResult.data ?? [];
    return {
      approved: roles.some((row) => row.is_approved === true),
      tenantId,
      tenantName: tenantResult.data?.name ?? null,
      roles,
    };
  });

  if (!backendStatus.approved) {
    await expect(page.getByTestId("pending-approval-page")).toBeVisible();
    test.info().annotations.push({ type: "backend-status", description: "User is actually pending in backend; pending page is expected." });
    return;
  }

  await expect(page.getByTestId("pending-approval-page")).toHaveCount(0);
  await expect(page.getByTestId("app-brand")).toHaveAttribute("data-brand-mode", "tenant");
  if (backendStatus.tenantName) {
    await expect(page.getByTestId("app-brand-name")).toContainText(backendStatus.tenantName);
  }

  const pendingVisibleDuringRefresh: string[] = [];
  const platformBrandDuringRefresh: string[] = [];

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.reload({ waitUntil: "domcontentloaded" });

    for (let sample = 1; sample <= 20; sample += 1) {
      const pendingCount = await page.getByTestId("pending-approval-page").count();
      if (pendingCount > 0) {
        pendingVisibleDuringRefresh.push(`refresh ${attempt}, sample ${sample}`);
      }

      const brandMode = await page.getByTestId("app-brand").getAttribute("data-brand-mode").catch(() => null);
      if (brandMode === "platform") {
        platformBrandDuringRefresh.push(`refresh ${attempt}, sample ${sample}`);
      }

      await page.waitForTimeout(100);
    }

    await expect(page.getByTestId("pending-approval-page")).toHaveCount(0);
    await expect(page.getByTestId("app-brand")).toHaveAttribute("data-brand-mode", "tenant");
  }

  expect(pendingVisibleDuringRefresh, "Pending Approval must not appear when backend role is approved").toEqual([]);
  expect(platformBrandDuringRefresh, "Tenant refresh must not flash platform branding").toEqual([]);
});