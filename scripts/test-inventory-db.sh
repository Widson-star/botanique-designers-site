#!/usr/bin/env bash
# BD-OPERATIONS-HUB-01 — Inventory / Tools & Equipment V1 database test runner.
# Spins up a disposable PostgreSQL 17 cluster, applies every migration in
# order, then runs the Inventory test suite followed by a genuine two-session
# concurrency regression against negative stock. No hosted Supabase is touched
# and no production data is read or written.
set -euo pipefail
export LC_ALL="${LC_ALL:-C}"

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pg_bin="${PG_BIN:-/usr/local/opt/postgresql@17/bin}"
test_root="$(mktemp -d /tmp/bd-inventory-db.XXXXXX)"
data_dir="$test_root/data"
socket_dir="$test_root/socket"
log_file="$test_root/postgres.log"
port="${BD_INVENTORY_TEST_PORT:-55461}"

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

echo "Inventory / Tools & Equipment V1 — schema, authority, audit and stock truth:"
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/inventory_tools_equipment_v1_test.sql" >/dev/null
echo "  all assertions passed"

# =====================================================================
# Negative-stock concurrency regression.
#
# Two genuinely separate psql connections take from the SAME position of the
# SAME item at the same time. This is the case a single-session test cannot
# reach: without the FOR UPDATE lock on the catalogue row, both sessions read
# 10, both pass the balance check, and the position ends at -6.
# =====================================================================
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/inventory_stock_concurrency_fixture.sql" >/dev/null

race_dir="$test_root/race"
mkdir -p "$race_dir"

# Runs two psql sessions against the same item: $1 starts first and holds the
# catalogue-row lock for ~2s before committing; after a short head start, $2
# attempts its own movement, which must block until $1 releases. Verifies
# genuine blocking occurred (elapsed time), then leaves both exit codes in
# race_holder_status / race_attempt_status for the caller to check.
run_race() {
  local itemid="$1" attempt_script="$2" label="$3"
  local holder_out="$race_dir/${label}.holder.out"
  local attempt_out="$race_dir/${label}.attempt.out"

  "${psql_cmd[@]}" -v "itemid=$itemid" -f "$repo_dir/supabase/tests/inventory_stock_concurrency_holds_lock.sql" \
    >"$holder_out" 2>&1 &
  local holder_pid=$!

  sleep 0.4 # give the holder time to acquire its lock before the attempt starts

  local attempt_start attempt_end
  attempt_start=$(date +%s)
  set +e
  "${psql_cmd[@]}" -v "itemid=$itemid" -f "$repo_dir/supabase/tests/$attempt_script" \
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

balance_query() {
  echo "select public.private_inventory_stock_balance('$1'::uuid, (select site_id from public.projects where id = '00000000-0000-0000-0000-0000009110a1'))::text"
}

echo "Negative-stock concurrency regression:"

# Ordering 1: both sessions want 8 of 10. The holder wins the lock; the second
# must block, re-read a balance of 2, and be REFUSED.
run_race "00000000-0000-0000-0000-0000009130c1" \
  "inventory_stock_concurrency_attempt.sql" "A-overdraw-refused"
if [[ "$race_holder_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [A]: the winning consumption should have succeeded (exit 0), got $race_holder_status" >&2
  cat "$race_dir/A-overdraw-refused.holder.out" >&2
  exit 1
fi
if [[ "$race_attempt_status" -eq 0 ]]; then
  echo "CONCURRENCY TEST FAILED [A]: the second consumption of 8 should have been refused once only 2 remained, got 0" >&2
  cat "$race_dir/A-overdraw-refused.attempt.out" >&2
  exit 1
fi
assert_sql "A-balance-is-two-not-negative" "$(balance_query 00000000-0000-0000-0000-0000009130c1)" "2.000"
assert_sql "A-only-one-consumption-recorded" \
  "select count(*)::text from public.inventory_stock_movements where inventory_item_id = '00000000-0000-0000-0000-0000009130c1' and movement_type = 'consumed'" "1"

# Ordering 2: the holder takes 8, the second wants only 2. It must still BLOCK,
# then SUCCEED — proving the lock serialises rather than simply rejecting.
run_race "00000000-0000-0000-0000-0000009130c2" \
  "inventory_stock_concurrency_small_attempt.sql" "B-within-balance-allowed"
if [[ "$race_holder_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [B]: the winning consumption should have succeeded (exit 0), got $race_holder_status" >&2
  cat "$race_dir/B-within-balance-allowed.holder.out" >&2
  exit 1
fi
if [[ "$race_attempt_status" -ne 0 ]]; then
  echo "CONCURRENCY TEST FAILED [B]: consuming the remaining 2 should have succeeded (exit 0), got $race_attempt_status" >&2
  cat "$race_dir/B-within-balance-allowed.attempt.out" >&2
  exit 1
fi
assert_sql "B-balance-is-exactly-zero" "$(balance_query 00000000-0000-0000-0000-0000009130c2)" "0.000"
assert_sql "B-both-consumptions-recorded" \
  "select count(*)::text from public.inventory_stock_movements where inventory_item_id = '00000000-0000-0000-0000-0000009130c2' and movement_type = 'consumed'" "2"

# Nothing anywhere went negative. Computed straight from the ledger rather than
# through inventory_stock_position(), because this connection is a superuser
# with no JWT claim: the read model would correctly return nothing for it, and
# an empty result is not evidence.
assert_sql "no-negative-position-anywhere" \
  "select count(*)::text from (
     select m.inventory_item_id as item, m.from_site_id as site from public.inventory_stock_movements m
     union
     select m.inventory_item_id, m.to_site_id from public.inventory_stock_movements m
   ) p where public.private_inventory_stock_balance(p.item, p.site) < 0" "0"

echo "Negative-stock concurrency: both orderings confirmed — concurrent movements serialise, and stock never goes negative."
