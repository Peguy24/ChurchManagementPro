

## Plan: Insert Sample Donation Records

I will insert a set of diverse donation records into the database using your tenant ID (`637bff83-cacf-4199-9e8d-c68192a0edcb`), using existing members, branches, and cash registers.

### Records to Insert (10 donations)

| Date | Member | Type | Amount (HTG) | Method | Description |
|------|--------|------|-------------|--------|-------------|
| 2026-02-25 | Jean Baptiste | tithe | 5,000 | cash | Dîme février 2026 |
| 2026-02-23 | Marie Joseph | offering | 2,500 | cash | Offrande culte dominical |
| 2026-02-20 | Esther Abraham | tithe | 8,000 | transfer | Dîme février 2026 |
| 2026-02-18 | Samuel Lazare | special | 15,000 | check | Don spécial construction |
| 2026-02-16 | Elisabeth Thomas | offering | 3,000 | mobile_money | Offrande mercredi soir |
| 2026-02-14 | Anonymous | offering | 1,500 | cash | Offrande anonyme |
| 2026-02-10 | Anne Michel | tithe | 6,000 | transfer | Dîme février 2026 |
| 2026-02-08 | rubens Etienne fils | special | 10,000 | cash | Don missions |
| 2026-02-05 | Laborde Freude | offering | 4,000 | card | Offrande culte dominical |
| 2026-02-01 | Rosena Thera | tithe | 7,500 | cash | Dîme février 2026 |

### Technical Details
- All records use `tenant_id = '637bff83-cacf-4199-9e8d-c68192a0edcb'`
- Cash payments linked to the "Petite Caisse" cash register
- Records distributed across branches (Église Centrale, Pétion-Ville, Carrefour)
- Mix of donation types: tithe, offering, special
- Mix of payment methods: cash, check, transfer, mobile_money, card
- One anonymous donation (no member_id)

### Implementation
Single database data insertion — no code changes needed.

