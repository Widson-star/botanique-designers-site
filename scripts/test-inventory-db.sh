#!/usr/bin/env bash
# BD-OPERATIONS-HUB-01 — Inventory / Tools & Equipment V1 database test runner.
# Spins up a disposable PostgreSQL 17 cluster, applies every migration in
# order, then runs the Inventory test suites followed by genuine two-session
# concurrency regressions. No hosted Supabase is touched and no production
# data is read or written.
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
echo "  foundation assertions passed"

echo "Inventory / Tools & Equipment V1 — control-review hardening:"
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/inventory_tools_equipment_v1_hardening_test.sql" >/dev/null
echo "  hardening assertions passed"

# =====================================================================
# Negative-stock concurrency regression.
# =====================================================================
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/inventory_stock_concurrency_fixture.sql" >/dev/null

race_dir="$test_root/race"
mkdir -p "$race_dir"

run_race() {
  local itemid="$1" attempt_script="$2" label="$3"
  local holder_out="$race_dir/${label}.holder.out"
  local attempt_out="$race_dir/${label}.attempt.out"

  "${psql_cmd[@]}" -v "itemid=$itemid" -f "$repo_dir/supabase/tests/inventory_stock_concurrency_holds_lock.sql" \
    >"$holder_out" 2>&1 &
  local holder_pid=$!

  sleep 0.4

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

assert_sql "no-negative-position-anywhere" \
  "select count(*)::text from (
     select m.inventory_item_id as item, m.from_site_id as site from public.inventory_stock_movements m
     union
     select m.inventory_item_id, m.to_site_id from public.inventory_stock_movements m
   ) p where public.private_inventory_stock_balance(p.item, p.site) < 0" "0"

echo "Negative-stock concurrency: both orderings confirmed — concurrent movements serialise, and stock never goes negative."

# =====================================================================
# Equipment registration vs catalogue deactivation concurrency regression.
# =====================================================================
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/inventory_asset_registration_race_fixture.sql" >/dev/null

run_asset_race() {
  local holder_script="$1" attempt_script="$2" itemid="$3" assetcode="$4" label="$5"
  local holder_out="$race_dir/${label}.holder.out"
  local attempt_out="$race_dir/${label}.attempt.out"

  "${psql_cmd[@]}" -v "itemid=$itemid" -v "assetcode=$assetcode" \
    -f "$repo_dir/supabase/tests/$holder_script" >"$holder_out" 2>&1 &
  local holder_pid=$!
  sleep 0.4

  local attempt_start attempt_end
  attempt_start=$(date +%s)
  set +e
  "${psql_cmd[@]}" -v "itemid=$itemid" -v "assetcode=$assetcode" \
    -f "$repo_dir/supabase/tests/$attempt_script" >"$attempt_out" 2>&1
  asset_race_attempt_status=$?
  set -e
  attempt_end=$(date +%s)
  asset_race_attempt_elapsed=$((attempt_end - attempt_start))

  set +e
  wait "$holder_pid"
  asset_race_holder_status=$?
  set -e

  echo "  [$label] holder exit=$asset_race_holder_status attempt exit=$asset_race_attempt_status attempt elapsed=${asset_race_attempt_elapsed}s"
  if [[ "$asset_race_attempt_elapsed" -lt 1 ]]; then
    echo "ASSET REGISTRATION RACE FAILED [$label]: concurrent operation did not block, so catalogue/registration serialization is unproved." >&2
    cat "$holder_out" "$attempt_out" >&2
    exit 1
  fi
}

echo "Equipment registration/catalogue concurrency regression:"

# Registration commits first. Deactivation must wait and then fail because the
# newly registered asset is unresolved.
run_asset_race \
  "inventory_asset_registration_holds_lock.sql" \
  "inventory_item_deactivation_attempt.sql" \
  "00000000-0000-0000-0000-0000009230c1" \
  "RACE-ASSET-A" \
  "C-registration-wins"
if [[ "$asset_race_holder_status" -ne 0 || "$asset_race_attempt_status" -eq 0 ]]; then
  echo "ASSET REGISTRATION RACE FAILED [C]: registration should commit and deactivation should be refused." >&2
  cat "$race_dir/C-registration-wins.holder.out" "$race_dir/C-registration-wins.attempt.out" >&2
  exit 1
fi
assert_sql "C-item-stays-active" \
  "select is_active::text from public.inventory_items where id='00000000-0000-0000-0000-0000009230c1'" "true"
assert_sql "C-one-asset-registered" \
  "select count(*)::text from public.equipment_assets where inventory_item_id='00000000-0000-0000-0000-0000009230c1'" "1"

# Deactivation commits first. Registration must wait and then fail against the
# now-inactive catalogue item.
run_asset_race \
  "inventory_item_deactivation_holds_lock.sql" \
  "inventory_asset_registration_attempt.sql" \
  "00000000-0000-0000-0000-0000009230c2" \
  "RACE-ASSET-B" \
  "D-deactivation-wins"
if [[ "$asset_race_holder_status" -ne 0 || "$asset_race_attempt_status" -eq 0 ]]; then
  echo "ASSET REGISTRATION RACE FAILED [D]: deactivation should commit and registration should be refused." >&2
  cat "$race_dir/D-deactivation-wins.holder.out" "$race_dir/D-deactivation-wins.attempt.out" >&2
  exit 1
fi
assert_sql "D-item-is-inactive" \
  "select is_active::text from public.inventory_items where id='00000000-0000-0000-0000-0000009230c2'" "false"
assert_sql "D-no-asset-registered" \
  "select count(*)::text from public.equipment_assets where inventory_item_id='00000000-0000-0000-0000-0000009230c2'" "0"

# The Codex P1 names TWO concurrent counterparties: deactivate_inventory_item()
# above, and "a PATCH that changes a fresh catalogue item's tracking_method".
# The second half is the more dangerous one, because the resulting asset ->
# stock-tracked-item association is then FROZEN by the history guard — once the
# asset exists the item has history, so tracking_method can never be corrected,
# by anyone. Without the catalogue-row lock both orderings below commit exactly
# that state.

# Registration commits first. The PATCH must wait, then fail because the newly
# registered asset is now operational history.
run_asset_race \
  "inventory_asset_registration_holds_lock.sql" \
  "inventory_item_tracking_patch_attempt.sql" \
  "00000000-0000-0000-0000-0000009240d1" \
  "RACE-ASSET-C" \
  "E-registration-wins-vs-patch"
if [[ "$asset_race_holder_status" -ne 0 || "$asset_race_attempt_status" -eq 0 ]]; then
  echo "ASSET REGISTRATION RACE FAILED [E]: registration should commit and the tracking_method PATCH should be refused." >&2
  cat "$race_dir/E-registration-wins-vs-patch.holder.out" "$race_dir/E-registration-wins-vs-patch.attempt.out" >&2
  exit 1
fi
assert_sql "E-item-stays-asset-tracked" \
  "select tracking_method from public.inventory_items where id='00000000-0000-0000-0000-0000009240d1'" "asset"
assert_sql "E-one-asset-registered" \
  "select count(*)::text from public.equipment_assets where inventory_item_id='00000000-0000-0000-0000-0000009240d1'" "1"

# The PATCH commits first. Registration must wait, then fail against the
# now-stock-tracked catalogue item.
run_asset_race \
  "inventory_item_tracking_patch_holds_lock.sql" \
  "inventory_asset_registration_attempt.sql" \
  "00000000-0000-0000-0000-0000009240d2" \
  "RACE-ASSET-D" \
  "F-patch-wins-vs-registration"
if [[ "$asset_race_holder_status" -ne 0 || "$asset_race_attempt_status" -eq 0 ]]; then
  echo "ASSET REGISTRATION RACE FAILED [F]: the PATCH should commit and registration should be refused." >&2
  cat "$race_dir/F-patch-wins-vs-registration.holder.out" "$race_dir/F-patch-wins-vs-registration.attempt.out" >&2
  exit 1
fi
assert_sql "F-item-is-stock-tracked" \
  "select tracking_method from public.inventory_items where id='00000000-0000-0000-0000-0000009240d2'" "stock"
assert_sql "F-no-asset-registered" \
  "select count(*)::text from public.equipment_assets where inventory_item_id='00000000-0000-0000-0000-0000009240d2'" "0"

echo "Equipment registration/catalogue concurrency: all four orderings confirmed — impossible asset/catalogue states cannot race into existence."
