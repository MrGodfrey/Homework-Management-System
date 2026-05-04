import json
from typing import Any, Optional

import requests

from app.config import settings


def _fake_completion(messages: list[dict[str, str]], model: str) -> dict[str, Any]:
    content = json.dumps(
        {
            "score": 87,
            "confidence": "medium",
            "summary": "本地测试模式生成的 AI 初评摘要。",
            "rubric_alignment": [
                {
                    "criterion": "评分参考",
                    "observation": "已根据提交文本和评分参考生成建议。",
                    "suggested_score": 87,
                    "max_score": 100,
                }
            ],
            "missing_or_weak_items": ["请教师结合原始文件复核。"],
            "teacher_notes": "AI 建议分只作为教师参考，不会自动保存为最终成绩。",
            "evidence": [{"file": "submission", "note": "来自提取出的文本内容。"}],
            "flags": [],
        },
        ensure_ascii=False,
    )
    return {
        "content": content,
        "prompt_tokens": sum(len(item.get("content", "")) for item in messages) // 4,
        "completion_tokens": len(content) // 4,
    }


def create_chat_completion(
    messages: list[dict[str, str]],
    model: Optional[str] = None,
    max_tokens: Optional[int] = None,
    timeout_seconds: Optional[int] = None,
) -> dict[str, Any]:
    selected_model = model or settings.HOMEWORK_SUMMARY_MODEL
    if settings.AI_GRADING_FAKE_RESPONSE:
        return _fake_completion(messages, selected_model)

    if not settings.TENCENT_MODEL_KEY_SECRET:
        raise RuntimeError("TokenHub API key is not configured")

    payload = {
        "model": selected_model,
        "messages": messages,
        "stream": False,
        "max_tokens": max_tokens or settings.AI_GRADING_MAX_TOKENS,
    }
    response = requests.post(
        settings.TOKENHUB_BASE_URL,
        headers={
            "Authorization": f"Bearer {settings.TENCENT_MODEL_KEY_SECRET}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=timeout_seconds or settings.AI_GRADING_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("TokenHub response did not include choices")
    content = (choices[0].get("message") or {}).get("content")
    if not content:
        raise RuntimeError("TokenHub response did not include message content")

    usage = data.get("usage") or {}
    return {
        "content": content,
        "prompt_tokens": usage.get("prompt_tokens"),
        "completion_tokens": usage.get("completion_tokens"),
    }
