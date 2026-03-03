from __future__ import annotations
import json
import logging
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from backend.models.report import ReportGenerationResult, Issue

logger = logging.getLogger(__name__)

REPORT_PROMPT = """You are an experienced QA analyst reviewing automated test results.

The following logs were collected from AI agents testing {url}:

{agent_logs}

Generate a structured JSON report with EXACTLY this structure:
{{
  "score": <0-100 integer>,
  "summary": "<1-2 sentence natural language summary in Korean>",
  "issues": [
    {{
      "id": "iss_<n>",
      "severity": "<critical|warning|ok>",
      "title": "<Korean title, max 30 chars>",
      "description": "<reproduction steps and impact>",
      "affected_persona": "<persona name>"
    }}
  ]
}}

Scoring guide:
- 0-40: Multiple critical bugs blocking core flows
- 41-70: Some issues but main flows work
- 71-90: Minor UX issues only
- 91-100: No significant issues found
"""


async def generate_report(
    url: str,
    agent_logs: list[str],
    api_key: str,
    provider: str = "openai",
) -> ReportGenerationResult:
    logs_text = "\n".join(agent_logs)
    prompt = REPORT_PROMPT.format(url=url, agent_logs=logs_text)

    raw_json: str = ""

    if provider == "anthropic":
        client = AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_json = message.content[0].text  # type: ignore[index]
    else:
        # OpenAI (기본)
        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        raw_json = response.choices[0].message.content or "{}"

    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM JSON response: %s", raw_json[:500])
        data = {"score": 50, "summary": "리포트 생성 중 오류가 발생했습니다.", "issues": []}

    issues: list[Issue] = []
    for item in data.get("issues", []):
        try:
            issues.append(Issue(**item))
        except Exception:
            logger.warning("Invalid issue format: %s", item)

    return ReportGenerationResult(
        score=int(data.get("score", 50)),
        summary=str(data.get("summary", "")),
        issues=issues,
    )
