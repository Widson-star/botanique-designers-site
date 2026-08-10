// Fail the production build when the repository's Supabase migrations are ahead
// of what has actually been applied to production.
//
// The weakness this closes is structural, not a one-off mistake. Vercel deploys
// the frontend on every merge; nothing deploys migrations. So merged frontend
// code can — and on 9 August 2026 did — reach production expecting tables that
// were never created there. The failure surfaced as a runtime error in front of
// the Founder, not as a failed deploy.
//
// This check is deliberately the smallest thing that works:
//
//   * It needs NO credentials and opens NO network connection. It cannot leak a
//     secret because it is never given one, and it runs identically on a laptop
//     and inside Vercel's build container, where no database URL exists.
//   * It applies NOTHING. Applying migrations automatically from frontend
//     deployment code would need production database authority that has not been
//     settled, so this detects and fails instead. The controlled manual step is
//     documented in docs/ui-authority/operations-hub/MIGRATION-DEPLOYMENT.md.
//   * It reconciles on migration NAME, never on the filename timestamp. Supabase
//     stamps its own version when a migration is applied through the dashboard,
//     so repository prefixes and production versions legitimately differ; only
//     the name is stable across both.
//
// Escape hatch: ALLOW_UNAPPLIED_MIGRATIONS=1 downgrades the failure to a loud
// warning, for the case where a frontend-only hotfix genuinely must ship while a
// migration is still pending. It is noisy on purpose.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(root, "supabase", "migrations");
const LEDGER = join(MIGRATIONS_DIR, "applied-to-production.json");

// "20260809000100_fund_release_and_reconciliation.sql" → "fund_release_and_reconciliation"
export function migrationName(filename) {
  return filename.replace(/\.sql$/i, "").replace(/^\d+_/, "");
}

export function repositoryMigrations(dir = MIGRATIONS_DIR) {
  return readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".sql"))
    .sort()
    .map((file) => ({ file, name: migrationName(file) }));
}

export function appliedMigrations(ledgerPath = LEDGER) {
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
  return (ledger.applied || []).map((entry) => entry.name);
}

// The whole comparison, kept pure so the failure path can be tested without a
// build. Returns every repository migration production has no record of.
export function findDrift(repository, applied) {
  const known = new Set(applied);
  return repository.filter((migration) => !known.has(migration.name));
}

function main() {
  const repository = repositoryMigrations();
  const applied = appliedMigrations();
  const pending = findDrift(repository, applied);

  if (!pending.length) {
    console.log(
      `Migration check: ${repository.length} repository migrations, all recorded as applied to production.`
    );
    return;
  }

  const list = pending.map((migration) => `  - ${migration.file}`).join("\n");
  const message = [
    "",
    "MIGRATION DRIFT: the repository is ahead of production.",
    "",
    `${pending.length} migration${pending.length === 1 ? " is" : "s are"} not recorded as applied to the`,
    "production Supabase project, so deploying this frontend would ship code that",
    "expects database objects production does not have:",
    "",
    list,
    "",
    "Apply them to production first (the controlled manual step is documented in",
    "docs/ui-authority/operations-hub/MIGRATION-DEPLOYMENT.md), then record each one",
    "in supabase/migrations/applied-to-production.json and build again.",
    "",
  ].join("\n");

  if (process.env.ALLOW_UNAPPLIED_MIGRATIONS === "1") {
    console.warn(message);
    console.warn(
      "ALLOW_UNAPPLIED_MIGRATIONS=1 is set, so this build continues anyway. The\n" +
      "deployed frontend may fail at runtime until the migrations above are applied.\n"
    );
    return;
  }

  console.error(message);
  process.exit(1);
}

// Only run when invoked as a script, so the functions above stay importable.
if (process.argv[1] && process.argv[1].endsWith("check-migration-drift.mjs")) main();
