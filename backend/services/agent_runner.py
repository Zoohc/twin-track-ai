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
# [현재 해결: __setattr__ + __getattr__ 패치 방식]
#   원본 클래스의 __setattr__를 래핑하여 동적 속성 쓰기를 허용하고,
#   __getattr__를 래핑하여 model_name → model alias 읽기를 보장합니다.
#   서브클래스 없음 → 스키마 재컴파일 없음.
#
# 추가 문제: browser-use의 token service가 llm.model을 읽는데,
#   일부 langchain 버전에서 model은 model_name의 alias이고
#   Pydantic v2 __getattr__는 alias를 해석하지 않아 AttributeError 발생.
#   → _ensure_model_attr()로 llm.model이 접근 가능하도록 보장.


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


def _ensure_model_attr(llm, model_name: str) -> None:
    """
    llm.model 접근이 가능한지 확인하고, 불가능하면 직접 설정합니다.

    일부 langchain 버전에서 'model'은 'model_name' 필드의 alias인데,
    Pydantic v2의 __getattr__는 alias를 해석하지 못합니다.
    browser-use의 token service (register_llm)가 llm.model을 읽으므로
    이 속성이 반드시 접근 가능해야 합니다.
    """
    try:
        _ = llm.model
    except AttributeError:
        # model_name 필드에서 값을 가져오거나 기본값 사용
        val = getattr(llm, 'model_name', model_name)
        object.__setattr__(llm, 'model', val)


def _make_flexible_openai(api_key: str):
    """ChatOpenAI 인스턴스를 생성하고 동적 속성 할당/읽기를 보장합니다."""
    from langchain_openai import ChatOpenAI

    _patch_setattr(ChatOpenAI)
    llm = ChatOpenAI(model="gpt-4o", api_key=api_key)
    _ensure_model_attr(llm, "gpt-4o")
    return llm


def _make_flexible_anthropic(api_key: str):
    """ChatAnthropic 인스턴스를 생성하고 동적 속성 할당/읽기를 보장합니다."""
    from langchain_anthropic import ChatAnthropic

    _patch_setattr(ChatAnthropic)
    llm = ChatAnthropic(
        model="claude-3-5-sonnet-20241022", api_key=api_key
    )
    _ensure_model_attr(llm, "claude-3-5-sonnet-20241022")
    return llm


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
            max_failures=10,         # 기본 5 → 10으로 증가 (파싱 재시도 여유)
        )

        # browser-use Agent 실행
        history = await agent.run()

        # AgentHistoryList에서 결과 추출
        if history and history.is_done():
            final_result = history.final_result() if hasattr(history, 'final_result') else str(history)
        elif history:
            # 완료 신호 없이 끝난 경우에도 히스토리에서 정보 추출
            try:
                thoughts = history.model_thoughts() if hasattr(history, 'model_thoughts') else []
                final_result = "\n".join(str(t) for t in thoughts) if thoughts else str(history)
            except Exception:
                final_result = str(history)
        else:
            final_result = "테스트 완료 (결과 없음)"

        await _log(f"[{persona['name']}] 완료: {final_result[:300]}", "success")
        logs.append(final_result)

    except Exception as exc:
        error_msg = f"[{persona['name']}] 오류: {exc}"
        logger.error(error_msg, exc_info=True)
        await _log(error_msg, "error")

    return logs
