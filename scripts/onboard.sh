#!/usr/bin/env bash
# make onboard ROLE=<role>: once after cloning. Creates .env with your key, installs deps, saves your role.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  cp .env.example .env
  read -rsp "Your GEMINI_API_KEY (hidden; Enter to skip): " key || key=""
  echo
  if [ -n "$key" ]; then sed -i.bak "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=$key|" .env && rm .env.bak; fi
fi
make setup
if [ -n "${1:-}" ]; then make role ROLE="$1"; fi
echo "Ready. Open claude and run /next."
