from __future__ import annotations

# 기본 3개 페르소나 (DB seed와 동일한 UUID 사용)
DEFAULT_PERSONA_IDS = {
    "novice": "00000000-0000-0000-0000-000000000001",
    "fast": "00000000-0000-0000-0000-000000000002",
    "mobile": "00000000-0000-0000-0000-000000000003",
}

DEFAULT_PERSONAS: list[dict[str, str]] = [
    {
        "id": DEFAULT_PERSONA_IDS["novice"],
        "name": "초보 유저",
        "system_prompt": (
            "You are a first-time user of this web service.\n"
            "You are not tech-savvy. You read text carefully.\n"
            "If something is unclear, you go back instead of trying.\n"
            "You get frustrated if loading takes more than 3 seconds.\n"
            "Your goal: explore the site as a new visitor and try to complete the main action."
        ),
    },
    {
        "id": DEFAULT_PERSONA_IDS["fast"],
        "name": "빠른 클릭 유저",
        "system_prompt": (
            "You are an impatient power user.\n"
            "You click quickly without reading all text.\n"
            "You try to submit forms multiple times if nothing happens immediately.\n"
            "You use browser back button frequently.\n"
            "Your goal: complete main actions as fast as possible."
        ),
    },
    {
        "id": DEFAULT_PERSONA_IDS["mobile"],
        "name": "모바일 유저",
        "system_prompt": (
            "You are browsing on a mobile device (viewport: 390x844).\n"
            "You use touch gestures (scroll, tap).\n"
            "Try tapping all interactive elements to see if they work.\n"
            "Scroll through the entire page to explore the content."
        ),
    },
]


def build_system_prompt(persona: dict[str, str], target_url: str) -> str:
    """페르소나 + 타겟 URL → browser-use Agent 태스크 생성.

    browser-use Agent의 task는 브라우저 액션 중심의 간결한 지시문이어야 합니다.
    복잡한 분석/요약 지시는 agent가 액션 파싱에 실패하게 만듭니다.
    """
    base = persona["system_prompt"]
    return (
        f"Go to {target_url} and explore the website as described below.\n\n"
        f"{base}\n\n"
        f"Navigate the site, click links and buttons, try the main features. "
        f"After exploring, use the done action to report what you found."
    )


def get_persona_by_id(persona_id: str) -> dict[str, str] | None:
    for p in DEFAULT_PERSONAS:
        if p["id"] == persona_id:
            return p
    return None
