import re
import difflib
from dataclasses import dataclass
from typing import List, Optional, Tuple


def detect_line_ending(content: str) -> str:
    crlf_idx = content.find("\r\n")
    lf_idx = content.find("\n")
    if lf_idx == -1:
        return "\n"
    if crlf_idx == -1:
        return "\n"
    return "\r\n" if crlf_idx < lf_idx else "\n"


def normalize_to_lf(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def restore_line_endings(text: str, ending: str) -> str:
    if ending == "\r\n":
        return text.replace("\n", "\r\n")
    return text


def normalize_for_fuzzy_match(text: str) -> str:
    lines = text.split("\n")
    stripped = "\n".join(line.rstrip() for line in lines)

    # Smart single quotes -> '
    stripped = re.sub("[\u2018\u2019\u201a\u201b]", "'", stripped)
    # Smart double quotes -> "
    stripped = re.sub("[\u201c\u201d\u201e\u201f]", '"', stripped)
    # Various dashes/hyphens -> -
    stripped = re.sub(
        "[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]", "-", stripped
    )
    # Special spaces -> regular space
    stripped = re.sub(
        "[\u00a0\u2002-\u200a\u202f\u205f\u3000]", " ", stripped
    )
    return stripped


@dataclass
class FuzzyMatchResult:
    found: bool
    index: int
    match_length: int
    used_fuzzy_match: bool
    content_for_replacement: str


def fuzzy_find_text(content: str, old_text: str) -> FuzzyMatchResult:
    exact_index = content.find(old_text)
    if exact_index != -1:
        return FuzzyMatchResult(
            found=True,
            index=exact_index,
            match_length=len(old_text),
            used_fuzzy_match=False,
            content_for_replacement=content,
        )

    fuzzy_content = normalize_for_fuzzy_match(content)
    fuzzy_old_text = normalize_for_fuzzy_match(old_text)
    fuzzy_index = fuzzy_content.find(fuzzy_old_text)

    if fuzzy_index == -1:
        return FuzzyMatchResult(
            found=False,
            index=-1,
            match_length=0,
            used_fuzzy_match=False,
            content_for_replacement=content,
        )

    return FuzzyMatchResult(
        found=True,
        index=fuzzy_index,
        match_length=len(fuzzy_old_text),
        used_fuzzy_match=True,
        content_for_replacement=fuzzy_content,
    )


def count_fuzzy_occurrences(content: str, old_text: str) -> int:
    fuzzy_content = normalize_for_fuzzy_match(content)
    fuzzy_old_text = normalize_for_fuzzy_match(old_text)
    if not fuzzy_old_text:
        return 0
    return fuzzy_content.count(fuzzy_old_text)


def strip_bom(content: str) -> Tuple[str, str]:
    if content.startswith("\ufeff"):
        return content[1:], "\ufeff"
    return content, ""


def generate_diff_string(
    old_content: str, new_content: str, context_lines: int = 4
) -> Tuple[str, Optional[int]]:
    old_lines = old_content.splitlines(keepends=True)
    new_lines = new_content.splitlines(keepends=True)

    diff = difflib.unified_diff(
        old_lines, new_lines, n=context_lines, lineterm=""
    )
    diff_lines: List[str] = []
    first_changed_line: Optional[int] = None
    new_line_num = 0

    for line in diff:
        if line.startswith("@@"):
            # Parse hunk header for new file line number
            match = re.search(r"\+(\d+)", line)
            if match:
                new_line_num = int(match.group(1)) - 1
            diff_lines.append(line.rstrip("\n"))
        elif line.startswith("+") and not line.startswith("+++"):
            new_line_num += 1
            if first_changed_line is None:
                first_changed_line = new_line_num
            diff_lines.append(line.rstrip("\n"))
        elif line.startswith("-") and not line.startswith("---"):
            diff_lines.append(line.rstrip("\n"))
        elif line.startswith(" "):
            new_line_num += 1
            diff_lines.append(line.rstrip("\n"))
        else:
            diff_lines.append(line.rstrip("\n"))

    return "\n".join(diff_lines), first_changed_line
