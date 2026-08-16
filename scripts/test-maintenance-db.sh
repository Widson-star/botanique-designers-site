#!/usr/bin/env bash
# BD-OPERATIONS-HUB-01 — Maintenance V1 database test runner.
# Spins up a disposable PostgreSQL 17 cluster, applies every migration in
# order, then runs the Maintenance test suite. No hosted Supabase is touched.
set -euo pipefail
export LC_ALL="${LC_ALL:-C}"

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pg_bin="${PG_BIN:-/usr/local/opt/postgresql@17/bin}"
test_root="$(mktemp -d /tmp/bd-maintenance-db.XXXXXX)"
data_dir="$test_root/data"
socket_dir="$test_root/socket"
log_file="$test_root/postgres.log"
port="${BD_MAINTENANCE_TEST_PORT:-55451}"

cleanup() {
  if [[ -f "$data_dir/postmaster.pid" ]]; then "$pg_bin/pg_ctl" -D "$data_dir" -m fast stop >/dev/null; fi
  rm -rf "$test_root"
}
trap cleanup EXIT

mkdir -p "$socket_dir"
"$pg_bin/initdb" -D "$data_dir" --no-locale --encoding=UTF8 --auth=trust >/dev/null
"$pg_bin/pg_ctl" -D "$data_dir" -l "$log_file" -o "-p $port -k $socket_dir -c listen_addresses='' -c dynamic_shared_memory_type=posix" start >/dev/null

psql_cmd=("$pg_bin/psql" -X -v ON_ERROR_STOP=1 -h "$socket_dir" -p "$port" -d postgres)
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/local_auth_bootstrap.sql" >/dev/null
for migration in "$repo_dir"/supabase/migrations/*.sql; do "${psql_cmd[@]}" -f "$migration" >/dev/null; done
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/maintenance_v1_test.sql"
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/maintenance_assignment_correction_test.sql"

# =====================================================================
# Concurrency regression: a visit or assignment INSERT racing a concurrent
# End on the same Maintenance relationship. Proves the FOR SHARE / FOR
# UPDATE serialization added to close this gap, using two genuinely
# separate psql connections against the SAME committed fixture rows — not a
# sequential test dressed up as concurrent.
# =====================================================================
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/maintenance_v1_concurrency_fixture.sql" >/dev/null

race_dir="$test_root/race"
mkdir -p "$race_dir"

# Runs two psql sessions against the same relationship: $1 starts first and
# holds a lock for ~2s before committing; after a short head start, $2
# attempts its own statement, which must block until $1 releases. Verifies
# genuine blocking occurred (elapsed time), then leaves both exit codes in
# race_holder_status / race_attempt_status for the caller to check.
run_race() {
  local relid="$1" holder_script="$2" attempt_script="$3" label="$4"
  local holder_out="$race_dir/${label}.holder.out"
  local attempt_out="$race_dir/${label}.attempt.out"

  "${psql_cmd[@]}" -v "relid=$relid" -f "$repo_dir/supabase/tests/$holder_script" \
    >"$holder_out" 2>&1 &
  local holder_pid=$!

  sleep 0.4 # give the holder time to acquire its lock before the attempt starts

  local attempt_start attempt_end
  attempt_start=$(date +%s)
  set +e
  "${psql_cmd[@]}" -v "relid=$relid" -f "$repo_dir/supabase/tests/$attempt_script" \
    >"$attempt_out" 2>&1
  race_attempt_status=$?
  set -e
  attempt_end=$(date +%s)
  race_attempt_elapsed=$((attempt_end - attempt_start))

  set +e
  wait "$holder_pid"
  race_holder_status=$?
  set -e

  echo "  [$label] holder exit=$race_holder_status attempt exit=$race_attempt_status attempt elapsed=${race_attempt_elapsed}s"
  if [[ "$race_attempt_elapsed" -lt 1 ]]; then
    echo "CONCURRENCY TEST FAILED [$label]: the attempt returned in ${race_attempt_elapsed}s — it was never actually blocked, so this proves nothing about serialization." >&2
    cat "$holder_out" "$attempt_out" >&2
    exit 1
  fi
}

assert_sql() {
  local label="$1" query="$2" expected="$3"
  local actual
  actual=$("${psql_cmd[@]}" -tA -c "$query")
  if [[ "$actual" != "$expected" ]]; then
    echo "CONCURRENCY ASSERTION FAILED [$label]: expected '$expected', got '$actual' for: $query" >&2
    exit 1
  fi
  echo "  [$label] OK ($query -> $actual)"
}

echo "Concurrency regression — Test A (visit vs End):"

# Ordering 1: the visit insert wins the race (holds the lock first, commits
# a Scheduled visit); End must then be refused because that visit exists.
run_race "00000000-0000-0000-0000-0000009030d1" \
  "maintenance_v1_concurrency_visit_insert_holds_lock.sql" \
  "maintenance_v1_concurrency_end_attempt.sql" \
  "A1-visit-wins"
if [[ "$race_holder_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [A1]: the winning visit insert should have succeeded (exit 0), got $race_holder_status" >&2
  cat "$race_dir/A1-visit-wins.holder.out" >&2
  exit 1
fi
if [[ "$race_attempt_status" -eq 0 ]]; then
  echo "CONCURRENCY TEST FAILED [A1]: End should have been refused (non-zero exit) once the Scheduled visit committed, got 0" >&2
  exit 1
fi
assert_sql "A1-relationship-still-active" \
  "select status from public.maintenance_relationships where id = '00000000-0000-0000-0000-0000009030d1'" "active"
assert_sql "A1-scheduled-visit-exists" \
  "select count(*)::text from public.maintenance_visits where maintenance_relationship_id = '00000000-0000-0000-0000-0000009030d1' and status = 'scheduled'" "1"

# Ordering 2: End wins the race (holds the lock first, commits the Ended
# status); the visit insert must then be refused.
run_race "00000000-0000-0000-0000-0000009030d2" \
  "maintenance_v1_concurrency_end_holds_lock.sql" \
  "maintenance_v1_concurrency_visit_insert_attempt.sql" \
  "A2-end-wins"
if [[ "$race_holder_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [A2]: the winning End should have succeeded (exit 0), got $race_holder_status" >&2
  cat "$race_dir/A2-end-wins.holder.out" >&2
  exit 1
fi
if [[ "$race_attempt_status" -eq 0 ]]; then
  echo "CONCURRENCY TEST FAILED [A2]: the visit insert should have been refused (non-zero exit) once the relationship Ended, got 0" >&2
  exit 1
fi
assert_sql "A2-relationship-ended" \
  "select status from public.maintenance_relationships where id = '00000000-0000-0000-0000-0000009030d2'" "ended"
assert_sql "A2-no-scheduled-visit" \
  "select count(*)::text from public.maintenance_visits where maintenance_relationship_id = '00000000-0000-0000-0000-0000009030d2'" "0"

echo "Concurrency regression — Test B (assignment vs End):"

# Ordering 1: the assignment insert wins the race (commits while the
# relationship is still Active); End then succeeds and its atomic close
# sweeps up that just-created assignment.
run_race "00000000-0000-0000-0000-0000009030d3" \
  "maintenance_v1_concurrency_assignment_insert_holds_lock.sql" \
  "maintenance_v1_concurrency_end_attempt.sql" \
  "B1-assignment-wins"
if [[ "$race_holder_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [B1]: the winning assignment insert should have succeeded (exit 0), got $race_holder_status" >&2
  cat "$race_dir/B1-assignment-wins.holder.out" >&2
  exit 1
fi
if [[ "$race_attempt_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [B1]: End should have succeeded (exit 0) against a still-Active relationship with no Scheduled visits, got $race_attempt_status" >&2
  cat "$race_dir/B1-assignment-wins.attempt.out" >&2
  exit 1
fi
assert_sql "B1-relationship-ended" \
  "select status from public.maintenance_relationships where id = '00000000-0000-0000-0000-0000009030d3'" "ended"
assert_sql "B1-assignment-closed-not-open" \
  "select count(*)::text from public.maintenance_assignments where maintenance_relationship_id = '00000000-0000-0000-0000-0000009030d3' and end_date is null" "0"

# Ordering 2: End wins the race (Ends first, with nothing to close); the
# assignment insert must then be refused.
run_race "00000000-0000-0000-0000-0000009030d4" \
  "maintenance_v1_concurrency_end_holds_lock.sql" \
  "maintenance_v1_concurrency_assignment_insert_attempt.sql" \
  "B2-end-wins"
if [[ "$race_holder_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [B2]: the winning End should have succeeded (exit 0), got $race_holder_status" >&2
  cat "$race_dir/B2-end-wins.holder.out" >&2
  exit 1
fi
if [[ "$race_attempt_status" -eq 0 ]]; then
  echo "CONCURRENCY TEST FAILED [B2]: the assignment insert should have been refused (non-zero exit) once the relationship Ended, got 0" >&2
  exit 1
fi
assert_sql "B2-relationship-ended" \
  "select status from public.maintenance_relationships where id = '00000000-0000-0000-0000-0000009030d4'" "ended"
assert_sql "B2-no-open-assignment" \
  "select count(*)::text from public.maintenance_assignments where maintenance_relationship_id = '00000000-0000-0000-0000-0000009030d4'" "0"

echo "Concurrency regression: all four scenarios confirmed — never Ended+Scheduled-visit, never Ended+open-assignment."
