# Migration deployment safety

**Settled 10 August 2026, as part of Visual Authority Tranche 1.**

## The weakness this closes

Vercel deploys the frontend automatically on every merge to `main`. **Nothing deploys the
Supabase migrations.** Every migration to date has been applied by hand.

On 9 August 2026 that gap became a production failure. PR #98 and PR #99 merged frontend code
that reads `fund_releases` and `fund_acquittals`; the migration creating those tables was never
applied to production. The deployed Hub returned

```
Could not find the table 'public.fund_acquittals' in the schema cache
```

in front of the Founder. PR #100 applied the migration by hand and proved the result correct, but
nothing in the repository could have *noticed* the mismatch before a person did.

## What is implemented

A build-time drift check: `scripts/check-migration-drift.mjs`, wired as the first step of
`npm run build`, and available on its own as:

```bash
npm run check:migrations
```

It compares the migrations in `supabase/migrations/*.sql` against
`supabase/migrations/applied-to-production.json`, a checked-in ledger of what has genuinely been
applied to the production project. If the repository is ahead, the build **fails** and names the
pending files.

Because it runs inside `npm run build`, it runs inside the Vercel deployment. A merge that
introduces a migration cannot reach production until either the migration is applied and recorded,
or someone consciously overrides the guard.

### Why detection, and not automatic application

Applying migrations automatically from deployment code would require production database
credentials in the deployment environment — new secrets and new deployment authority that have not
been settled. That is a materially larger change than this tranche should carry, and a wrong
automatic migration is far worse than a failed build.

So this guard **detects and fails**. It opens no network connection, reads no environment
credential, and is given none. The test suite asserts that (`src/test/migrationDrift.test.js`).

### Why the ledger, and not a live query

A live check would need those same credentials. The ledger is credential-free, reviewable in a
pull request, and — because it is a file — it says what a person has actually confirmed rather
than what a script inferred.

Its cost is honest: **the ledger is only as true as the person who updated it.** Updating it
without applying the migration would defeat the guard. That is a deliberate trade: the guard makes
the deployment step *visible and reviewable*, it does not make it automatic.

### Reconcile by name, never by timestamp

Supabase stamps its own version when a migration is applied through the dashboard or MCP, so the
production version does **not** match the repository filename prefix. For example:

| Repository file | Production version |
| --- | --- |
| `20260731000200_internal_cost_claims.sql` | `20260731160117` |
| `20260809000100_fund_release_and_reconciliation.sql` | `20260809191358` |

The name after the prefix is the stable key. The guard and the ledger both compare on it.

## The controlled manual step

When a pull request adds a migration:

1. **Merge the pull request.** The build will fail on the drift check — that is the guard working.
2. **Apply the migration to production**, unchanged, from the merged file. Verify first that it is
   byte-identical to merged `main`, additive-only, and safe against the rows production actually
   holds.
3. **Confirm it applied** — list the production migration history and check the name is present.
4. **Record it** in `supabase/migrations/applied-to-production.json`, in apply order, with the
   version Supabase reports.
5. **Redeploy.** The build now passes.

Editing the ledger applies nothing. It only records what someone already did.

## Emergency override

`ALLOW_UNAPPLIED_MIGRATIONS=1` downgrades the failure to a loud warning, for a frontend-only
hotfix that must ship while a migration is still pending. It prints exactly what may break at
runtime. It is noisy on purpose and should be rare.

## State at the time of writing

14 repository migrations; 14 recorded as applied to production (`botanique-admin`,
`wcacyfyxjiysfibuuhgf`), verified 9–10 August 2026. No drift.

## What this does not do

- It does not apply migrations.
- It does not verify that an applied migration produced the *right* schema. PR #100's catalog
  fingerprint comparison did that once, by hand; it is not automated here.
- It does not run on pull requests, only on build. There is no CI in this repository
  (`.github/workflows/` does not exist). Adding CI is a larger, separate change.
