import io
import sys
from utils import format_prompt_summary, print_prompt_summary


def test_format_prompt_summary():
    messages = [
        {"role": "system", "content": "lorem ipsum dolor sit amet"},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "hello world"},
                {
                    "type": "image_url",
                    "image_url": {"url": "data:image/png;base64,AAA"},
                },
                {
                    "type": "image_url",
                    "image_url": {"url": "data:image/png;base64,BBB"},
                },
            ],
        },
    ]

    summary = format_prompt_summary(messages)
    assert "SYSTEM: lorem ipsum" in summary
    assert "[2 images]" in summary


def test_print_prompt_summary():
    messages = [
        {"role": "system", "content": "short message"},
        {"role": "user", "content": "hello"},
    ]

    # Capture stdout
    captured_output = io.StringIO()
    sys.stdout = captured_output
    
    print_prompt_summary(messages)
    
    # Reset stdout
    sys.stdout = sys.__stdout__
    
    output = captured_output.getvalue()
    
    # Check that output contains box characters and content
    assert "┌─" in output
    assert "└─" in output
    assert "PROMPT SUMMARY" in output
    assert "SYSTEM: short message" in output
    assert "USER: hello" in output


def test_print_prompt_summary_long_content():
    messages = [
        {"role": "system", "content": "This is a very long system message that should be wrapped properly within the box boundaries"},
        {"role": "user", "content": "short"},
    ]

    # Capture stdout
    captured_output = io.StringIO()
    sys.stdout = captured_output
    
    print_prompt_summary(messages)
    
    # Reset stdout
    sys.stdout = sys.__stdout__
    
    output = captured_output.getvalue()
    lines = output.strip().split('\n')
    
    # Check that all lines have consistent box formatting
    for line in lines:
        if line.startswith('│') and line.endswith('│'):
            # All content lines should have same length
            assert len(line) == len(lines[0]) if lines[0].startswith('┌') else True
    
    # Check content is present
    assert "PROMPT SUMMARY" in output
    assert "SYSTEM:" in output
    assert "USER: short" in output


def test_format_prompt_summary_no_truncate():
    messages = [
        {"role": "system", "content": "This is a very long message that would normally be truncated at 40 characters but should be shown in full"},
    ]

    # Test with truncation (default)
    summary_truncated = format_prompt_summary(messages)
    assert "..." in summary_truncated
    assert len(summary_truncated.split(": ", 1)[1]) <= 50  # Role + truncated content

    # Test without truncation
    summary_full = format_prompt_summary(messages, truncate=False)
    assert "..." not in summary_full
    assert "shown in full" in summary_full


def test_print_prompt_summary_no_truncate():
    messages = [
        {"role": "system", "content": "This is a very long message that would normally be truncated but should be shown in full when truncate=False"},
    ]

    # Capture stdout
    captured_output = io.StringIO()
    sys.stdout = captured_output
    
    print_prompt_summary(messages, truncate=False)
    
    # Reset stdout
    sys.stdout = sys.__stdout__
    
    output = captured_output.getvalue()
    
    # Check that full content is shown
    assert "shown in full when truncate=False" in output
    assert "..." not in output
