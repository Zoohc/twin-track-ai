from __future__ import annotations
import json
import logging
from typing import Any
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from backend.models.report import ReportGenerationResult, Issue

logger = logging.getLogger(__name__)

REPORT_PROMPT = """You are a senior UX researcher writing a professional usability audit report.

## Test Target
URL: {url}

## Raw Agent Test Logs
{agent_logs}

## Structured Interaction Data
{structured_data}

## Your Task
Analyze the test data and generate a SPECIFIC, ACTIONABLE usability report in Korean.

## CRITICAL RULES — Read carefully

### What makes a BAD issue (DO NOT write like this):
- "탐색 행동이 반복적으로 동일 페이지에서 발생" ← TOO VAGUE. Which page? Which element? Why?
- "네비게이션이 원활하지 않음" ← MEANINGLESS without specifics
- "사용자 경험이 좋지 않음" ← This says nothing

### What makes a GOOD issue (WRITE like this):
- "메인 페이지 상단 'Get Started' 버튼(파란색, 우측 상단)을 클릭하면 로그인 페이지로 이동하지만, 회원가입 페이지로 갈 것이라 기대함. 버튼 텍스트와 실제 동작이 불일치"
- "모바일 뷰포트(390px)에서 footer의 '이용약관' 링크가 화면 밖으로 잘림. overflow-x: hidden 적용 필요"
- "'문의하기' 버튼을 연속 3회 빠르게 클릭하면 폼이 3번 제출됨. debounce 처리 필요"

### Issue Requirements:
1. **구체적 요소 명시**: 버튼 텍스트, 링크 텍스트, 위치(상단/하단/좌측/우측), 색상 등
2. **행동-결과 기술**: "X를 했더니 Y가 발생했지만, Z를 기대했음" 패턴으로 기술
3. **워크플로우 기술**: 어떤 페이지에서 어떤 경로로 이동했는지 URL 포함
4. **재현 가능한 단계**: 누구든 따라할 수 있는 구체적 단계 제공
5. **개선 제안 포함**: 단순 문제 지적이 아니라 어떻게 고칠지 제안

## Output Format
Return EXACTLY this JSON structure:
{{
  "score": <0-100 integer>,
  "summary": "<Korean, 2-3 sentences. 가장 중요한 발견과 전체 UX 품질 평가. 구체적으로.>",
  "issues": [
    {{
      "id": "iss_1",
      "severity": "critical|warning|ok",
      "title": "<Korean, max 50 chars. 구체적 문제: '어디에서' '무엇이' 문제인지>",
      "description": "<Korean, 3-5 sentences. 상세 설명: 어떤 화면에서, 어떤 요소가, 어떻게 문제인지. 기대 동작 vs 실제 동작. UX 관점의 영향도.>",
      "affected_persona": "<persona name>",
      "element_info": "<구체적 요소: 'button.cta-primary \"시작하기\" at hero section' 또는 'nav > ul > li:nth-child(3) \"서비스\"' 등>",
      "reproduction_steps": [
        "1. {url} 메인 페이지에 접속한다",
        "2. 상단 네비게이션에서 '서비스' 메뉴를 클릭한다",
        "3. 스크롤을 아래로 내려 '문의하기' 섹션으로 이동한다",
        "4. '제출' 버튼을 클릭한다",
        "5. 기대: 성공 메시지 표시 / 실제: 아무 반응 없음 (버튼 disabled 상태 아닌데 동작 안 함)"
      ]
    }}
  ]
}}

## Scoring Guide:
- 0-30: 핵심 기능이 작동하지 않음 (링크 깨짐, 페이지 로드 실패, 주요 CTA 동작 안함)
- 31-50: 주요 플로우에 심각한 문제 (폼 제출 실패, 네비게이션 혼란, 오류 메시지 없음)
- 51-70: 기본 기능은 동작하지만 UX 문제 다수 (느린 응답, 혼란스러운 레이아웃, 작은 터치 영역)
- 71-85: 대부분 잘 동작하지만 개선 여지 있음 (일관성 부족, 마이너 레이아웃 이슈)
- 86-95: 양호한 UX, 사소한 개선 사항만 존재
- 96-100: 전문적 수준의 UX, 이슈 없음

## IMPORTANT:
- 이슈가 없더라도 score 96-100으로 반환하고 issues를 빈 배열로 반환
- 에이전트가 탐색한 구체적인 페이지/요소 데이터가 부족하면, 확인 가능한 범위에서만 이슈를 생성
- 추측이나 일반론이 아닌, 실제 테스트 데이터에 근거한 이슈만 보고
- 모든 텍스트는 한국어로 작성
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

        section = f"### Persona: {persona}\n"
        if urls:
            section += f"URLs visited: {', '.join(urls[:10])}\n"
        if actions:
            section += f"Actions performed ({len(actions)} total): {', '.join(actions[:30])}\n"
        if action_details:
            section += "Detailed action log:\n"
            for i, detail in enumerate(action_details[:25]):
                section += f"  Step {i+1}: {str(detail)[:300]}\n"

        thoughts = data.get("thoughts", [])
        if thoughts:
            section += "Agent observations/reasoning:\n"
            for i, thought in enumerate(thoughts[:15]):
                section += f"  Thought {i+1}: {thought}\n"

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
