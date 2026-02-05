# Project Agent Instructions

Run checks based on what you changed:

- Frontend: `cd frontend && yarn lint`
- Backend: `cd backend && poetry run pyright` and `cd backend && poetry run pytest`

If changes touch both, run both sets.
