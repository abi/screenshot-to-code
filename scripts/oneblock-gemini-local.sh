#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV_FILE="$ROOT_DIR/backend/.env"
GEMINI_KEY="${GEMINI_API_KEY:-}"

usage() {
  cat <<USAGE
Usage:
  GEMINI_API_KEY=your_key bash scripts/oneblock-gemini-local.sh setup
  GEMINI_API_KEY=your_key bash scripts/oneblock-gemini-local.sh dev

Commands:
  setup   Install dependencies and prepare backend/.env for Gemini-only local usage
  dev     Start backend (7001) + frontend (5173)
USAGE
}

ensure_env_file() {
  mkdir -p "$ROOT_DIR/backend"
  touch "$BACKEND_ENV_FILE"

  if [[ -n "$GEMINI_KEY" ]]; then
    python - "$BACKEND_ENV_FILE" "$GEMINI_KEY" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
key = sys.argv[2]
lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []

values = {}
for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    values[k.strip()] = v

values["GEMINI_API_KEY"] = key
values["OPENAI_API_KEY"] = ""
values["ANTHROPIC_API_KEY"] = ""

ordered = [
    f"GEMINI_API_KEY={values.get('GEMINI_API_KEY', '')}",
    f"OPENAI_API_KEY={values.get('OPENAI_API_KEY', '')}",
    f"ANTHROPIC_API_KEY={values.get('ANTHROPIC_API_KEY', '')}",
]

for k, v in values.items():
    if k in {"GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"}:
        continue
    ordered.append(f"{k}={v}")

path.write_text("\n".join(ordered) + "\n", encoding="utf-8")
PY
  else
    echo "GEMINI_API_KEY is not set. Keeping existing $BACKEND_ENV_FILE unchanged."
  fi
}

run_setup() {
  ensure_env_file
  npm run setup --prefix "$ROOT_DIR"
}

run_dev() {
  bash -lc "cd '$ROOT_DIR/backend' && poetry run uvicorn main:app --reload --port 7001 & npm --prefix '$ROOT_DIR/frontend' run dev"
}

main() {
  cmd="${1:-}"
  case "$cmd" in
    setup)
      run_setup
      ;;
    dev)
      run_dev
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
