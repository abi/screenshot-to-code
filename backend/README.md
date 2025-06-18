# Run the type checker

poetry run pyright

# Run tests

poetry run pytest

## Prompt Summary

Use `print_prompt_summary` from `utils.py` to quickly visualize prompts:

```python
from utils import print_prompt_summary
print_prompt_summary(prompt_messages)
```
