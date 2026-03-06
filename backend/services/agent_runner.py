from __future__ import annotations

import logging
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)


# ── Pydantic v2 동적 속성 허용 패치 ──────────────────────────────────────────
#
# browser-use Agent는 llm 객체에 ainvoke, provider, _verified_api_keys 등을
# setattr()로 동적 설정합니다. Pydantic v2는 기본적으로 이를 거부합니다.
#
# [이전 시도: 서브클래스 방식]
#   class Flexible(ChatOpenAI):
#       model_config = {**ChatOpenAI.model_config, "extra": "allow"}
#   → Pydantic v2가 서브클래스 스키마를 재컴파일하면서 model/model_name
#     field alias가 깨짐 (populate_by_name, protected_namespaces 등 유실)
#
# [현재 해결: __setattr__ 패치 방식]
#   원본 ChatOpenAI 클래스의 __setattr__만 래핑하여, Pydantic이 거부하는
#   속성은 object.__setattr__로 fallback. 서브클래스 없음 → 스키마 재컴파일 없음
#   → model 필드 및 모든 alias가 정상 동작.


def _patch_setattr(cls) -> None:
    """
    Pydantic v2 모델 클래스의 __setattr__를 패치하여 동적 속성 할당을 허용합니다.

    - browser-use가 설정하는 동적 속성 (ainvoke, provider 등)이 거부되지 않도록 함
    - 기존 Pydantic 필드의 validation은 그대로 유지
    - 한 번만 패치 (idempotent)
    """
    if getattr(cls, '_patched_flexible_setattr', False):
        return

    _original = cls.__setattr__

    def _flexible_setattr(self, name, value):
        try:
            _original(self, name, value)
        except (ValueError, AttributeError):
            object.__setattr__(self, name, value)

    cls.__setattr__ = _flexible_setattr
    cls._patched_flexible_setattr = True


def _make_flexible_openai(api_key: str):
    """ChatOpenAI 인스턴스를 생성하고 동적 속성 할당을 허용합니다."""
    from langchain_openai import ChatOpenAI

    _patch_setattr(ChatOpenAI)
    return ChatOpenAI(model="gpt-4o", api_key=api_key)


def _make_flexible_anthropic(api_key: str):
    """ChatAnthropic 인스턴스를 생성하고 동적 속성 할당을 허용합니다."""
    from langchain_anthropic import ChatAnthropic

    _patch_setattr(ChatAnthropic)
    return ChatAnthropic(
        model="claude-3-5-sonnet-20241022", api_key=api_key
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
    # (_patch_setattr 덕분에 setattr이 정상 동작)
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
