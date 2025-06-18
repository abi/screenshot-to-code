# Coding Standards

- For Python function, do not add docstrings.
- Ensure a trailing newline to any file that doesn't end with one
- Use type hints in Python to improve code readability and catch potential type-related errors early.
- We use poetry in the backend python project

# Testing

- Frontend tests: `yarn test` (from frontend directory) or `npm run test:frontend` (from root)
- Backend tests: `poetry run pytest` (from backend directory) or `npm run test:backend` (from root)
- Run all tests: `npm test` (from root directory)
