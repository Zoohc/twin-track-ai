from __future__ import annotations

import logging
from typing import Callable, Awaitable, Any

logger = logging.getLogger(__name__)


# ── Pydantic v2 동적 속성 허용 패치 ──────────────────────────────────────────
#
# browser-use Agent는 llm 객체에 ainvoke, provider, _verified_api_keys 등을
# setattr()로 동적 설정합니다. Pydantic v2는 기본적으로 이를 거부합니다.
#
# [현재 해결: __setattr__ + __getattr__ 패치 방식]
#   원본 클래스의 __setattr__를 래핑하여 동적 속성 쓰기를 허용하고,
#   서브클래스 없음 → 스키마 재컴파일 없음.


def _patch_setattr(cls) -> None:
    """
    Pydantic v2 모델 클래스의 __setattr__를 패치하여 동적 속성 할당을 허용합니다.
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
    """
    try:
        _ = llm.model
    except AttributeError:
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


def _extract_structured_data(history) -> dict[str, Any]:
    """
    AgentHistoryList에서 구조화된 데이터를 추출합니다.

    Returns:
        {
            "screenshots": list[str],    # base64 JPEG 리스트
            "actions": list[dict],        # 액션 정보 리스트
            "action_names": list[str],    # 간단 액션 이름
            "urls_visited": list[str],    # 방문 URL
        }
    """
    data: dict[str, Any] = {
        "screenshots": [],
        "actions": [],
        "action_names": [],
        "urls_visited": [],
    }

    if not history:
        return data

    # 스크린샷 추출
    try:
        if hasattr(history, 'screenshots'):
            screenshots = history.screenshots()
            if screenshots:
                data["screenshots"] = screenshots
    except Exception as e:
        logger.debug("Screenshot extraction failed: %s", e)

    # 액션 이름 추출
    try:
        if hasattr(history, 'action_names'):
            names = history.action_names()
            if names:
                data["action_names"] = [str(n) for n in names]
    except Exception as e:
        logger.debug("Action names extraction failed: %s", e)

    # 모델 액션 추출
    try:
        if hasattr(history, 'model_actions'):
            actions = history.model_actions()
            if actions:
                action_list = []
                for action in actions:
                    try:
                        action_list.append(str(action))
                    except Exception:
                        pass
                data["actions"] = action_list
    except Exception as e:
        logger.debug("Model actions extraction failed: %s", e)

    # URL 추출 (히스토리의 각 스텝에서)
    try:
        if hasattr(history, 'urls'):
            urls = history.urls()
            if urls:
                data["urls_visited"] = [str(u) for u in urls]
    except Exception as e:
        logger.debug("URL extraction failed: %s", e)

    return data


async def run_persona_test(
    url: str,
    persona: dict[str, str],
    system_prompt: str,
    api_key: str,
    provider: str,
    on_log: Callable[[str, str], Awaitable[None]],
) -> dict[str, Any]:
    """
    browser-use 에이전트로 단일 페르소나 테스트 실행.

    Returns:
        {
            "logs": list[str],
            "structured_data": dict  # 스크린샷, 액션, URL 등
        }
    """
    from browser_use import Agent

    if provider == "anthropic":
        llm = _make_flexible_anthropic(api_key)
    else:
        llm = _make_flexible_openai(api_key)

    if not hasattr(llm, "provider"):
        llm.provider = provider  # type: ignore[attr-defined]

    logs: list[str] = []

    async def _log(msg: str, level: str = "info") -> None:
        logs.append(msg)
        await on_log(msg, level)

    await _log(f"[{persona['name']}] 테스트 시작: {url}")

    structured_data: dict[str, Any] = {}

    try:
        agent = Agent(
            task=system_prompt,
            llm=llm,
            max_failures=10,
        )

        history = await agent.run()

        # 구조화된 데이터 추출
        structured_data = _extract_structured_data(history)

        # AgentHistoryList에서 결과 추출
        if history and history.is_done():
            final_result = history.final_result() if hasattr(history, 'final_result') else str(history)
        elif history:
            try:
                thoughts = history.model_thoughts() if hasattr(history, 'model_thoughts') else []
                final_result = "\n".join(str(t) for t in thoughts) if thoughts else str(history)
            except Exception:
                final_result = str(history)
        else:
            final_result = "테스트 완료 (결과 없음)"

        await _log(f"[{persona['name']}] 완료: {final_result[:300]}", "success")
        logs.append(final_result)

        # 액션 요약 로그
        if structured_data.get("action_names"):
            action_summary = ", ".join(structured_data["action_names"][:10])
            await _log(f"[{persona['name']}] 수행한 액션: {action_summary}", "info")

    except Exception as exc:
        error_msg = f"[{persona['name']}] 오류: {exc}"
        logger.error(error_msg, exc_info=True)
        await _log(error_msg, "error")

    return {
        "logs": logs,
        "structured_data": structured_data,
    }
