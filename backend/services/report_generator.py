from __future__ import annotations
import json
import logging
from typing import Any
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from backend.models.report import ReportGenerationResult, Issue

logger = logging.getLogger(__name__)

REPORT_PROMPT = """You are an experienced QA analyst reviewing automated browser test results.

## Test Target
URL: {url}

## Agent Logs
{agent_logs}

## Structured Action Data
{structured_data}

## Instructions
Based on the test data above, generate a detailed, SPECIFIC JSON report.

CRITICAL RULES for issues:
1. Each issue MUST include concrete reproduction_steps as a numbered list
2. Each step must describe the EXACT action (click, scroll, type) and the EXACT element (button text, selector, position)
3. Include the specific URL where the issue occurs
4. Describe what ACTUALLY happened vs what SHOULD have happened
5. If an element is involved, specify it in element_info (e.g. "button.submit at (320, 450)" or "nav > a:nth-child(3)")
6. Do NOT write vague descriptions like "탐색이 원활하지 않음" — be specific about WHAT failed and WHERE

## Output Format
Return EXACTLY this JSON structure:
{{
  "score": <0-100 integer>,
  "summary": "<2-3 sentence Korean summary focusing on the most impactful finding>",
  "issues": [
    {{
      "id": "iss_1",
      "severity": "critical|warning|ok",
      "title": "<Korean, max 40 chars, specific problem description>",
      "description": "<Korean, 2-3 sentences: what happened, where, impact>",
      "affected_persona": "<persona name>",
      "element_info": "<specific element: tag, class, id, position, or text>",
      "reproduction_steps": [
        "1. {url} 페이지에 접속",
        "2. [구체적 요소]를 클릭/스크롤/입력",
        "3. [다음 액션]",
        "4. 예상: [기대 동작] / 실제: [실제 동작]"
      ]
    }}
  ]
}}

## Example Issue (for reference):
{{
  "id": "iss_1",
  "severity": "warning",
  "title": "모바일에서 네비게이션 메뉴 버튼 반응 없음",
  "description": "모바일 뷰포트(390x844)에서 햄버거 메뉴 아이콘을 탭해도 메뉴가 펼쳐지지 않습니다. 터치 이벤트 핸들러가 누락된 것으로 보입니다.",
  "affected_persona": "모바일 유저",
  "element_info": "button.mobile-menu-toggle at header",
  "reproduction_steps": [
    "1. 모바일 뷰포트(390x844)로 메인 페이지 접속",
    "2. 우측 상단 햄버거 메뉴 아이콘(三) 탭",
    "3. 예상: 드롭다운 메뉴 표시 / 실제: 아무 반응 없음",
    "4. 여러 번 반복 탭해도 동일한 결과"
  ]
}}

Scoring guide:
- 0-40: Multiple critical bugs blocking core flows
- 41-70: Some issues but main flows work
- 71-90: Minor UX issues only
- 91-100: No significant issues found

If there are no issues, return an empty issues array with score 91-100.
"""


def _format_structured_data(structured_data: list[dict]) -> str:
    """구조화 데이터를 LLM이 읽기 좋은 텍스트로 변환."""
    if not structured_data:
        return "No structured data available."

    parts = []
    for data in structured_data:
        persona = data.get("persona_name", "Unknown")
        actions = data.get("action_names", [])
        urls = data.get("urls_visited", [])
        action_details = data.get("actions", [])

        section = f"### {persona}\n"
        if urls:
            section += f"URLs visited: {', '.join(urls[:10])}\n"
        if actions:
            section += f"Actions performed: {', '.join(actions[:20])}\n"
        if action_details:
            section += "Action details:\n"
            for detail in action_details[:15]:
                section += f"  - {str(detail)[:200]}\n"

        parts.append(section)

    return "\n".join(parts)


async def generate_report(
    url: str,
    agent_logs: list[str],
    api_key: str,
    provider: str = "openai",
    structured_data: list[dict] | None = None,
) -> ReportGenerationResult:
    logs_text = "\n".join(agent_logs)
    structured_text = _format_structured_data(structured_data or [])
    prompt = REPORT_PROMPT.format(
        url=url,
        agent_logs=logs_text,
        structured_data=structured_text,
    )

    raw_json: str = ""

    if provider == "anthropic":
        client = AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
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

    # Anthropic은 JSON 블록으로 감쌀 수 있으므로 추출
    if raw_json.strip().startswith("```"):
        lines = raw_json.strip().split("\n")
        # ```json ... ``` 패턴에서 JSON만 추출
        json_lines = []
        in_block = False
        for line in lines:
            if line.strip().startswith("```") and not in_block:
                in_block = True
                continue
            elif line.strip() == "```" and in_block:
                break
            elif in_block:
                json_lines.append(line)
        if json_lines:
            raw_json = "\n".join(json_lines)

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
