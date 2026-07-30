"""Advanced AI helpers (Phase 9).

All functions degrade gracefully to deterministic heuristics when no Anthropic
key is configured, so streaming, resume rewrite and study-plan generation work
end-to-end in dev/CI without external calls. Cost/rate controls are applied via
per-tier feature gating in ``deps.require_entitlement``.
"""

from __future__ import annotations

from collections.abc import Iterator

from app.config import get_settings


def _client():
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None, settings
    try:
        from anthropic import Anthropic

        return Anthropic(api_key=settings.anthropic_api_key), settings
    except Exception:
        return None, settings


def complete(system_prompt: str, messages: list[dict], max_tokens: int = 700) -> str | None:
    client, settings = _client()
    if not client:
        return None
    try:
        resp = client.messages.create(
            model=settings.anthropic_model, max_tokens=max_tokens, system=system_prompt, messages=messages
        )
        if resp.content:
            return resp.content[0].text
    except Exception:
        return None
    return None


def stream_completion(system_prompt: str, messages: list[dict], max_tokens: int = 700) -> Iterator[str]:
    """Yield incremental text chunks. Falls back to chunked canned text."""
    client, settings = _client()
    if not client:
        fallback = (
            "That's a solid start. Consider structuring your answer with STAR: "
            "situation, task, action, and result. Quantify the impact where you can, "
            "and mention the trade-offs you weighed."
        )
        for word in fallback.split(" "):
            yield word + " "
        return
    try:
        with client.messages.stream(
            model=settings.anthropic_model, max_tokens=max_tokens, system=system_prompt, messages=messages
        ) as stream:
            for text in stream.text_stream:
                yield text
    except Exception:
        yield "I hit an issue generating a streamed response; please try again."


def resume_rewrite(sections: dict | str, target_role: str | None) -> dict:
    """Section-level rewrite suggestions (ATS V2 context aware)."""
    role = target_role or "the target role"
    prompt = (
        f"You are an expert resume editor for {role}. For each section provide a concise, "
        "quantified, ATS-friendly rewrite. Return short bullet suggestions."
    )
    llm = complete(prompt, [{"role": "user", "content": f"Resume sections: {sections}"}], max_tokens=800)
    if llm:
        return {"powered_by": "anthropic", "suggestions": llm}

    # Deterministic fallback suggestions.
    tips = [
        "Lead each bullet with a strong action verb (Built, Led, Optimized).",
        "Quantify impact: add metrics (%, latency, users, revenue).",
        f"Tailor the summary to {role} with matching keywords.",
        "Remove first-person pronouns and filler; keep bullets to one line.",
        "Group skills by category and drop outdated tools.",
    ]
    return {"powered_by": "heuristic", "suggestions": tips}


def generate_study_plan(score, gaps: list[dict]) -> dict:
    """Personalized study plan from readiness gaps + roadmap progress."""
    prompt = (
        "You are a placement coach. Given the student's readiness gaps, produce a focused "
        "2-week study plan with daily actions. Be specific and realistic."
    )
    llm = complete(prompt, [{"role": "user", "content": f"Gaps: {gaps}"}], max_tokens=900)
    if llm:
        return {"powered_by": "anthropic", "plan": llm, "gaps": gaps}

    day_actions = {
        "dsa": "Solve 2 medium problems; review 1 pattern (sliding window, DP, graphs).",
        "cs": "Complete 1 CS fundamentals topic and self-quiz.",
        "projects": "Ship one measurable project update; write the README impact section.",
        "interview": "Do 1 mock interview (record + self-review).",
        "resume": "Run ATS analysis and apply 3 rewrite suggestions.",
        "opportunities": "Apply to 1 tracked opportunity and log follow-ups.",
    }
    weeks = []
    for week in (1, 2):
        days = []
        for i, gap in enumerate(gaps[:5], start=1):
            cat = gap["category"]
            days.append({"day": (week - 1) * 5 + i, "focus": cat, "action": day_actions.get(cat, "Review weakest area.")})
        weeks.append({"week": week, "days": days})
    return {"powered_by": "heuristic", "plan": weeks, "gaps": gaps}
