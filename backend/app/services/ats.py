import io
import re
from dataclasses import dataclass

from pypdf import PdfReader

ACTION_VERBS = {
    "led",
    "built",
    "designed",
    "implemented",
    "optimized",
    "reduced",
    "improved",
    "scaled",
    "delivered",
}
SKILL_KEYWORDS = {
    "python",
    "java",
    "c++",
    "javascript",
    "sql",
    "react",
    "node",
    "fastapi",
    "docker",
    "aws",
}


@dataclass
class ATSResult:
    score: float
    breakdown: dict


def extract_pdf_text(content: bytes) -> tuple[str, int]:
    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages).lower(), len(reader.pages)


def score_resume_v1(text: str, page_count: int) -> ATSResult:
    breakdown = {
        "contact_info": 10 if re.search(r"\b(email|@|phone|linkedin)\b", text) else 0,
        "education": 10 if re.search(r"\beducation\b", text) and re.search(r"\b(cgpa|gpa)\b", text) else 0,
        "experience_projects": 20 if re.search(r"\b(experience|projects?)\b", text) else 0,
        "skills": 20 if "skills" in text and any(k in text for k in SKILL_KEYWORDS) else 0,
        "action_verbs": 15 if any(v in text for v in ACTION_VERBS) else 0,
        "quantified_impact": 15 if re.search(r"\b\d+%|\b\d+\+|\b\d{2,}\b", text) else 0,
        "length": 10 if page_count <= 2 else 0,
    }
    return ATSResult(score=float(sum(breakdown.values())), breakdown=breakdown)


def _extract_keywords(jd: str) -> set[str]:
    tokens = {t.strip(".,()").lower() for t in jd.split()}
    return {t for t in tokens if len(t) > 2 and t.isascii()}


def analyze_v2(text: str, page_count: int, jd_text: str | None = None) -> dict:
    v1 = score_resume_v1(text, page_count)
    jd_keywords = _extract_keywords(jd_text or "")
    matched = sorted([k for k in jd_keywords if k in text])[:40]
    missing = sorted([k for k in jd_keywords if k not in text])[:40]
    keyword_score = 0
    if jd_keywords:
        keyword_score = round((len(matched) / len(jd_keywords)) * 30, 1)
    strong_verbs = {"led", "built", "reduced", "optimized", "shipped", "architected"}
    weak_verbs = {"helped", "worked", "assisted"}
    verb_score = 8.0
    if any(v in text for v in strong_verbs):
        verb_score = 15.0
    elif any(v in text for v in weak_verbs):
        verb_score = 5.0
    quant_score = 15.0 if re.search(r"\b\d+%|\$\d+|\b\d+\s*(users|ms|x)\b", text) else 6.0
    format_score = 10.0 if ("table" not in text and page_count <= 2) else 5.0
    v2_score = min(100.0, round(v1.score * 0.6 + keyword_score + verb_score + quant_score + format_score, 1))
    suggestions = []
    if missing:
        suggestions.append(f"Add missing JD keywords: {', '.join(missing[:8])}")
    if verb_score < 10:
        suggestions.append("Use stronger action verbs in project bullets")
    if quant_score < 10:
        suggestions.append("Quantify impact with percentages, counts, or latency/cost changes")
    if page_count > 2:
        suggestions.append("Keep resume length within 1-2 pages")
    return {
        "ats_v2_score": v2_score,
        "matched_keywords": matched,
        "missing_keywords": missing,
        "suggestions": suggestions,
        "v1_breakdown": v1.breakdown,
    }
