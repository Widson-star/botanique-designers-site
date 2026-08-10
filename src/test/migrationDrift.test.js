// The guard that stops PR #98/#99's failure mode recurring: frontend code
// reaching production ahead of the database objects it reads.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appliedMigrations, findDrift, migrationName, repositoryMigrations,
} from "../../scripts/check-migration-drift.mjs";

function fixture(files, appliedNames) {
  const dir = mkdtempSync(join(tmpdir(), "bd-migrations-"));
  files.forEach((file) => writeFileSync(join(dir, file), "-- fixture\n"));
  const ledger = join(dir, "applied-to-production.json");
  writeFileSync(ledger, JSON.stringify({ applied: appliedNames.map((name) => ({ name })) }));
  return { dir, ledger };
}

describe("migration drift detection", () => {
  it("reconciles on the migration name, not the filename timestamp", () => {
    // Supabase stamps its own version on apply, so the prefixes legitimately
    // differ between the repository and production. Only the name is stable.
    expect(migrationName("20260731000200_internal_cost_claims.sql")).toBe("internal_cost_claims");
    expect(migrationName("20260731160117_internal_cost_claims.sql")).toBe("internal_cost_claims");
  });

  it("detects a repository migration production has never had applied", () => {
    const { dir, ledger } = fixture(
      ["20260101000100_first.sql", "20260202000100_second.sql"],
      ["first"]
    );
    const pending = findDrift(repositoryMigrations(dir), appliedMigrations(ledger));
    expect(pending.map((entry) => entry.name)).toEqual(["second"]);
  });

  it("reports no drift when every migration is recorded, whatever the prefixes", () => {
    const { dir, ledger } = fixture(["20260101000100_first.sql"], ["first", "an_older_one"]);
    expect(findDrift(repositoryMigrations(dir), appliedMigrations(ledger))).toEqual([]);
  });

  it("holds for the real repository: nothing merged is ahead of production", () => {
    expect(findDrift(repositoryMigrations(), appliedMigrations())).toEqual([]);
  });

  it("fails the build, and names the pending migration, without touching a database", () => {
    // The whole point is a non-zero exit. Proven by running the real script
    // against a drifted fixture through the same entry point the build uses.
    const { dir, ledger } = fixture(["20260101000100_first.sql", "20260202000100_second.sql"], ["first"]);
    const runner = join(dir, "run.mjs");
    writeFileSync(runner, [
      `import { appliedMigrations, findDrift, repositoryMigrations } from ${JSON.stringify(join(globalThis.process.cwd(), "scripts/check-migration-drift.mjs"))};`,
      `const pending = findDrift(repositoryMigrations(${JSON.stringify(dir)}), appliedMigrations(${JSON.stringify(ledger)}));`,
      "if (pending.length) { console.error('MIGRATION DRIFT: ' + pending.map((m) => m.file).join(', ')); process.exit(1); }",
    ].join("\n"));

    let failed = false;
    let output = "";
    try {
      execFileSync(globalThis.process.execPath, [runner], { encoding: "utf8", stdio: "pipe" });
    } catch (error) {
      failed = true;
      output = String(error.stderr || "");
    }
    expect(failed).toBe(true);
    expect(output).toContain("20260202000100_second.sql");
  });

  it("never reads a credential, because it is never given one", () => {
    // A guard that needed production database authority would be a new secret in
    // the deployment path. This one compares two files.
    const source = execFileSync("cat", ["scripts/check-migration-drift.mjs"], { encoding: "utf8" });
    expect(source).not.toMatch(/SUPABASE_(SERVICE|DB|SECRET)|process\.env\.[A-Z_]*KEY|fetch\(/);
  });
});
