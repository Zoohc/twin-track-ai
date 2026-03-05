from __future__ import annotations
import asyncio
import logging
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)


# browser-use Agent가 llm 객체에 동적 속성(ainvoke, provider, _verified_api_keys 등)을
# setattr()로 설정합니다. Pydantic v2 모델은 기본적으로 unknown field 할당을 거부하므로,
# 부모의 model_config를 상속하면서 extra="allow"만 추가한 서브클래스를 사용합니다.
#
# 주의: ConfigDict(extra="allow")로 통째로 덮어쓰면 부모의 populate_by_name,
# arbitrary_types_allowed 등이 사라져서 model/model_name alias가 깨집니다.
# 반드시 {**Parent.model_config, "extra": "allow"} 패턴으로 병합해야 합니다.
def _make_flexible_openai(api_key: str):
    """ChatOpenAI의 extra-allow 서브클래스를 생성하여 반환."""
    from langchain_openai import ChatOpenAI

    class FlexibleChatOpenAI(ChatOpenAI):
        model_config = {**ChatOpenAI.model_config, "extra": "allow"}

    return FlexibleChatOpenAI(model="gpt-4o", api_key=api_key)  # type: ignore[arg-type]


def _make_flexible_anthropic(api_key: str):
    """ChatAnthropic의 extra-allow 서브클래스를 생성하여 반환."""
    from langchain_anthropic import ChatAnthropic

    class FlexibleChatAnthropic(ChatAnthropic):
        model_config = {**ChatAnthropic.model_config, "extra": "allow"}

    return FlexibleChatAnthropic(
        model="claude-3-5-sonnet-20241022", api_key=api_key  # type: ignore[arg-type]
    )


async def run_persona_test(
    url: str,
    persona: dict[str, str],
    system_prompt: str,
    api_key: str,
    provider: str,
    on_log: Callable[[str, str], Awaitable[None]],
) -> list[str]:
    """
    browser-use 에이전트로 단일 페르소나 테스트 실행.

    Args:
        url: 테스트 대상 URL
        persona: 페르소나 정보 dict
        system_prompt: 에이전트에 주입할 시스템 프롬프트
        api_key: LLM API Key
        provider: 'openai' | 'anthropic'
        on_log: 로그 메시지 콜백 (message, level) -> None

    Returns:
        에이전트 실행 중 수집된 로그 문자열 목록
    """
    from browser_use import Agent

    if provider == "anthropic":
        llm = _make_flexible_anthropic(api_key)
    else:
        llm = _make_flexible_openai(api_key)

    # browser-use Agent가 llm.provider 속성을 읽으므로 미리 설정
    # (extra="allow" 서브클래스이므로 setattr이 정상 동작)
    if not hasattr(llm, "provider"):
        llm.provider = provider  # type: ignore[attr-defined]

    logs: list[str] = []

    async def _log(msg: str, level: str = "info") -> None:
        logs.append(msg)
        await on_log(msg, level)

    await _log(f"[{persona['name']}] 테스트 시작: {url}")

    try:
        agent = Agent(
            task=system_prompt,
            llm=llm,
        )

        # browser-use Agent 실행
        result = await agent.run()

        final_result = str(result) if result else "테스트 완료 (결과 없음)"
        await _log(f"[{persona['name']}] 완료: {final_result[:200]}", "success")
        logs.append(final_result)

    except Exception as exc:
        error_msg = f"[{persona['name']}] 오류: {exc}"
        logger.error(error_msg, exc_info=True)
        await _log(error_msg, "error")

    return logs
