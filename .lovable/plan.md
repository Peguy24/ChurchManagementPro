

## Clean Up Old Test Stripe Subscriptions

### Summary of Findings

After analyzing all 13 Stripe subscriptions, here's the breakdown:

**Legitimate (keep):**
- `sub_1T8mWk...` — Enterprise plan, customer `cus_U70X...` — active, real price
- `sub_1T4m8Z...` — Professional plan, customer `cus_U2rq...` — active, real price

**Test/duplicate subscriptions to cancel (6 active):**

1. `sub_1T4m7B...` — Duplicate Professional sub for same customer `cus_U2rq...` (has 2 active Pro subs)
2. `sub_1Sj4Rp...` — Test price `price_1Sj4Rc...`, customer `cus_TYee...`
3. `sub_1Sh46K...` — Test price `price_1Sh466...`, customer `cus_TeMe...` (Family Church of God — $20)
4. `sub_1Sh3vR...` — Test price `price_1Sh3v6...`, customer `cus_TeMe...` (Family Church of God — $1)
5. `sub_1Sh3L9...` — Test price `price_1Sh3Ky...`, customer `cus_TYee...`
6. `sub_1Sg9Bf...` — Test price `price_1Sg9BJ...`, customer `cus_TYee...`

The remaining 5 subscriptions are already canceled — no action needed.

### Plan

1. **Cancel the 6 active test/duplicate subscriptions** listed above using the Stripe cancel subscription tool
2. **Verify** only the 2 legitimate subscriptions remain active afterward

### Important Notes
- Canceling stops future billing but preserves invoice history (the $1 and $20 charges will still show in Stripe records as historical data)
- The payment history UI will continue to display past invoices — if you want to hide old test invoices from the tenant's view, that would be a separate code change to filter by date or price ID

