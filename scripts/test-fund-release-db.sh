#!/usr/bin/env bash
set -euo pipefail
export LC_ALL="${LC_ALL:-C}"

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pg_bin="${PG_BIN:-/usr/local/opt/postgresql@17/bin}"
test_root="$(mktemp -d /tmp/bd-fin-fund-release-db.XXXXXX)"
data_dir="$test_root/data"
socket_dir="$test_root/socket"
log_file="$test_root/postgres.log"
port="${BD_FIN_FUND_RELEASE_TEST_PORT:-55443}"

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
"${psql_cmd[@]}" -f "$repo_dir/supabase/tests/fund_release_and_reconciliation_test.sql"
