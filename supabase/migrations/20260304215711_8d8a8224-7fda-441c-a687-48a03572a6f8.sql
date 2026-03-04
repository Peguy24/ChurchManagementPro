UPDATE tenant_subscriptions SET max_members = 1000, max_branches = 3, max_users = 15 WHERE plan = 'standard';
UPDATE tenant_subscriptions SET max_members = 200, max_branches = 1, max_users = 5 WHERE plan = 'basic';
UPDATE tenant_subscriptions SET max_members = -1, max_branches = -1, max_users = -1 WHERE plan = 'premium';