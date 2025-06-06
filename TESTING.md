# Testing Guide

This guide explains how to run tests for the Screenshot to Code project.

## Backend Tests

The backend uses pytest for testing. All tests are located in the `backend/tests` directory.

### Prerequisites

Make sure you have Poetry installed and have installed all dependencies:

```bash
cd backend
poetry install
```

### Running Tests

#### Run all tests
```bash
cd backend
poetry run pytest
```

#### Run tests with verbose output
```bash
poetry run pytest -vv
```

#### Run a specific test file
```bash
poetry run pytest tests/test_screenshot.py
```

#### Run a specific test class
```bash
poetry run pytest tests/test_screenshot.py::TestNormalizeUrl
```

#### Run a specific test method
```bash
poetry run pytest tests/test_screenshot.py::TestNormalizeUrl::test_url_without_protocol
```

#### Run tests with coverage report
```bash
poetry run pytest --cov=routes
```

#### Run tests in parallel (requires pytest-xdist)
```bash
poetry install --with dev pytest-xdist  # Install if not already installed
poetry run pytest -n auto
```

### Test Configuration

The pytest configuration is defined in `backend/pytest.ini`:
- Tests are discovered in the `tests` directory
- Test files must match the pattern `test_*.py`
- Test classes must start with `Test`
- Test functions must start with `test_`
- Verbose output and short traceback format are enabled by default

### Writing New Tests

1. Create a new test file in `backend/tests/` following the naming convention `test_<module>.py`
2. Import the functions/classes you want to test
3. Write test functions or classes following pytest conventions

Example:
```python
import pytest
from routes.screenshot import normalize_url

def test_url_normalization():
    assert normalize_url("example.com") == "https://example.com"
```
