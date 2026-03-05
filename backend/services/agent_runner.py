from __future__ import annotations
import asyncio
import logging
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)


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
        from langchain_anthropic import ChatAnthropic
        llm = ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            api_key=api_key,  # type: ignore[arg-type]
        )
    else:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model="gpt-4o",
            api_key=api_key,  # type: ignore[arg-type]
        )

    # browser-use Agent가 llm에 동적 속성(provider, ainvoke 등)을 설정하므로
    # Pydantic v2 모델이 extra fields를 허용하도록 설정
    if hasattr(llm.__class__, "model_config"):
        llm.__class__.model_config["extra"] = "allow"

    # provider 속성 추가 (browser-use Agent가 참조)
    if not hasattr(llm, "provider"):
        object.__setattr__(llm, "provider", provider)

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
