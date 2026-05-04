import json
import os
import re
from dataclasses import dataclass, field
from typing import Callable, Optional

from app.config import settings


COMPRESSED_EXTENSIONS = (
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".tar.gz",
    ".tgz",
    ".gz",
    ".bz2",
    ".xz",
)
TEXT_EXTENSIONS = {".md", ".txt", ".py", ".tex", ".csv"}
NOTEBOOK_EXTENSION = ".ipynb"
BASE64_LIKE_RE = re.compile(r"(?<![A-Za-z0-9+/=])(?:[A-Za-z0-9+/]{120,}={0,2})(?![A-Za-z0-9+/=])")


@dataclass
class ExtractedSubmission:
    text: str = ""
    manifest: list[dict] = field(default_factory=list)
    notices: list[str] = field(default_factory=list)
    truncated: bool = False

    @property
    def has_readable_text(self) -> bool:
        return bool(self.text.strip())


def is_compressed_filename(filename: str) -> bool:
    lower_name = (filename or "").lower()
    return any(lower_name.endswith(ext) for ext in COMPRESSED_EXTENSIONS)


def sanitize_file_rules(file_rules: Optional[str]) -> Optional[str]:
    if not file_rules:
        return file_rules
    kept = []
    for raw_ext in file_rules.split(","):
        ext = raw_ext.strip().lower()
        if not ext or is_compressed_filename(f"file{ext}"):
            continue
        kept.append(ext)
    return ",".join(kept)


def decode_text(file_bytes: bytes) -> tuple[str, str]:
    for encoding in ("utf-8", "utf-8-sig", "gb18030", "gbk", "latin-1"):
        try:
            return file_bytes.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="replace"), "utf-8-replace"


def normalize_source(source: object) -> str:
    if isinstance(source, str):
        return source
    if isinstance(source, list):
        return "".join(str(part) for part in source)
    return ""


def redact_base64_like_text(text: str) -> tuple[str, bool]:
    redacted, count = BASE64_LIKE_RE.subn("[base64-like content omitted]", text)
    return redacted, count > 0


def _append_with_budget(
    parts: list[str],
    label: str,
    content: str,
    used_chars: int,
    max_chars: int,
    file_max_chars: int,
) -> tuple[int, bool]:
    budget = max(max_chars - used_chars, 0)
    if budget <= 0:
        return used_chars, True

    limit = min(file_max_chars, budget)
    truncated = len(content) > limit
    kept = content[:limit]
    parts.append(f"\n\n## {label}\n\n{kept}")
    return used_chars + len(kept), truncated


def _extract_text_file(
    filename: str,
    file_bytes: bytes,
    parts: list[str],
    used_chars: int,
    max_chars: int,
    file_max_chars: int,
) -> tuple[int, dict, list[str], bool]:
    raw_text, encoding = decode_text(file_bytes)
    text, redacted = redact_base64_like_text(raw_text)
    next_used, truncated = _append_with_budget(parts, filename, text, used_chars, max_chars, file_max_chars)

    notices = []
    if truncated:
        notices.append(f"{filename} 内容已按字符上限截断")
    if redacted:
        notices.append(f"{filename} 中疑似 base64 长文本已省略")

    return next_used, {
        "filename": filename,
        "type": "text",
        "extension": os.path.splitext(filename)[1].lower(),
        "chars": min(len(text), max(file_max_chars, 0)),
        "encoding": encoding,
        "truncated": truncated,
        "base64_like_redacted": redacted,
        "skipped": False,
    }, notices, truncated


def _count_image_outputs(outputs: list[object]) -> int:
    image_outputs = 0
    for output in outputs:
        if not isinstance(output, dict):
            continue
        data = output.get("data")
        if not isinstance(data, dict):
            continue
        if any(str(mime).startswith("image/") for mime in data.keys()):
            image_outputs += 1
    return image_outputs


def _extract_notebook_file(
    filename: str,
    file_bytes: bytes,
    parts: list[str],
    used_chars: int,
    max_chars: int,
    file_max_chars: int,
) -> tuple[int, dict, list[str], bool]:
    notices = []
    try:
        raw_text, encoding = decode_text(file_bytes)
        notebook = json.loads(raw_text)
    except Exception:
        return used_chars, {
            "filename": filename,
            "type": "notebook",
            "skipped": True,
            "reason": "notebook_parse_failed",
        }, [f"{filename} 无法解析为 Notebook JSON，已跳过"], False

    cells = notebook.get("cells") if isinstance(notebook, dict) else None
    if not isinstance(cells, list):
        return used_chars, {
            "filename": filename,
            "type": "notebook",
            "skipped": True,
            "reason": "notebook_cells_missing",
        }, [f"{filename} 缺少有效 cells，已跳过"], False

    notebook_parts = [f"## Notebook: {filename}"]
    markdown_cells = 0
    code_cells = 0
    outputs_count = 0
    image_outputs = 0
    attachments_count = 0
    redacted_any = False
    truncated_any = False

    cell_budget = max(file_max_chars, 1)
    used_in_file = 0
    for index, cell in enumerate(cells, start=1):
        if not isinstance(cell, dict):
            continue
        cell_type = cell.get("cell_type")
        outputs = cell.get("outputs") if isinstance(cell.get("outputs"), list) else []
        outputs_count += len(outputs)
        image_outputs += _count_image_outputs(outputs)
        attachments = cell.get("attachments")
        if isinstance(attachments, dict):
            attachments_count += len(attachments)

        if cell_type not in {"markdown", "code"}:
            continue

        raw_source = normalize_source(cell.get("source"))
        source, redacted = redact_base64_like_text(raw_source)
        redacted_any = redacted_any or redacted
        remaining_file_budget = cell_budget - used_in_file
        if remaining_file_budget <= 0:
            truncated_any = True
            continue
        if len(source) > remaining_file_budget:
            source = source[:remaining_file_budget]
            truncated_any = True

        if cell_type == "markdown":
            markdown_cells += 1
            notebook_parts.append(f"\n### Cell {index} [markdown]\n{source}")
        else:
            code_cells += 1
            notebook_parts.append(f"\n### Cell {index} [code]\n```python\n{source}\n```")
        used_in_file += len(source)

    notebook_parts.append(
        "\n### Ignored\n"
        f"- outputs: {outputs_count}\n"
        f"- image_outputs: {image_outputs}\n"
        f"- attachments: {attachments_count}"
    )

    notebook_text = "\n".join(notebook_parts)
    next_used, total_truncated = _append_with_budget(
        parts,
        filename,
        notebook_text,
        used_chars,
        max_chars,
        file_max_chars,
    )
    truncated = truncated_any or total_truncated

    if outputs_count:
        notices.append(f"{filename} 的 Notebook outputs 已忽略")
    if image_outputs:
        notices.append(f"{filename} 的图片 outputs 已忽略")
    if attachments_count:
        notices.append(f"{filename} 的 attachments 已忽略")
    if truncated:
        notices.append(f"{filename} 内容已按字符上限截断")
    if redacted_any:
        notices.append(f"{filename} 中疑似 base64 长文本已省略")

    return next_used, {
        "filename": filename,
        "type": "notebook",
        "markdown_cells": markdown_cells,
        "code_cells": code_cells,
        "outputs_ignored": outputs_count,
        "image_outputs_ignored": image_outputs,
        "attachments_ignored": attachments_count,
        "encoding": encoding,
        "truncated": truncated,
        "base64_like_redacted": redacted_any,
        "skipped": False,
    }, notices, truncated


def extract_submission_files(files: list, file_reader: Callable[[str], bytes]) -> ExtractedSubmission:
    parts: list[str] = []
    manifest: list[dict] = []
    notices: list[str] = []
    used_chars = 0
    truncated_any = False
    max_chars = settings.AI_GRADING_MAX_CHARS
    file_max_chars = settings.AI_GRADING_FILE_MAX_CHARS

    for file in files:
        filename = file.filename or f"file_{file.id}"
        lower_ext = os.path.splitext(filename)[1].lower()

        if is_compressed_filename(filename):
            manifest.append({
                "filename": filename,
                "type": "compressed",
                "skipped": True,
                "reason": "compressed_file_skipped",
            })
            notices.append(f"{filename} 是压缩包，已跳过，未解压也未送入 AI")
            continue

        if lower_ext not in TEXT_EXTENSIONS and lower_ext != NOTEBOOK_EXTENSION:
            manifest.append({
                "filename": filename,
                "type": "unsupported",
                "extension": lower_ext,
                "skipped": True,
                "reason": "unsupported_file_type",
            })
            notices.append(f"{filename} 文件类型暂不支持 AI 文本提取，已跳过")
            continue

        try:
            file_bytes = file_reader(file.cos_key)
        except Exception:
            manifest.append({
                "filename": filename,
                "type": "read_error",
                "extension": lower_ext,
                "skipped": True,
                "reason": "storage_read_failed",
            })
            notices.append(f"{filename} 读取失败，已跳过")
            continue

        if lower_ext == NOTEBOOK_EXTENSION:
            used_chars, item, item_notices, truncated = _extract_notebook_file(
                filename, file_bytes, parts, used_chars, max_chars, file_max_chars
            )
        else:
            used_chars, item, item_notices, truncated = _extract_text_file(
                filename, file_bytes, parts, used_chars, max_chars, file_max_chars
            )

        manifest.append(item)
        notices.extend(item_notices)
        truncated_any = truncated_any or truncated

    if used_chars >= max_chars:
        notices.append("提交内容已达到 AI 评阅总字符上限，后续内容未送入模型")
        truncated_any = True

    return ExtractedSubmission(
        text="".join(parts).strip(),
        manifest=manifest,
        notices=notices,
        truncated=truncated_any,
    )
