from __future__ import annotations
import asyncio
import logging
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from backend.models.report import Issue

logger = logging.getLogger(__name__)

FIX_PACK_PROMPT = """You are a technical writer helping a vibe coder fix their web app using AI coding tools.

Bug report:
Title: {title}
Description: {description}
Detected tech stack: {stack}

Write a copy-paste prompt for Cursor / Claude:
- Must be in Korean
- Precise: describe the bug clearly so AI can locate the code
- Actionable: suggest what type of code to look at (auth, routing, state management, etc.)
- Max 5 sentences
"""


async def _generate_single_fix(
    issue: Issue,
    stack: str,
    api_key: str,
    provider: str,
) -> Issue:
    prompt = FIX_PACK_PROMPT.format(
        title=issue.title,
        description=issue.description,
        stack=stack,
    )

    fix_text: str = ""

    try:
        if provider == "anthropic":
            client = AsyncAnthropic(api_key=api_key)
            message = await client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            fix_text = message.content[0].text  # type: ignore[index]
        else:
            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
            )
            fix_text = response.choices[0].message.content or ""
    except Exception as exc:
        logger.error("Failed to generate fix prompt for %s: %s", issue.id, exc)
        fix_text = ""

    return issue.model_copy(update={"fix_prompt": fix_text})


async def generate_fix_prompts(
    issues: list[Issue],
    stack: str,
    api_key: str,
    provider: str = "openai",
) -> list[Issue]:
    """치명(critical) 이슈에만 Fix Prompt 생성 (병렬)."""
    tasks = [
        _generate_single_fix(issue, stack, api_key, provider)
        for issue in issues
        if issue.severity == "critical"
    ]

    if not tasks:
        return issues

    fixed_issues = await asyncio.gather(*tasks)

    # critical 이외 이슈는 그대로 유지
    result: list[Issue] = []
    fixed_map = {i.id: i for i in fixed_issues}
    for issue in issues:
        result.append(fixed_map.get(issue.id, issue))

    return result
