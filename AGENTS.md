# Project Agent Instructions

Python environment:

- Always use the backend Poetry virtualenv (`backend-py3.10`) for Python commands.
- Preferred invocation: `cd backend && poetry run <command>`.
- If you need to activate directly, use Poetry to discover it in the current environment:
  - `cd backend && poetry env activate` (then run the `source .../bin/activate` command it prints)

Testing policy:

- Always run backend tests after every code change: `cd backend && poetry run pytest`.

Additional checks based on what you changed:

- Frontend: `cd frontend && yarn lint`

If changes touch both, run both sets.
