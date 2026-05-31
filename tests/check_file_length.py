#!/usr/bin/env python3
"""Fail when repository files exceed the maximum line count."""

from __future__ import annotations

import os
import sys
from pathlib import Path

MAX_LINES = 300
ROOT = Path(__file__).resolve().parents[1]

# Exclude downloaded packages and common generated/cache directories.
EXCLUDED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    "node_modules",
    "vendor",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".pnpm-store",
    ".yarn",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "site-packages",
}

EXCLUDED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".mp3",
    ".mp4",
    ".mov",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".exe",
    ".dll",
    ".so",
}


def is_excluded_dir(dirname: str) -> bool:
    return dirname in EXCLUDED_DIRS


def count_lines(path: Path) -> int:
    with path.open("r", encoding="utf-8", errors="ignore") as file_obj:
        return sum(1 for _ in file_obj)


def main() -> int:
    violations: list[tuple[Path, int]] = []

    for current_root, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if not is_excluded_dir(d)]
        root_path = Path(current_root)

        for filename in files:
            file_path = root_path / filename

            if file_path.suffix.lower() in EXCLUDED_EXTENSIONS:
                continue

            rel_path = file_path.relative_to(ROOT)
            line_count = count_lines(file_path)
            if line_count > MAX_LINES:
                violations.append((rel_path, line_count))

    if violations:
        print(f"Line limit check failed. Max allowed lines per file: {MAX_LINES}")
        for rel_path, line_count in sorted(violations):
            print(f"- {rel_path}: {line_count} lines")
        return 1

    print(f"Line limit check passed. No files exceed {MAX_LINES} lines.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
