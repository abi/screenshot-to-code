#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

curl -sSL https://install.python-poetry.org | python3 -

~/.local/bin/poetry -C backend install
~/.local/bin/poetry -C backend run playwright install chromium || true
pnpm -C frontend install

if [ -d ../screenshot-to-code-saas/backend ]; then
  ~/.local/bin/poetry -C ../screenshot-to-code-saas/backend install --no-root
fi

if [ -d ../screenshot-to-code-saas/admin ]; then
  pnpm -C ../screenshot-to-code-saas/admin install
fi
