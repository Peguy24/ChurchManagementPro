# Free up database space and calm down the background jobs

The database is nearly full, and almost all of the space is taken by the log of past
background-job runs, not by any church data. This plan clears that log, keeps it from
growing back, and makes the hourly statistics refresh less frequent.

## 1. Clear the old job-run log

Wipe the accumulated history in one fast operation (counting the rows already times out,
so a row-by-row delete is not viable). No church, member, or finance data is touched —
this is only the record of "job X ran at time Y".

## 2. Keep it from growing back

Add a small daily cleanup that keeps only the last 7 days of job-run history, so the
table stays a few megabytes instead of gigabytes.

## 3. Reduce the statistics refresh

The tenant statistics refresh currently runs every hour, which is the main producer of
these log rows. Change it to run every 6 hours (4 times a day). Church dashboards keep
working; figures can be up to 6 hours behind instead of 1 hour.

## 4. Remove a duplicate job

Two identical jobs both check expired discounts every day at 6:00
(`check-expired-discounts-daily` and `check-expired-discounts`). Keep one, remove the other.

## Technical details

- `TRUNCATE cron.job_run_details;` to reclaim the ~8.6 GB immediately.
- New cron job `purge-cron-history`, daily at 03:00:
  `DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';`
- Reschedule job `refresh-tenant-stats-hourly` from `0 * * * *` to `0 */6 * * *`
  (rename to `refresh-tenant-stats`).
- `cron.unschedule('check-expired-discounts')`, keep `check-expired-discounts-daily`.
- Run as direct SQL (not a migration) since it touches the `cron` schema and project-specific state.
- Afterwards, re-check disk usage with the database health snapshot to confirm the space is freed.

## Not included

Increasing the database disk size — say the word if you want that as extra headroom after
the cleanup.
