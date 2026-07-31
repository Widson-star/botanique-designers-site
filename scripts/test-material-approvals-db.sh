#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pg_bin="${PG_BIN:-/usr/local/opt/postgresql@17/bin}"
test_root="$(mktemp -d /tmp/bd-material-approvals-db.XXXXXX)"
data_dir="$test_root/data"
socket_dir="$test_root/socket"
log_file="$test_root/postgres.log"
port="${BD_MATERIAL_TEST_PORT:-55440}"

cleanup() {
  if [[ -f "$data_dir/postmaster.pid" ]]; then
    "$pg_bin/pg_ctl" -D "$data_dir" -m fast stop >/dev/null
  fi
  rm -rf "$test_root"
}
trap cleanup EXIT

mkdir -p "$socket_dir"
"$pg_bin/initdb" -D "$data_dir" --no-locale --encoding=UTF8 --auth=trust >/dev/null
"$pg_bin/pg_ctl" -D "$data_dir" -l "$log_file" \
  -o "-p $port -k $socket_dir -c listen_addresses='' -c dynamic_shared_memory_type=posix" \
  start >/dev/null

psql_cmd=("$pg_bin/psql" -X -v ON_ERROR_STOP=1 -h "$socket_dir" -p "$port" -d postgres)
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/local_auth_bootstrap.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/migrations/20260614000100_admin_foundation.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/migrations/20260726000100_operations_hub_phase_1a_lead_data_rls.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/migrations/20260726000200_operations_hub_phase_1b_a1_project_integrity.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/migrations/20260728000100_operations_hub_approvals_foundation.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/migrations/20260728000200_operations_hub_daily_site_operations.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/migrations/20260729000100_operations_hub_project_material_change_approvals.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/migrations/20260731000100_operations_hub_pr44_verification_repairs.sql" >/dev/null
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/project_material_change_approvals_test.sql"
