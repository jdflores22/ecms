#!/bin/bash
set -e
CNF="$1"
SQL="$2"
CLI=$(command -v mariadb || command -v mysql)
if [ -z "$CLI" ]; then
  echo "NO_MYSQL_CLIENT"
  exit 1
fi
chmod 600 "$CNF"
"$CLI" --defaults-extra-file="$CNF" < "$SQL"
COUNT=$("$CLI" --defaults-extra-file="$CNF" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'WithdrawalRequestsSet';")
if [ "$COUNT" != "1" ]; then
  echo "TABLE_MISSING"
  exit 1
fi
echo "MIGRATION_OK"
