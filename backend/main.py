"""
GUIDED — Premium Mentorship Platform Backend
=============================================

A fully dynamic FastAPI backend powered by MongoDB, with JWT-based
authentication and role-based access control (RBAC).

This server handles:
  • User registration & login (candidates, mentors, admins)
  • AI-powered career roadmap generation via Google Gemini
  • Mentor discovery, checkout, and session management
  • Mentor verification & admin approval workflows
  • Admin dashboard with platform analytics & monitoring

Run:   uvicorn main:app --reload
Docs:  http://localhost:8000/docs
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Annotated, Optional
from urllib.parse import urlencode

from fastapi import Depends, FastAPI, HTTPException, Header, Query, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from google import genai

log = logging.getLogger("guided")


# ─────────────────────────────────────────────────────────────
#  Section 1 — External Service Configuration
# ─────────────────────────────────────────────────────────────
#  Credentials and clients for Google Gemini (AI roadmap
#  generation) and MongoDB (primary data store).
# ─────────────────────────────────────────────────────────────

# Google Gemini — used to generate personalised career roadmaps
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBVCzT9O0KCnS_lMccN21F7GLcM6sO7P5U")
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# MongoDB — primary database for all user, mentor, and session data
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "guided_db")

mongo = AsyncIOMotorClient(MONGODB_URL)
db = mongo[MONGODB_DB]


# ─────────────────────────────────────────────────────────────
#  Section 2 — JWT Authentication (HMAC-SHA256)
# ─────────────────────────────────────────────────────────────
#  A lightweight, zero-dependency JWT implementation used to
#  issue and validate access tokens for all authenticated
#  API calls. Tokens expire after 24 hours.
# ─────────────────────────────────────────────────────────────

JWT_SECRET = "guided-hackathon-secret-2026"
JWT_EXPIRY = 86400  # 24 hours in seconds


def _b64url_enc(data: bytes) -> str:
    """Encode raw bytes as a URL-safe Base64 string (no padding)."""
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_dec(s: str) -> bytes:
    """Decode a URL-safe Base64 string back to raw bytes."""
    import base64
    return base64.urlsafe_b64decode(s + "=" * (4 - len(s) % 4))


def create_jwt(payload: dict) -> str:
    """
    Build a signed JWT token from a payload dictionary.

    The token includes an `exp` claim set to JWT_EXPIRY seconds
    from now. The signature uses HMAC-SHA256.
    """
    header = _b64url_enc(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64url_enc(json.dumps({**payload, "exp": int(time.time()) + JWT_EXPIRY}).encode())
    sig = hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{_b64url_enc(sig)}"


def decode_jwt(token: str) -> dict:
    """
    Validate and decode a JWT token.

    Raises an HTTP 401 error if the signature is invalid or the
    token has expired.
    """
    try:
        h, b, s = token.split(".")
        expected = hmac.new(JWT_SECRET.encode(), f"{h}.{b}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_dec(s)):
            raise ValueError("bad sig")
        payload = json.loads(_b64url_dec(b))
        if payload.get("exp", 0) < time.time():
            raise ValueError("expired")
        return payload
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")


# ─────────────────────────────────────────────────────────────
#  Section 3 — Role-Based Access Control (RBAC)
# ─────────────────────────────────────────────────────────────
#  FastAPI dependency helpers that extract the current user
#  from the Bearer token and optionally enforce role checks.
# ─────────────────────────────────────────────────────────────

def get_current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    """
    Extract the currently authenticated user from the Authorization header.

    Expects a `Bearer <token>` format. Returns the decoded JWT payload.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Authorization header")
    return decode_jwt(authorization.split(" ", 1)[1])


def require_role(*roles: str):
    """
    Create a FastAPI dependency that enforces role-based access.

    Usage:
        @app.get("/admin/...")
        async def admin_endpoint(user=Depends(require_role("admin"))):
            ...
    """
    def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return user
    return checker


# ─────────────────────────────────────────────────────────────
#  Section 4 — Data Models (Pydantic)
# ─────────────────────────────────────────────────────────────
#  All domain entities are defined as Pydantic models. The
#  CamelModel base class automatically converts snake_case
#  field names to camelCase for JSON serialisation, keeping
#  the API response format consistent with the frontend.
# ─────────────────────────────────────────────────────────────

class CamelModel(BaseModel):
    """Base model that auto-converts snake_case fields to camelCase in JSON output."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ── Core Entities ───────────────────────────────

class UserAccount(CamelModel):
    """A registered platform user — could be a candidate, mentor, or admin."""
    id: str
    email: str
    name: str
    password_hash: str
    role: str                   # "candidate" | "mentor" | "admin"
    verified: bool = True
    linkedin_url: str = ""
    created_at: str = ""


class Mentor(CamelModel):
    """A verified mentor profile visible in the marketplace."""
    id: str
    name: str
    role: str                   # e.g. "Senior Software Engineer"
    company: str
    avatar: str                 # Initials or image identifier
    experience: int             # Years of experience
    domain: str                 # e.g. "Software Engineering", "Design"
    price_per_session: float
    available: bool
    rating: float
    sessions: int               # Total sessions conducted
    bio: str
    verified: bool = True
    user_id: str = ""           # Links to the UserAccount


class RoadmapStep(CamelModel):
    """A single phase in a candidate's career roadmap."""
    id: str
    title: str
    description: str
    duration: str               # e.g. "Week 1", "Weeks 2–3"
    status: str                 # "completed" | "current" | "upcoming"


class Session(CamelModel):
    """A scheduled or completed mentoring session."""
    id: str
    title: str
    date: str                   # ISO date (YYYY-MM-DD)
    time: str                   # Human-readable time (e.g. "10:00 AM")
    status: str                 # "completed" | "upcoming"
    mentor: str                 # Mentor's display name
    notes: Optional[str] = None


class ActionItem(CamelModel):
    """A task assigned to a candidate as part of their development plan."""
    id: str
    title: str
    completed: bool
    due_date: str


class SkillGap(CamelModel):
    """Represents the gap between a candidate's current skill level and the target."""
    skill: str
    level: int                  # Current proficiency (0–100)
    target: int                 # Required proficiency (0–100)


class Candidate(CamelModel):
    """
    A mentee who is going through the career development workflow.

    Lifecycle: registered → onboarded → roadmap_generated → mentorship_active
    """
    id: str
    career_goal: str = ""
    target_role: str = ""
    target_company: str = ""
    skill_level: str = ""           # "beginner" | "intermediate" | "advanced"
    experience_level: str = ""      # "0" | "1-2" | "3-5" | "5+"
    resume_uploaded: bool = False
    name: str = ""
    email: str = ""
    status: str = "registered"      # Current stage in the workflow
    roadmap_generated: bool = False
    generated_by: str = ""          # "gemini" or "mock" — tracks roadmap source
    roadmap: list[RoadmapStep] = []
    skill_gaps: list[SkillGap] = []
    sessions: list[Session] = []
    action_items: list[ActionItem] = []
    mentor_id: Optional[str] = None


class MentorRequest(CamelModel):
    """A mentorship request from a candidate to a specific mentor."""
    id: str
    candidate_name: str
    candidate_goal: str
    experience: str
    status: str                 # "pending" | "accepted" | "declined"
    submitted_at: str
    candidate_id: str = ""
    mentor_id: str = ""


class PendingVerification(CamelModel):
    """A mentor application awaiting admin approval."""
    id: str
    name: str
    role: str
    experience: int
    submitted_at: str
    linkedin_url: str = ""
    user_id: str = ""


class ActivityEntry(CamelModel):
    """A log entry in the platform's recent-activity feed."""
    id: str
    type: str                   # "session" | "signup" | "payment" | "admin"
    description: str
    time: str


# ── Request / Response Bodies ───────────────────

class SignupBody(BaseModel):
    """Payload for creating a new user account."""
    email: str
    password: str
    name: str
    role: str                   # "candidate" | "mentor" | "admin"
    linkedin_url: str = ""
    model_config = ConfigDict(populate_by_name=True)


class LoginBody(BaseModel):
    """Payload for authenticating an existing user."""
    email: str
    password: str
    model_config = ConfigDict(populate_by_name=True)


class CandidateCreate(CamelModel):
    """Payload for the candidate onboarding step."""
    career_goal: str
    target_role: str
    target_company: str = ""
    skill_level: str
    experience_level: str
    resume_uploaded: bool = False
    name: str = ""
    email: str = ""


class RoadmapRequestBody(BaseModel):
    """Identifies which candidate to generate/regenerate a roadmap for."""
    candidate_id: str = Field(alias="candidateId")
    model_config = ConfigDict(populate_by_name=True)


class CheckoutRequestBody(BaseModel):
    """Payload for selecting a mentor and starting the checkout flow."""
    mentor_id: str = Field(alias="mentorId")
    candidate_id: str = Field(alias="candidateId", default="")
    model_config = ConfigDict(populate_by_name=True)


class AcceptRequestBody(BaseModel):
    """Identifies which mentorship request to accept."""
    mentorship_id: str = Field(alias="mentorshipId")
    model_config = ConfigDict(populate_by_name=True)


class DeclineRequestBody(BaseModel):
    """Identifies which mentorship request to decline."""
    mentorship_id: str = Field(alias="mentorshipId")
    model_config = ConfigDict(populate_by_name=True)


class VerifyMentorBody(BaseModel):
    """Identifies which pending mentor to approve (admin action)."""
    mentor_id: str = Field(alias="mentorId")
    model_config = ConfigDict(populate_by_name=True)


class RejectMentorBody(BaseModel):
    """Identifies which pending mentor to reject, with an optional reason."""
    mentor_id: str = Field(alias="mentorId")
    reason: str = ""
    model_config = ConfigDict(populate_by_name=True)


class MentorVerificationSubmit(BaseModel):
    """Payload for a mentor submitting their LinkedIn for verification."""
    linkedin_url: str = Field(alias="linkedinUrl")
    model_config = ConfigDict(populate_by_name=True)


class ToggleActionItemBody(BaseModel):
    """Payload for marking a candidate's action item as done/undone."""
    candidate_id: str = Field(alias="candidateId")
    action_item_id: str = Field(alias="actionItemId")
    completed: bool
    model_config = ConfigDict(populate_by_name=True)


class CompleteSessionBody(BaseModel):
    """Payload for marking a mentoring session as completed."""
    session_id: str = Field(alias="sessionId")
    notes: str = ""
    model_config = ConfigDict(populate_by_name=True)


# ─────────────────────────────────────────────────────────────
#  Section 5 — Utility Helpers
# ─────────────────────────────────────────────────────────────
#  Small, reusable functions used throughout the codebase:
#  ID generation, password hashing, MongoDB document
#  conversion, and activity logging.
# ─────────────────────────────────────────────────────────────

def _uid() -> str:
    """Generate a short, unique 8-character hex identifier."""
    return uuid.uuid4().hex[:8]


def _generate_google_calendar_url(
    title: str,
    description: str,
    start_dt: datetime,
    duration_minutes: int = 60,
    location: str = "Google Meet (link will be shared)",
) -> str:
    """
    Build a Google Calendar event creation URL with pre-filled details.

    When the user clicks this link, Google Calendar opens with the
    session title, description, time, and location already filled in.
    """
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    # Google Calendar expects the format: YYYYMMDDTHHmmSS/YYYYMMDDTHHmmSS
    fmt = "%Y%m%dT%H%M%S"
    dates = f"{start_dt.strftime(fmt)}/{end_dt.strftime(fmt)}"
    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": dates,
        "details": description,
        "location": location,
        "sf": "true",
        "output": "xml",
    }
    return f"https://calendar.google.com/calendar/render?{urlencode(params)}"


def _hash(pw: str) -> str:
    """Hash a password using SHA-256 with a secret salt. Not for production use."""
    return hashlib.sha256(f"{pw}:{JWT_SECRET}".encode()).hexdigest()


def _to_doc(obj) -> dict:
    """
    Convert a Pydantic model (or dict) into a MongoDB-compatible document.

    Renames `id` → `_id` to match MongoDB's primary key convention.
    """
    d = obj.model_dump() if hasattr(obj, "model_dump") else dict(obj)
    if "id" in d:
        d["_id"] = d.pop("id")
    return d


def _from_doc(doc) -> dict | None:
    """
    Convert a MongoDB document back into a regular dictionary.

    Renames `_id` → `id` so it can be fed into Pydantic models.
    """
    if doc is None:
        return None
    d = dict(doc)
    if "_id" in d:
        d["id"] = d.pop("_id")
    return d


async def _activity(desc: str, atype: str = "session"):
    """
    Record a recent-activity entry in the database.

    These entries appear on the admin dashboard as an audit trail
    of important platform events (payments, signups, sessions, etc.).
    """
    await db.recent_activity.insert_one({
        "_id": f"act-{uuid.uuid4().hex[:6]}",
        "type": atype,
        "description": desc,
        "time": datetime.now().strftime("%I:%M %p"),
        "created_at": datetime.now().isoformat(),
    })


# ─────────────────────────────────────────────────────────────
#  Section 6 — Template-Based Roadmap Generator (Fallback)
# ─────────────────────────────────────────────────────────────
#  When Gemini is unavailable or fails, we build a roadmap
#  from curated templates. The output is personalised to the
#  candidate's domain, skill level, and experience.
# ─────────────────────────────────────────────────────────────

# Mapping of career domains to their core skills.
# Each tuple is: (skill_name, base_current_level, base_target_level)
_DOMAIN_SKILLS: dict[str, list[tuple[str, int, int]]] = {
    "software engineering": [
        ("System Design", 30, 80),
        ("Data Structures & Algorithms", 45, 85),
        ("Coding Interviews", 35, 80),
        ("Communication", 55, 75),
        ("Architecture Patterns", 25, 70),
    ],
    "frontend": [
        ("React / Next.js", 40, 85),
        ("CSS & Design Systems", 50, 80),
        ("Performance Optimization", 25, 70),
        ("TypeScript", 45, 80),
        ("Accessibility", 30, 75),
    ],
    "backend": [
        ("API Design", 40, 85),
        ("Database Design", 35, 80),
        ("Distributed Systems", 20, 70),
        ("Security & Auth", 30, 75),
        ("DevOps / CI-CD", 25, 65),
    ],
    "data science": [
        ("Machine Learning", 30, 80),
        ("Statistics & Probability", 40, 75),
        ("Python / Pandas", 50, 85),
        ("Data Visualization", 45, 75),
        ("SQL & Databases", 40, 70),
    ],
    "product management": [
        ("Product Strategy", 25, 75),
        ("User Research", 35, 80),
        ("Metrics & Analytics", 30, 70),
        ("Stakeholder Communication", 50, 80),
        ("Roadmap Planning", 35, 75),
    ],
    "design": [
        ("UI Design", 40, 85),
        ("UX Research", 30, 75),
        ("Prototyping", 45, 80),
        ("Design Systems", 25, 70),
        ("User Testing", 35, 75),
    ],
}

# Adjustments to the base skill levels based on how experienced the candidate is
_SKILL_MODIFIERS = {"beginner": -15, "intermediate": 0, "advanced": 20}
_EXP_MODIFIERS = {"0": -10, "1-2": -5, "3-5": 5, "5+": 15}


def _detect_domain(target_role: str, career_goal: str) -> str:
    """
    Detect which career domain best matches the candidate's goal.

    Scans for keywords in the role/goal text and returns one of:
    'frontend', 'backend', 'data science', 'product management',
    'design', or the default 'software engineering'.
    """
    text = f"{target_role} {career_goal}".lower()

    if any(w in text for w in ["frontend", "react", "ui engineer", "web"]):
        return "frontend"
    if any(w in text for w in ["backend", "server", "api", "infrastructure"]):
        return "backend"
    if any(w in text for w in ["data scien", "ml ", "machine learn", "analytics"]):
        return "data science"
    if any(w in text for w in ["product manage", " pm ", "product lead"]):
        return "product management"
    if any(w in text for w in ["design", "ux", "ui/ux"]):
        return "design"

    return "software engineering"


def generate_dynamic_roadmap(candidate: Candidate) -> tuple[list[RoadmapStep], list[SkillGap]]:
    """
    Create a career roadmap and skill-gap analysis from curated templates.

    This is the deterministic fallback used when Gemini AI is unavailable.
    The roadmap length and pacing are adjusted to the candidate's skill level.
    """
    domain = _detect_domain(candidate.target_role, candidate.career_goal)
    target = candidate.target_role or "Software Engineer"
    company = candidate.target_company or "top companies"
    skill_mod = _SKILL_MODIFIERS.get(candidate.skill_level, 0)
    exp_mod = _EXP_MODIFIERS.get(candidate.experience_level, 0)

    # Adjust the pacing of each phase based on how much ramp-up the candidate needs
    if candidate.skill_level == "advanced":
        phase_splits = ["Week 1", "Weeks 2-3", "Week 4", "Week 5", "Weeks 6-8"]
    elif candidate.skill_level == "beginner":
        phase_splits = ["Weeks 1-3", "Weeks 4-7", "Weeks 8-10", "Weeks 11-12", "Weeks 13-16"]
    else:
        phase_splits = ["Weeks 1-2", "Weeks 3-5", "Weeks 6-7", "Week 8", "Weeks 9-12"]

    # Build the five standard roadmap phases, personalised to the candidate
    roadmap = [
        RoadmapStep(
            id="r1",
            title="Foundation & Skill Assessment",
            description=(
                f"Assess your current abilities against {target} requirements. "
                f"Build a baseline in core competencies identified in your skill gap analysis."
            ),
            duration=phase_splits[0],
            status="upcoming",
        ),
        RoadmapStep(
            id="r2",
            title=f"Build {domain.title()} Portfolio",
            description=(
                f"Create 2-3 targeted projects demonstrating your expertise for a {target} role at {company}. "
                f"Document your process and decisions."
            ),
            duration=phase_splits[1],
            status="upcoming",
        ),
        RoadmapStep(
            id="r3",
            title="Mock Interviews & Feedback",
            description=(
                f"Complete structured mock interviews focused on {domain}. "
                f"Get detailed feedback on technical depth and behavioral responses."
            ),
            duration=phase_splits[2],
            status="upcoming",
        ),
        RoadmapStep(
            id="r4",
            title="Application Strategy",
            description=(
                f"Optimize your resume and LinkedIn for {target} roles. "
                f"Build a targeted company list and networking plan for {company}."
            ),
            duration=phase_splits[3],
            status="upcoming",
        ),
        RoadmapStep(
            id="r5",
            title="Interview Sprint & Launch",
            description=(
                f"Execute your interview strategy with ongoing mentor support. "
                f"Debrief after each round for a {target} position."
            ),
            duration=phase_splits[4],
            status="upcoming",
        ),
    ]

    # Calculate personalised skill gaps by applying level/experience modifiers
    base_gaps = _DOMAIN_SKILLS.get(domain, _DOMAIN_SKILLS["software engineering"])
    skill_gaps = []
    for skill_name, base_level, base_target in base_gaps:
        level = max(5, min(90, base_level + skill_mod + exp_mod))
        target_val = max(level + 10, min(95, base_target))
        skill_gaps.append(SkillGap(skill=skill_name, level=level, target=target_val))

    return roadmap, skill_gaps


# ─────────────────────────────────────────────────────────────
#  Section 7 — AI-Powered Roadmap Generator (Google Gemini)
# ─────────────────────────────────────────────────────────────
#  The primary roadmap generator sends a structured prompt to
#  Gemini and parses the JSON response. If Gemini fails (quota,
#  network, bad JSON), it falls back to the template generator.
# ─────────────────────────────────────────────────────────────

_GEMINI_ROADMAP_PROMPT = """
You are a world-class career coach and hiring-focused mentor who specializes in helping candidates move from confusion to job-readiness using structured, outcome-driven plans.

Your task is to generate a **personalized career roadmap** and **skill gap analysis** based STRICTLY on the candidate profile provided.

==================================================
CANDIDATE PROFILE
==================================================
- Career Goal: {career_goal}
- Target Role: {target_role}
- Target Company: {target_company}
- Current Skill Level: {skill_level}
- Years of Experience: {experience_level}

==================================================
ROADMAP GENERATION RULES (CRITICAL)
==================================================
1. Generate EXACTLY **5 to 8 roadmap steps**.
2. Steps must form a **logical progression** from the candidate's CURRENT state to being job-ready for the target role.
3. Each step MUST include:
   - Clear objective
   - Practical actions (learning, practice, projects, preparation)
4. Assign a realistic duration to EACH step:
   - Examples: "Week 1", "Weeks 2–3", "Weeks 4–6"
5. Total roadmap duration must match the candidate level:
   - Beginner → ~16 weeks
   - Intermediate → ~12 weeks
   - Advanced → ~8 weeks
6. Avoid generic advice such as:
   - "Improve skills"
   - "Practice more"
   - "Learn basics"
   Every step must be **specific and actionable**.

==================================================
SKILL GAP ANALYSIS RULES
==================================================
1. Generate EXACTLY **5 skill gaps**.
2. Skills must be:
   - Directly relevant to the target role
   - Aligned with real industry expectations
3. For each skill:
   - `level` represents the candidate's current proficiency (0–100)
   - `target` represents job-ready proficiency (0–100)
4. Ensure:
   - level < target
   - Values feel realistic (no extremes like 5% or 100%)

==================================================
QUALITY & CONSISTENCY RULES
==================================================
- Do NOT include:
  - Motivational language
  - Emojis
  - Career philosophy
  - Any explanation outside JSON
- Do NOT mention AI, Gemini, or yourself.
- Use professional, mentor-like tone.
- Assume this output will be shown directly to the user in a dashboard.

==================================================
OUTPUT FORMAT (STRICT)
==================================================
Return ONLY valid JSON.
- No markdown
- No code fences
- No comments
- No trailing commas

JSON structure must EXACTLY match this schema:

{
  "roadmap": [
    {
      "id": "r1",
      "title": "Concise step title",
      "description": "2–3 sentences with specific, actionable guidance tailored to the candidate",
      "duration": "Week 1",
      "status": "upcoming"
    }
  ],
  "skillGaps": [
    {
      "skill": "Skill name",
      "level": 40,
      "target": 75
    }
  ]
}
"""


async def generate_roadmap_with_gemini(candidate: Candidate) -> tuple[list[RoadmapStep], list[SkillGap], str]:
    """
    Generate a personalised career roadmap using Google Gemini.

    Tries multiple Gemini model variants in order (in case one has
    exhausted its free-tier quota). If all attempts fail, falls back
    to the template-based generator.

    Returns:
        A tuple of (roadmap_steps, skill_gaps, source_label).
        source_label is "gemini" on success, "mock" on fallback.
    """
    try:
        prompt = _GEMINI_ROADMAP_PROMPT.format(
            career_goal=candidate.career_goal or "Career transition into tech",
            target_role=candidate.target_role or "Software Engineer",
            target_company=candidate.target_company or "Top Tech Companies",
            skill_level=candidate.skill_level or "intermediate",
            experience_level=candidate.experience_level or "1-2",
        )

        from google.genai import types as genai_types

        # Try multiple models — free-tier quota may be exhausted on one
        models_to_try = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]
        last_err = None
        raw = None

        for model_name in models_to_try:
            try:
                log.info("Trying Gemini model: %s", model_name)
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                )
                raw = response.text.strip()
                log.info("Gemini (%s) raw response (first 500 chars): %s", model_name, raw[:500])
                break  # Success — stop trying other models
            except Exception as model_err:
                last_err = model_err
                log.warning("Model %s failed: %s — trying next", model_name, model_err)
                import asyncio
                await asyncio.sleep(2)  # Brief pause before trying the next model
                continue

        if raw is None:
            raise last_err or ValueError("All Gemini models failed")

        # ── Clean up the raw Gemini response ──

        # Strip markdown code fences if present (```json ... ```)
        fence_match = re.search(r"```(?:json)?\s*\n?([\s\S]*?)```", raw)
        if fence_match:
            raw = fence_match.group(1).strip()

        # Extract the outermost JSON object
        brace_start = raw.find("{")
        brace_end = raw.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            raw = raw[brace_start:brace_end + 1]

        # Remove trailing commas before } or ] (common Gemini formatting issue)
        raw = re.sub(r",\s*([}\]])", r"\1", raw)

        data = json.loads(raw)

        # Handle possible nested wrapper (e.g. {"response": {"roadmap": ...}})
        if "roadmap" not in data:
            for v in data.values():
                if isinstance(v, dict) and "roadmap" in v:
                    data = v
                    break

        # ── Parse the structured roadmap steps ──
        roadmap: list[RoadmapStep] = []
        for i, step in enumerate(data.get("roadmap", [])):
            roadmap.append(RoadmapStep(
                id=step.get("id", f"r{i+1}"),
                title=step.get("title", f"Step {i+1}"),
                description=step.get("description", ""),
                duration=step.get("duration", f"Week {i+1}"),
                status=step.get("status", "upcoming"),
            ))

        # ── Parse the skill gap analysis ──
        skill_gaps: list[SkillGap] = []
        for gap in data.get("skillGaps", []):
            level = max(5, min(95, int(gap.get("level", 30))))
            target = max(level + 10, min(95, int(gap.get("target", 80))))
            skill_gaps.append(SkillGap(
                skill=gap.get("skill", "Unknown Skill"),
                level=level,
                target=target,
            ))

        if not roadmap or not skill_gaps:
            raise ValueError("Gemini returned empty roadmap or skill gaps")

        log.info("✅ Gemini generated roadmap: %d steps, %d skill gaps", len(roadmap), len(skill_gaps))
        return roadmap, skill_gaps, "gemini"

    except Exception as exc:
        log.warning("⚠️ Gemini roadmap generation failed (%s), using mock fallback", exc)
        r, g = generate_dynamic_roadmap(candidate)
        return r, g, "mock"


# ─────────────────────────────────────────────────────────────
#  Section 8 — Session & Action-Item Generators
# ─────────────────────────────────────────────────────────────
#  When a candidate checks out with a mentor, we auto-generate
#  a series of weekly sessions and domain-specific action items
#  so they have a concrete plan from day one.
# ─────────────────────────────────────────────────────────────

def _generate_sessions(mentor_name: str, target_role: str, domain: str) -> list[Session]:
    """
    Generate 8 personalised mentoring sessions with dates relative to today.

    Sessions are spaced one week apart, alternating between morning
    and afternoon time slots.
    """
    today = datetime.now()
    titles = [
        f"Kickoff & {domain.title()} Assessment",
        f"Deep Dive: Core {domain.title()} Skills",
        "Portfolio Review & Feedback",
        f"Mock Interview #1 — {target_role}",
        f"Advanced {domain.title()} Practice",
        "Behavioral Interview Prep",
        f"Mock Interview #2 — {target_role}",
        "Career Launch & Next Steps",
    ]

    sessions = []
    for i, title in enumerate(titles):
        session_date = today + timedelta(days=7 + i * 7)
        sessions.append(Session(
            id=f"s-{_uid()}",
            title=title,
            date=session_date.strftime("%Y-%m-%d"),
            time="10:00 AM" if i % 2 == 0 else "2:00 PM",
            status="upcoming",
            mentor=mentor_name,
        ))

    return sessions


def _generate_action_items(domain: str) -> list[ActionItem]:
    """
    Generate a set of domain-specific homework tasks for the candidate.

    Each item has a staggered due date (5 days apart) starting one
    week from today.
    """
    today = datetime.now()

    domain_items: dict[str, list[str]] = {
        "software engineering": [
            "Complete 10 LeetCode medium problems",
            "Read 'Designing Data-Intensive Applications' Ch. 1-3",
            "Build a REST API with proper error handling",
            "Write a system design document for a chat app",
            "Update LinkedIn with recent project work",
        ],
        "frontend": [
            "Build a responsive dashboard with React + Tailwind",
            "Implement a complex form with validation",
            "Create an accessible component library",
            "Optimize an app for Core Web Vitals",
            "Write unit tests for 3 components",
        ],
        "backend": [
            "Design a RESTful API with OpenAPI spec",
            "Implement authentication with JWT",
            "Set up a CI/CD pipeline",
            "Write database migration scripts",
            "Build a rate-limited API endpoint",
        ],
        "data science": [
            "Complete a Kaggle competition notebook",
            "Build an end-to-end ML pipeline",
            "Create a data visualization dashboard",
            "Write SQL queries for complex analytics",
            "Document a model's performance metrics",
        ],
        "product management": [
            "Write a PRD for a feature",
            "Conduct 3 user interviews",
            "Create a competitive analysis doc",
            "Build a metrics dashboard mock",
            "Present a product roadmap to peers",
        ],
        "design": [
            "Complete a design challenge (48h)",
            "Create a design system in Figma",
            "Conduct a usability test with 3 users",
            "Redesign a popular app's checkout flow",
            "Build a portfolio case study",
        ],
    }

    items = domain_items.get(domain, domain_items["software engineering"])
    return [
        ActionItem(
            id=f"a-{_uid()}",
            title=item,
            completed=False,
            due_date=(today + timedelta(days=7 + i * 5)).strftime("%Y-%m-%d"),
        )
        for i, item in enumerate(items)
    ]


# ─────────────────────────────────────────────────────────────
#  Section 9 — Database Seeding
# ─────────────────────────────────────────────────────────────
#  Populates the database with demo data on first startup so
#  the platform is immediately usable for development and
#  demos. Only runs when the `users` collection is empty.
# ─────────────────────────────────────────────────────────────

async def _seed():
    """
    Insert demo accounts, mentors, a sample candidate with a full
    roadmap, mentorship requests, pending verifications, and
    activity log entries.
    """

    # ── 1. Demo user accounts (one of each role) ──
    accounts = [
        ("u-candidate", "candidate@guided.dev", "Arjun Mehta",    "candidate", True),
        ("u-mentor",    "mentor@guided.dev",    "Ananya Iyer",    "mentor",    True),
        ("u-admin",     "admin@guided.dev",     "Platform Admin", "admin",     True),
    ]
    user_docs = []
    for uid, email, name, role, verified in accounts:
        user_docs.append({
            "_id": uid,
            "email": email,
            "name": name,
            "password_hash": _hash("password"),
            "role": role,
            "verified": verified,
            "linkedin_url": "",
            "created_at": "2026-01-15",
        })
    await db.users.insert_many(user_docs)

    # ── 2. Mentor profiles (the marketplace catalogue) ──
    mentor_seed = [
        ("m1", "Ananya Iyer",   "Senior Software Engineer", "Google",    "AI", 8,
         "Software Engineering", 6000.0, True,  4.9, 142,
         "Passionate about helping engineers level up their system design and coding interview skills.",
         "u-mentor"),
        ("m2", "Vikram Desai",  "Product Manager",          "Flipkart",  "VD", 6,
         "Product Management",   7000.0, True,  4.8, 98,
         "Former founder turned PM. I help candidates break into top product roles.", ""),
        ("m3", "Priya Sharma",  "Data Scientist",           "Infosys",   "PS", 5,
         "Data Science",         5000.0, False, 4.7, 67,
         "Specialized in ML interviews and portfolio building for aspiring data scientists.", ""),
        ("m4", "Rajesh Nair",   "Engineering Manager",      "Amazon",    "RN", 10,
         "Software Engineering", 10000.0, True, 5.0, 203,
         "I coach engineers on the path to staff+ and management roles at top companies.", ""),
        ("m5", "Kavya Reddy",   "UX Design Lead",           "Zoho",      "KR", 7,
         "Design",               5500.0, True,  4.9, 115,
         "Helping designers build world-class portfolios and ace design challenges.", ""),
        ("m6", "Arun Kapoor",   "Staff Engineer",           "Razorpay",  "AK", 12,
         "Software Engineering", 12000.0, True, 4.8, 89,
         "Deep expertise in distributed systems. I help engineers think at scale.", ""),
    ]
    mentor_docs = []
    for mid, name, role, company, av, exp, dom, price, avail, rating, sess, bio, uid in mentor_seed:
        mentor_docs.append({
            "_id": mid, "name": name, "role": role, "company": company,
            "avatar": av, "experience": exp, "domain": dom,
            "price_per_session": price, "available": avail,
            "rating": rating, "sessions": sess, "bio": bio,
            "verified": True, "user_id": uid,
        })
    await db.mentors.insert_many(mentor_docs)

    # ── 3. Demo candidate with a full workflow already in progress ──
    demo = Candidate(
        id="u-candidate",
        career_goal="Break into top tech companies as a frontend engineer",
        target_role="Senior Frontend Engineer",
        target_company="Google",
        skill_level="intermediate",
        experience_level="3-5",
        resume_uploaded=True,
        name="Arjun Mehta",
        email="candidate@guided.dev",
        status="mentorship_active",
        roadmap_generated=True,
        mentor_id="m1",
    )

    # Generate and partially complete the roadmap
    demo.roadmap, demo.skill_gaps = generate_dynamic_roadmap(demo)
    if len(demo.roadmap) >= 2:
        demo.roadmap[0].status = "completed"
        demo.roadmap[1].status = "current"

    # Generate sessions and mark the first two as completed
    demo.sessions = _generate_sessions("Ananya Iyer", "Senior Frontend Engineer", "frontend")
    if len(demo.sessions) >= 2:
        demo.sessions[0].status = "completed"
        demo.sessions[0].notes = "Defined 12-week goals. Identified key skill gaps in system design."
        demo.sessions[1].status = "completed"
        demo.sessions[1].notes = "Covered component architecture. Need to practice hooks patterns."

    # Generate action items and mark the first two as done
    demo.action_items = _generate_action_items("frontend")
    if len(demo.action_items) >= 2:
        demo.action_items[0].completed = True
        demo.action_items[1].completed = True

    await db.candidates.insert_one(_to_doc(demo))

    # ── 4. Mentorship requests (one accepted, two pending) ──
    request_docs = [
        {
            "_id": "req1",
            "candidate_name": "Arjun Mehta",
            "candidate_goal": "Break into top tech companies as a frontend engineer",
            "experience": "3-5 years",
            "status": "accepted",
            "submitted_at": "2026-02-01",
            "candidate_id": "u-candidate",
            "mentor_id": "m1",
        },
        {
            "_id": "req2",
            "candidate_name": "Sneha Patel",
            "candidate_goal": "Transition from backend to full-stack",
            "experience": "4 years",
            "status": "pending",
            "submitted_at": "2026-02-07",
            "candidate_id": "",
            "mentor_id": "m1",
        },
        {
            "_id": "req3",
            "candidate_name": "Rohan Joshi",
            "candidate_goal": "Land first data science role",
            "experience": "Bootcamp grad",
            "status": "pending",
            "submitted_at": "2026-02-05",
            "candidate_id": "",
            "mentor_id": "m1",
        },
    ]
    await db.mentor_requests.insert_many(request_docs)

    # ── 5. Pending mentor verifications awaiting admin approval ──
    verif_docs = [
        {
            "_id": "v1",
            "name": "Meera Kulkarni",
            "role": "Senior PM at Flipkart",
            "experience": 7,
            "submitted_at": "2026-02-08",
            "linkedin_url": "https://linkedin.com/in/meerakulkarni",
            "user_id": "",
        },
        {
            "_id": "v2",
            "name": "Siddharth Rao",
            "role": "Staff Engineer at Ola",
            "experience": 9,
            "submitted_at": "2026-02-07",
            "linkedin_url": "https://linkedin.com/in/siddharthrao",
            "user_id": "",
        },
    ]
    await db.pending_verifications.insert_many(verif_docs)

    # ── 6. Seed the activity feed with some initial entries ──
    await _activity("Arjun Mehta completed session with Ananya Iyer", "session")
    await _activity("New mentor application: Arun Kapoor (Razorpay)", "signup")
    await _activity("Payment processed: \u20b954,000 for 8-session package", "payment")


# ─────────────────────────────────────────────────────────────
#  Section 10 — Application Startup & Shutdown
# ─────────────────────────────────────────────────────────────
#  The lifespan context manager creates indexes on startup,
#  seeds the database if it's empty, and cleanly closes the
#  MongoDB connection on shutdown.
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Manage the application lifecycle — startup setup and graceful shutdown."""

    # Create indexes for frequently queried fields
    await db.users.create_index("email", unique=True)
    await db.mentors.create_index("user_id")
    await db.mentor_requests.create_index("mentor_id")
    await db.candidates.create_index("mentor_id")

    # Populate the database with demo data if this is the first run
    if await db.users.count_documents({}) == 0:
        await _seed()
        print("✅ Database seeded with demo data")
    else:
        print(f"✅ MongoDB connected — {await db.users.count_documents({})} users found")

    yield  # Application is running

    mongo.close()


# ─────────────────────────────────────────────────────────────
#  Section 11 — FastAPI App & Middleware
# ─────────────────────────────────────────────────────────────

app = FastAPI(title="GUIDED API", version="4.0.0", lifespan=lifespan)

# Allow all origins for development — tighten this in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════
#
#   API ROUTES
#
#   Organised by user role:
#     • Auth        — registration, login, session info
#     • Candidate   — onboarding, roadmaps, sessions, actions
#     • Mentor      — dashboard, requests, verification
#     • Admin       — platform management, analytics, monitoring
#
# ═══════════════════════════════════════════════════════════════


# ─────────────────────────────────────────────────────────────
#  Auth Endpoints
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Health-check endpoint — confirms the backend is running."""
    return {"status": "GUIDED backend running", "version": "4.0.0", "database": "MongoDB"}


@app.post("/auth/signup")
async def signup(body: SignupBody):
    """
    Register a new user account.

    - Candidates get an empty candidate profile created automatically.
    - Mentors are added to the pending-verification queue.
    - Returns a JWT token so the user is logged in immediately.
    """
    if body.role not in ("candidate", "mentor", "admin"):
        raise HTTPException(400, "Invalid role")

    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(409, "Email already registered")

    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    uid = f"u-{_uid()}"
    is_verified = body.role != "mentor"  # Mentors need admin approval first

    await db.users.insert_one({
        "_id": uid,
        "email": body.email,
        "name": body.name,
        "password_hash": _hash(body.password),
        "role": body.role,
        "verified": is_verified,
        "linkedin_url": body.linkedin_url,
        "created_at": datetime.now().strftime("%Y-%m-%d"),
    })

    # Mentor-specific: create a pending verification record for the admin to review
    if body.role == "mentor":
        await db.pending_verifications.insert_one({
            "_id": uid,
            "name": body.name,
            "role": body.linkedin_url or "Pending verification",
            "experience": 0,
            "submitted_at": datetime.now().strftime("%Y-%m-%d"),
            "linkedin_url": body.linkedin_url,
            "user_id": uid,
        })
        await _activity(f"New mentor application: {body.name}", "signup")

    # Candidate-specific: create an empty candidate profile ready for onboarding
    if body.role == "candidate":
        await db.candidates.insert_one({
            "_id": uid,
            "name": body.name,
            "email": body.email,
            "status": "registered",
            "career_goal": "",
            "target_role": "",
            "target_company": "",
            "skill_level": "",
            "experience_level": "",
            "resume_uploaded": False,
            "roadmap_generated": False,
            "roadmap": [],
            "skill_gaps": [],
            "sessions": [],
            "action_items": [],
            "mentor_id": None,
        })

    token = create_jwt({
        "userId": uid,
        "email": body.email,
        "role": body.role,
        "name": body.name,
        "verified": is_verified,
    })

    return {
        "message": "Account created",
        "token": token,
        "user": {
            "id": uid,
            "email": body.email,
            "name": body.name,
            "role": body.role,
            "verified": is_verified,
        },
    }


@app.post("/auth/login")
async def login(body: LoginBody):
    """
    Authenticate a user with email and password.

    Returns a JWT token and the user's profile on success.
    """
    user_doc = await db.users.find_one({"email": body.email})
    if not user_doc:
        raise HTTPException(401, "Invalid email or password")

    if user_doc["password_hash"] != _hash(body.password):
        raise HTTPException(401, "Invalid email or password")

    token = create_jwt({
        "userId": user_doc["_id"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "name": user_doc["name"],
        "verified": user_doc["verified"],
    })

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user_doc["_id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "role": user_doc["role"],
            "verified": user_doc["verified"],
        },
    }


@app.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile details."""
    db_user = await db.users.find_one({"_id": user.get("userId")})
    verified = db_user["verified"] if db_user else user.get("verified", True)

    return {
        "id": user.get("userId"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role"),
        "verified": verified,
    }


# ─────────────────────────────────────────────────────────────
#  Candidate Endpoints — Status & Onboarding
# ─────────────────────────────────────────────────────────────

@app.get("/candidate/status")
async def candidate_status(user: dict = Depends(require_role("candidate"))):
    """
    Check where the candidate is in the workflow.

    Used by the frontend to decide which screen to show:
    onboarding, roadmap, mentor selection, or dashboard.
    """
    uid = user.get("userId", "")
    doc = await db.candidates.find_one({"_id": uid})

    if not doc:
        return {
            "status": "registered",
            "hasOnboarded": False,
            "hasMentor": False,
            "hasRoadmap": False,
        }

    return {
        "status": doc["status"],
        "hasOnboarded": doc["status"] != "registered",
        "hasMentor": doc.get("mentor_id") is not None,
        "hasRoadmap": doc.get("roadmap_generated", False),
        "candidateId": doc["_id"],
    }


@app.post("/candidate/onboarding")
async def candidate_onboarding(payload: CandidateCreate, user: dict = Depends(require_role("candidate"))):
    """
    Save the candidate's career goals and skill profile.

    This is the first step after registration. If the candidate
    already exists, their profile is updated; otherwise a new
    profile is created.
    """
    uid = user.get("userId", f"cand-{_uid()}")
    existing = await db.candidates.find_one({"_id": uid})

    if existing:
        # Update the existing profile with the new onboarding data
        await db.candidates.update_one({"_id": uid}, {"$set": {
            "career_goal": payload.career_goal,
            "target_role": payload.target_role,
            "target_company": payload.target_company,
            "skill_level": payload.skill_level,
            "experience_level": payload.experience_level,
            "resume_uploaded": payload.resume_uploaded,
            "status": "onboarded",
        }})
    else:
        # Create a brand-new candidate profile
        await db.candidates.insert_one({
            "_id": uid,
            "career_goal": payload.career_goal,
            "target_role": payload.target_role,
            "target_company": payload.target_company,
            "skill_level": payload.skill_level,
            "experience_level": payload.experience_level,
            "resume_uploaded": payload.resume_uploaded,
            "name": payload.name or user.get("name", ""),
            "email": payload.email or user.get("email", ""),
            "status": "onboarded",
            "roadmap_generated": False,
            "roadmap": [],
            "skill_gaps": [],
            "sessions": [],
            "action_items": [],
            "mentor_id": None,
        })

    candidate_doc = await db.candidates.find_one({"_id": uid})
    candidate = Candidate(**_from_doc(candidate_doc))
    await _activity(f"{candidate.name or 'Candidate'} completed onboarding", "signup")

    return {
        "message": "Onboarding complete",
        "candidateId": uid,
        "candidate": candidate.model_dump(by_alias=True),
    }


# ─────────────────────────────────────────────────────────────
#  Candidate Endpoints — Roadmap Generation
# ─────────────────────────────────────────────────────────────

@app.post("/candidate/generate-roadmap")
async def generate_roadmap_endpoint(payload: RoadmapRequestBody, user: dict = Depends(require_role("candidate"))):
    """
    Generate a personalised career roadmap for the candidate.

    Uses Google Gemini if available, otherwise falls back to
    template-based generation. Skips generation if a roadmap
    already exists (use /regenerate-roadmap to force a refresh).
    """
    uid = user.get("userId", "")
    if payload.candidate_id != uid:
        raise HTTPException(403, "You can only generate your own roadmap")

    doc = await db.candidates.find_one({"_id": payload.candidate_id})
    if not doc:
        raise HTTPException(404, "Candidate not found")

    candidate = Candidate(**_from_doc(doc))

    # Only generate if no roadmap exists yet — prevents accidental overwrites
    if not candidate.roadmap_generated:
        roadmap, skill_gaps, source = await generate_roadmap_with_gemini(candidate)
        candidate.roadmap = roadmap
        candidate.skill_gaps = skill_gaps
        candidate.roadmap_generated = True
        candidate.generated_by = source
        candidate.status = "roadmap_generated"
        await db.candidates.replace_one({"_id": uid}, _to_doc(candidate))

    domain = _detect_domain(candidate.target_role, candidate.career_goal)

    # Timeline estimate based on skill level
    if candidate.skill_level == "advanced":
        timeline = "8 weeks"
    elif candidate.skill_level == "beginner":
        timeline = "16 weeks"
    else:
        timeline = "12 weeks"

    return {
        "message": "Roadmap generated",
        "candidateId": candidate.id,
        "targetRole": candidate.target_role,
        "targetCompany": candidate.target_company or "Top Companies",
        "skillLevel": candidate.skill_level,
        "timeline": timeline,
        "domain": domain,
        "generatedBy": candidate.generated_by or "mock",
        "roadmap": [s.model_dump(by_alias=True) for s in candidate.roadmap],
        "skillGaps": [g.model_dump(by_alias=True) for g in candidate.skill_gaps],
    }


@app.post("/candidate/regenerate-roadmap")
async def regenerate_roadmap_endpoint(payload: RoadmapRequestBody, user: dict = Depends(require_role("candidate"))):
    """
    Force-regenerate the roadmap with Gemini, replacing any existing one.

    Useful when the candidate has updated their profile or wants
    a fresh perspective from the AI.
    """
    uid = user.get("userId", "")
    if payload.candidate_id != uid:
        raise HTTPException(403, "You can only regenerate your own roadmap")

    doc = await db.candidates.find_one({"_id": payload.candidate_id})
    if not doc:
        raise HTTPException(404, "Candidate not found")

    candidate = Candidate(**_from_doc(doc))

    # Always regenerate, regardless of whether one already exists
    roadmap, skill_gaps, source = await generate_roadmap_with_gemini(candidate)
    candidate.roadmap = roadmap
    candidate.skill_gaps = skill_gaps
    candidate.roadmap_generated = True
    candidate.generated_by = source
    candidate.status = "roadmap_generated"
    await db.candidates.replace_one({"_id": uid}, _to_doc(candidate))

    domain = _detect_domain(candidate.target_role, candidate.career_goal)

    if candidate.skill_level == "advanced":
        timeline = "8 weeks"
    elif candidate.skill_level == "beginner":
        timeline = "16 weeks"
    else:
        timeline = "12 weeks"

    return {
        "message": "Roadmap regenerated",
        "candidateId": candidate.id,
        "targetRole": candidate.target_role,
        "targetCompany": candidate.target_company or "Top Companies",
        "skillLevel": candidate.skill_level,
        "timeline": timeline,
        "domain": domain,
        "generatedBy": source,
        "roadmap": [s.model_dump(by_alias=True) for s in candidate.roadmap],
        "skillGaps": [g.model_dump(by_alias=True) for g in candidate.skill_gaps],
    }


# ─────────────────────────────────────────────────────────────
#  Candidate Endpoints — Mentor Discovery & Checkout
# ─────────────────────────────────────────────────────────────

@app.get("/mentors")
async def list_mentors(
    search: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    price: Optional[str] = Query(None),
    experience: Optional[str] = Query(None),
    user: dict = Depends(require_role("candidate", "admin")),
):
    """
    Search and filter the verified mentor catalogue.

    Supports filtering by domain, price range, and experience level,
    plus a free-text search across name, role, company, and domain.
    """
    query: dict = {"verified": True}

    # Free-text search across multiple fields
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [{"name": regex}, {"role": regex}, {"company": regex}, {"domain": regex}]

    # Domain filter
    if domain and domain != "all":
        query["domain"] = domain

    # Price range filter
    if price and price != "all":
        if price == "under-6000":
            query["price_per_session"] = {"$lt": 6000}
        elif price == "6000-10000":
            query["price_per_session"] = {"$gte": 6000, "$lte": 10000}
        elif price == "over-10000":
            query["price_per_session"] = {"$gt": 10000}

    # Experience filter
    if experience and experience != "all":
        if experience == "5+":
            query["experience"] = {"$gte": 5}
        elif experience == "8+":
            query["experience"] = {"$gte": 8}
        elif experience == "10+":
            query["experience"] = {"$gte": 10}

    docs = await db.mentors.find(query).to_list(length=100)
    mentors = [Mentor(**_from_doc(d)).model_dump(by_alias=True) for d in docs]

    return {"mentors": mentors, "total": len(mentors)}


@app.get("/mentors/{mentor_id}")
async def get_mentor(mentor_id: str, user: dict = Depends(require_role("candidate", "admin", "mentor"))):
    """Retrieve a single mentor's full profile by ID."""
    doc = await db.mentors.find_one({"_id": mentor_id})
    if not doc:
        raise HTTPException(404, "Mentor not found")
    return Mentor(**_from_doc(doc)).model_dump(by_alias=True)


@app.post("/candidate/checkout")
async def candidate_checkout(payload: CheckoutRequestBody, user: dict = Depends(require_role("candidate"))):
    """
    Finalise mentor selection and start the mentorship.

    This endpoint:
      1. Validates the mentor is available
      2. Generates sessions, action items, and a roadmap (if missing)
      3. Creates a mentorship request record
      4. Calculates pricing (subtotal + 10% platform fee)
      5. Returns the full session schedule and pricing breakdown
    """
    uid = user.get("userId", "")

    # Validate the mentor exists and is accepting new mentees
    mentor_doc = await db.mentors.find_one({"_id": payload.mentor_id})
    if not mentor_doc:
        raise HTTPException(404, "Mentor not found")
    mentor = Mentor(**_from_doc(mentor_doc))
    if not mentor.available:
        raise HTTPException(400, "This mentor is not currently available")

    # Validate the candidate profile
    candidate_id = payload.candidate_id or uid
    cand_doc = await db.candidates.find_one({"_id": candidate_id})
    if not cand_doc:
        raise HTTPException(404, "Candidate not found. Complete onboarding first.")
    if candidate_id != uid:
        raise HTTPException(403, "You can only checkout for yourself")

    candidate = Candidate(**_from_doc(cand_doc))

    # Calculate pricing for an 8-session package
    sessions_count = 8
    subtotal = mentor.price_per_session * sessions_count
    platform_fee = round(subtotal * 0.1)
    total = subtotal + platform_fee

    domain = _detect_domain(candidate.target_role, candidate.career_goal)

    # Auto-generate sessions if none exist yet
    if not candidate.sessions:
        new_sessions = _generate_sessions(mentor.name, candidate.target_role, domain)
        candidate.sessions = new_sessions
    else:
        new_sessions = candidate.sessions

    # Auto-generate action items if none exist yet
    if not candidate.action_items:
        candidate.action_items = _generate_action_items(domain)

    # Link the candidate to their chosen mentor
    candidate.mentor_id = mentor.id
    candidate.status = "mentorship_active"

    # Generate a roadmap if the candidate doesn't have one yet
    if not candidate.roadmap_generated:
        candidate.roadmap, candidate.skill_gaps = generate_dynamic_roadmap(candidate)
        candidate.roadmap_generated = True

    # Persist all changes to the candidate profile
    await db.candidates.replace_one({"_id": candidate_id}, _to_doc(candidate))

    # Create a mentor request so the mentor can see this in their dashboard
    await db.mentor_requests.insert_one({
        "_id": f"req-{_uid()}",
        "candidate_name": candidate.name or user.get("name", ""),
        "candidate_goal": candidate.career_goal,
        "experience": candidate.experience_level,
        "status": "pending",
        "submitted_at": datetime.now().strftime("%Y-%m-%d"),
        "candidate_id": candidate_id,
        "mentor_id": payload.mentor_id,
    })

    # Update the mentor's total session count
    await db.mentors.update_one({"_id": mentor.id}, {"$inc": {"sessions": sessions_count}})

    await _activity(
        f"Payment: ${total} — {candidate.name} x {mentor.name} ({sessions_count} sessions)",
        "payment",
    )

    return {
        "message": "Mentorship confirmed",
        "mentorId": mentor.id,
        "mentorName": mentor.name,
        "sessionsCount": sessions_count,
        "subtotal": subtotal,
        "platformFee": platform_fee,
        "total": total,
        "sessions": [s.model_dump(by_alias=True) for s in new_sessions],
    }


@app.post("/candidate/request-mentor")
async def request_mentor(payload: CheckoutRequestBody, user: dict = Depends(require_role("candidate"))):
    """Alias for /candidate/checkout — kept for backward compatibility."""
    return await candidate_checkout(payload, user)


# ─────────────────────────────────────────────────────────────
#  Candidate Endpoints — Workflow & Progress Tracking
# ─────────────────────────────────────────────────────────────

@app.get("/candidate/workflow/{candidate_id}")
async def candidate_workflow(candidate_id: str, user: dict = Depends(require_role("candidate", "admin"))):
    """
    Get the candidate's full workflow: sessions, roadmap, action items,
    progress stats, and next-session information.

    This powers the main candidate dashboard view.
    """
    if user.get("role") == "candidate" and user.get("userId") != candidate_id:
        raise HTTPException(403, "You can only view your own workflow")

    doc = await db.candidates.find_one({"_id": candidate_id})
    if not doc:
        raise HTTPException(404, "Candidate not found")

    candidate = Candidate(**_from_doc(doc))

    # Look up the mentor's name for display
    mentor_name = ""
    if candidate.mentor_id:
        mentor_doc = await db.mentors.find_one({"_id": candidate.mentor_id})
        if mentor_doc:
            mentor_name = mentor_doc["name"]

    today = datetime.now()

    # Split sessions into completed and upcoming
    completed_sessions = [s for s in candidate.sessions if s.status == "completed"]
    upcoming = [s for s in candidate.sessions if s.status == "upcoming"]

    # Find the next upcoming session and compute a human-friendly relative label
    next_session = None
    if upcoming:
        ns = upcoming[0]
        try:
            sd = datetime.strptime(ns.date, "%Y-%m-%d")
            diff = (sd - today).days
            if diff == 0:
                relative = "Today"
            elif diff == 1:
                relative = "Tomorrow"
            elif diff < 7:
                relative = f"In {diff} days"
            elif diff < 14:
                relative = "Next week"
            else:
                relative = f"In {diff // 7} weeks"
        except Exception:
            relative = ""
        next_session = {
            "date": ns.date,
            "time": ns.time,
            "title": ns.title,
            "relative": relative,
            "id": ns.id,
        }

    # Calculate an overall progress percentage (weighted average)
    total_sessions = len(candidate.sessions) or 1
    total_actions = len(candidate.action_items) or 1
    total_roadmap_steps = len(candidate.roadmap) or 1

    sess_pct = len(completed_sessions) / total_sessions
    action_pct = sum(1 for a in candidate.action_items if a.completed) / total_actions
    roadmap_pct = sum(1 for r in candidate.roadmap if r.status == "completed") / total_roadmap_steps

    overall_progress = round((sess_pct * 0.4 + action_pct * 0.3 + roadmap_pct * 0.3) * 100)

    # Enrich each session with a relative date label (e.g. "In 3 days", "2 weeks ago")
    sessions_out = []
    for s in candidate.sessions:
        d = s.model_dump(by_alias=True)
        try:
            sd = datetime.strptime(s.date, "%Y-%m-%d")
            diff = (sd - today).days
            if s.status == "completed":
                if diff >= 0:
                    d["relative"] = "Completed"
                elif abs(diff) < 7:
                    d["relative"] = f"{abs(diff)} days ago"
                else:
                    d["relative"] = f"{abs(diff) // 7} weeks ago"
            else:
                if diff == 0:
                    d["relative"] = "Today"
                elif diff == 1:
                    d["relative"] = "Tomorrow"
                elif diff < 7:
                    d["relative"] = f"In {diff} days"
                elif diff < 14:
                    d["relative"] = "Next week"
                else:
                    d["relative"] = f"In {diff // 7} weeks"
        except Exception:
            d["relative"] = ""
        sessions_out.append(d)

    return {
        "candidateId": candidate.id,
        "mentorName": mentor_name,
        "status": candidate.status,
        "sessions": sessions_out,
        "actionItems": [a.model_dump(by_alias=True) for a in candidate.action_items],
        "roadmap": [r.model_dump(by_alias=True) for r in candidate.roadmap],
        "nextSession": next_session,
        "overallProgress": overall_progress,
        "stats": {
            "completedSessions": len(completed_sessions),
            "totalSessions": len(candidate.sessions),
            "completedActions": sum(1 for a in candidate.action_items if a.completed),
            "totalActions": len(candidate.action_items),
            "completedSteps": sum(1 for r in candidate.roadmap if r.status == "completed"),
            "totalSteps": len(candidate.roadmap),
        },
    }


@app.get("/candidate/{candidate_id}")
async def get_candidate(candidate_id: str, user: dict = Depends(require_role("candidate", "admin"))):
    """Retrieve a candidate's full profile by ID."""
    if user.get("role") == "candidate" and user.get("userId") != candidate_id:
        raise HTTPException(403, "Access denied")
    doc = await db.candidates.find_one({"_id": candidate_id})
    if not doc:
        raise HTTPException(404, "Candidate not found")
    return Candidate(**_from_doc(doc)).model_dump(by_alias=True)


# ─────────────────────────────────────────────────────────────
#  Candidate Endpoints — Action Items & Session Completion
# ─────────────────────────────────────────────────────────────

@app.post("/candidate/toggle-action")
async def toggle_action_item(payload: ToggleActionItemBody, user: dict = Depends(require_role("candidate"))):
    """Mark a candidate's action item as completed or not completed."""
    uid = user.get("userId", "")
    if payload.candidate_id != uid:
        raise HTTPException(403, "Access denied")

    doc = await db.candidates.find_one({"_id": uid})
    if not doc:
        raise HTTPException(404, "Candidate not found")

    candidate = Candidate(**_from_doc(doc))
    item = next((a for a in candidate.action_items if a.id == payload.action_item_id), None)
    if not item:
        raise HTTPException(404, "Action item not found")

    item.completed = payload.completed
    await db.candidates.replace_one({"_id": uid}, _to_doc(candidate))

    completed_count = sum(1 for a in candidate.action_items if a.completed)
    return {
        "message": "Updated",
        "actionItemId": item.id,
        "completed": item.completed,
        "completedCount": completed_count,
        "totalCount": len(candidate.action_items),
    }


@app.post("/candidate/complete-session")
async def complete_session(payload: CompleteSessionBody, user: dict = Depends(require_role("candidate"))):
    """
    Mark a mentoring session as completed and optionally add notes.

    Also auto-advances the roadmap progress: as more sessions are
    completed, earlier roadmap steps are marked as done.
    """
    uid = user.get("userId", "")
    doc = await db.candidates.find_one({"_id": uid})
    if not doc:
        raise HTTPException(404, "Candidate not found")

    candidate = Candidate(**_from_doc(doc))
    session = next((s for s in candidate.sessions if s.id == payload.session_id), None)
    if not session:
        raise HTTPException(404, "Session not found")

    session.status = "completed"
    if payload.notes:
        session.notes = payload.notes

    completed = sum(1 for s in candidate.sessions if s.status == "completed")
    total = len(candidate.sessions)

    # Auto-advance roadmap steps proportionally to session completion
    roadmap_len = len(candidate.roadmap)
    if roadmap_len > 0:
        steps_to_complete = min(roadmap_len, completed * roadmap_len // total)
        for i in range(roadmap_len):
            if i < steps_to_complete:
                candidate.roadmap[i].status = "completed"
            elif i == steps_to_complete:
                candidate.roadmap[i].status = "current"
            else:
                candidate.roadmap[i].status = "upcoming"

    await db.candidates.replace_one({"_id": uid}, _to_doc(candidate))
    await _activity(f"{candidate.name} completed session: {session.title}", "session")

    return {
        "message": "Session completed",
        "sessionId": session.id,
        "completedSessions": completed,
        "totalSessions": total,
    }


# ─────────────────────────────────────────────────────────────
#  Mentor Endpoints — Dashboard & Mentee Management
# ─────────────────────────────────────────────────────────────

@app.get("/mentor/dashboard")
async def mentor_dashboard(user: dict = Depends(require_role("mentor"))):
    """
    Retrieve the mentor's personalised dashboard.

    Includes: stats (active mentees, earnings, rating), upcoming
    sessions, recent mentees with progress, and pending requests.
    """
    uid = user.get("userId", "")
    mentor_doc = await db.mentors.find_one({"user_id": uid})

    # Return an empty dashboard if the user doesn't have a mentor profile yet
    if not mentor_doc:
        return {
            "mentorId": "",
            "mentorName": user.get("name", ""),
            "mentorStats": {
                "activeMentees": 0,
                "completedSessions": 0,
                "upcomingSessions": 0,
                "rating": 0,
                "earnings": 0,
                "responseRate": 100,
            },
            "upcomingSessions": [],
            "recentMentees": [],
            "mentorRequests": [],
        }

    mentor = Mentor(**_from_doc(mentor_doc))
    mentor_id = mentor.id

    # Fetch all mentorship requests for this mentor
    request_docs = await db.mentor_requests.find({"mentor_id": mentor_id}).to_list(length=100)
    requests = [MentorRequest(**_from_doc(r)) for r in request_docs]
    accepted_requests = [r for r in requests if r.status == "accepted"]

    # Collect all mentee IDs from accepted requests AND direct assignments
    mentee_ids = set()
    for req in accepted_requests:
        if req.candidate_id:
            mentee_ids.add(req.candidate_id)

    direct_docs = await db.candidates.find({"mentor_id": mentor_id}).to_list(length=100)
    for d in direct_docs:
        mentee_ids.add(d["_id"])

    # Load all mentee candidate profiles
    mentee_candidates = []
    if mentee_ids:
        mentee_docs = await db.candidates.find({"_id": {"$in": list(mentee_ids)}}).to_list(length=100)
        mentee_candidates = [Candidate(**_from_doc(m)) for m in mentee_docs]

    # Gather upcoming sessions across all mentees
    all_upcoming = []
    for c in mentee_candidates:
        for s in c.sessions:
            if s.status == "upcoming":
                all_upcoming.append({
                    "id": s.id,
                    "mentee": c.name,
                    "topic": s.title,
                    "date": s.date,
                    "time": s.time,
                })
    all_upcoming.sort(key=lambda x: x["date"])

    # Build mentee summary cards with progress percentages
    recent_mentees = []
    for c in mentee_candidates:
        total_sess = len(c.sessions) or 8
        completed_sess = len([s for s in c.sessions if s.status == "completed"])
        progress = round((completed_sess / total_sess) * 100) if total_sess > 0 else 0
        recent_mentees.append({
            "id": c.id,
            "name": c.name,
            "goal": c.career_goal or c.target_role,
            "progress": progress,
            "sessionsCompleted": completed_sess,
            "totalSessions": total_sess,
        })

    # Calculate earnings and performance metrics
    earnings = len(accepted_requests) * mentor.price_per_session * 8

    completed_sessions = sum(
        len([s for s in c.sessions if s.status == "completed"])
        for c in mentee_candidates
    )

    total_requests = len(requests)
    responded = len([r for r in requests if r.status != "pending"])
    response_rate = round((responded / total_requests) * 100) if total_requests > 0 else 100

    stats = {
        "activeMentees": len(mentee_candidates),
        "completedSessions": completed_sessions + mentor.sessions,
        "upcomingSessions": len(all_upcoming),
        "rating": mentor.rating,
        "earnings": earnings,
        "responseRate": response_rate,
    }

    return {
        "mentorId": mentor_id,
        "mentorName": mentor.name,
        "mentorStats": stats,
        "upcomingSessions": all_upcoming[:5],
        "recentMentees": recent_mentees,
        "mentorRequests": [r.model_dump(by_alias=True) for r in requests],
    }


@app.get("/mentor/dashboard/{mentor_id}")
async def mentor_dashboard_by_id(mentor_id: str, user: dict = Depends(require_role("mentor", "admin"))):
    """Retrieve a mentor's dashboard by their mentor ID (alias route)."""
    return await mentor_dashboard(user)


@app.get("/mentor/requests")
async def mentor_requests_endpoint(user: dict = Depends(require_role("mentor"))):
    """List all mentorship requests addressed to the current mentor."""
    uid = user.get("userId", "")
    mentor_doc = await db.mentors.find_one({"user_id": uid})
    mentor_id = mentor_doc["_id"] if mentor_doc else ""

    request_docs = await db.mentor_requests.find({"mentor_id": mentor_id}).to_list(length=100)
    requests = [MentorRequest(**_from_doc(r)) for r in request_docs]

    return {
        "mentorId": mentor_id,
        "requests": [r.model_dump(by_alias=True) for r in requests],
        "total": len(requests),
    }


# ─────────────────────────────────────────────────────────────
#  Mentor Endpoints — Accept / Decline Requests
# ─────────────────────────────────────────────────────────────

@app.post("/mentor/accept")
async def accept_mentorship(payload: AcceptRequestBody, user: dict = Depends(require_role("mentor"))):
    """
    Accept a pending mentorship request.

    Verifies that the mentor is approved, then marks the request as
    accepted. Also generates a Google Calendar link for the first
    session (scheduled 3 days from now).
    """
    # Ensure the mentor is verified before they can accept mentees
    db_user = await db.users.find_one({"_id": user.get("userId", "")})
    if db_user and not db_user.get("verified", True):
        raise HTTPException(403, "You must be verified before accepting mentees")

    req_doc = await db.mentor_requests.find_one({"_id": payload.mentorship_id})
    if not req_doc:
        raise HTTPException(404, "Request not found")
    if req_doc["status"] != "pending":
        raise HTTPException(400, f"Cannot accept — status is '{req_doc['status']}'")

    # Verify this request belongs to the authenticated mentor
    uid = user.get("userId", "")
    mentor_doc = await db.mentors.find_one({"user_id": uid})
    mentor_id = mentor_doc["_id"] if mentor_doc else ""
    if req_doc.get("mentor_id") and req_doc["mentor_id"] != mentor_id:
        raise HTTPException(403, "This request is not for you")

    await db.mentor_requests.update_one({"_id": payload.mentorship_id}, {"$set": {"status": "accepted"}})
    await _activity(f"{user.get('name')} accepted mentorship from {req_doc['candidate_name']}", "session")

    # ── Generate a Google Calendar event for the first session ──
    mentor_name = user.get("name", "Mentor")
    candidate_name = req_doc.get("candidate_name", "Candidate")
    candidate_goal = req_doc.get("candidate_goal", "Career mentorship")

    # Schedule the first session 3 days from now at 10:00 AM
    first_session = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=3)

    calendar_title = f"GUIDED Mentorship: {mentor_name} ↔ {candidate_name}"
    calendar_description = (
        f"🎯 Mentorship Session — GUIDED Platform\n\n"
        f"Mentor: {mentor_name}\n"
        f"Mentee: {candidate_name}\n"
        f"Goal: {candidate_goal}\n\n"
        f"Agenda:\n"
        f"• Introduction & goal alignment\n"
        f"• Skill gap assessment\n"
        f"• Roadmap discussion\n"
        f"• Next steps & action items\n\n"
        f"Scheduled via GUIDED Mentorship Platform"
    )

    calendar_url = _generate_google_calendar_url(
        title=calendar_title,
        description=calendar_description,
        start_dt=first_session,
        duration_minutes=60,
        location="Google Meet (link will be shared via email)",
    )

    updated = await db.mentor_requests.find_one({"_id": payload.mentorship_id})
    req = MentorRequest(**_from_doc(updated))

    return {
        "message": "Mentorship accepted",
        "request": req.model_dump(by_alias=True),
        "calendarUrl": calendar_url,
        "sessionDetails": {
            "date": first_session.strftime("%B %d, %Y"),
            "time": first_session.strftime("%I:%M %p"),
            "mentorName": mentor_name,
            "candidateName": candidate_name,
        },
    }


@app.post("/mentor/decline")
async def decline_mentorship(payload: DeclineRequestBody, user: dict = Depends(require_role("mentor"))):
    """Decline a pending mentorship request."""
    req_doc = await db.mentor_requests.find_one({"_id": payload.mentorship_id})
    if not req_doc:
        raise HTTPException(404, "Request not found")
    if req_doc["status"] != "pending":
        raise HTTPException(400, f"Cannot decline — status is '{req_doc['status']}'")

    # Verify this request belongs to the authenticated mentor
    uid = user.get("userId", "")
    mentor_doc = await db.mentors.find_one({"user_id": uid})
    mentor_id = mentor_doc["_id"] if mentor_doc else ""
    if req_doc.get("mentor_id") and req_doc["mentor_id"] != mentor_id:
        raise HTTPException(403, "This request is not for you")

    await db.mentor_requests.update_one({"_id": payload.mentorship_id}, {"$set": {"status": "declined"}})

    updated = await db.mentor_requests.find_one({"_id": payload.mentorship_id})
    req = MentorRequest(**_from_doc(updated))
    return {"message": "Mentorship declined", "request": req.model_dump(by_alias=True)}


# ─────────────────────────────────────────────────────────────
#  Mentor Endpoints — Verification
# ─────────────────────────────────────────────────────────────

@app.post("/mentor/verify-submit")
async def mentor_submit_verification(payload: MentorVerificationSubmit, user: dict = Depends(require_role("mentor"))):
    """
    Submit (or update) a LinkedIn URL for admin verification.

    If a verification request already exists, it updates the URL.
    Otherwise, a new pending verification is created.
    """
    uid = user.get("userId", "")
    db_user = await db.users.find_one({"_id": uid})
    if not db_user:
        raise HTTPException(404, "User not found")

    # Save the LinkedIn URL on the user profile
    await db.users.update_one({"_id": uid}, {"$set": {"linkedin_url": payload.linkedin_url}})

    # Update existing verification or create a new one
    existing = await db.pending_verifications.find_one({"user_id": uid})
    if existing:
        await db.pending_verifications.update_one(
            {"user_id": uid},
            {"$set": {"linkedin_url": payload.linkedin_url}},
        )
        return {"message": "Verification updated", "status": "pending"}

    await db.pending_verifications.insert_one({
        "_id": uid,
        "name": db_user["name"],
        "role": payload.linkedin_url,
        "experience": 0,
        "submitted_at": datetime.now().strftime("%Y-%m-%d"),
        "linkedin_url": payload.linkedin_url,
        "user_id": uid,
    })
    await _activity(f"Mentor verification request: {db_user['name']}", "signup")
    return {"message": "Verification submitted", "status": "pending"}


@app.get("/mentor/verification-status")
async def mentor_verification_status(user: dict = Depends(require_role("mentor"))):
    """Check whether the current mentor has been verified by an admin."""
    db_user = await db.users.find_one({"_id": user.get("userId", "")})
    if not db_user:
        raise HTTPException(404, "User not found")

    pending = await db.pending_verifications.find_one({"user_id": db_user["_id"]})
    return {
        "verified": db_user["verified"],
        "pending": pending is not None,
        "linkedinUrl": db_user.get("linkedin_url", ""),
    }


# ─────────────────────────────────────────────────────────────
#  Admin Endpoints — Platform Dashboard
# ─────────────────────────────────────────────────────────────

@app.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_role("admin"))):
    """
    Full admin dashboard data including platform stats, mentor list,
    mentorship requests, pending verifications, activity feed,
    and revenue metrics.
    """
    total_users = await db.users.count_documents({})
    active_mentorships = await db.mentor_requests.count_documents({"status": "accepted"})
    pending_verif_count = await db.pending_verifications.count_documents({})

    # Count completed sessions across all candidates
    all_candidates = await db.candidates.find({}).to_list(length=500)
    completed = sum(
        len([s for s in (c.get("sessions") or []) if s.get("status") == "completed"])
        for c in all_candidates
    )

    # Calculate average mentor rating
    all_mentors = await db.mentors.find({}).to_list(length=100)
    avg_rating = round(
        sum(m.get("rating", 0) for m in all_mentors) / max(len(all_mentors), 1), 1
    )

    stats = {
        "totalUsers": total_users,
        "activeMentorships": active_mentorships,
        "pendingVerifications": pending_verif_count,
        "completedSessions": completed,
        "avgRating": avg_rating,
        "successRate": 87,  # Placeholder — would be computed from outcomes in production
    }

    # Calculate total platform revenue from accepted mentorships
    all_requests = await db.mentor_requests.find({}).to_list(length=500)
    total_revenue = 0
    for req in all_requests:
        if req.get("status") == "accepted" and req.get("mentor_id"):
            m_doc = await db.mentors.find_one({"_id": req["mentor_id"]})
            if m_doc:
                # Revenue = session price × 8 sessions × 1.1 (includes platform fee)
                total_revenue += m_doc.get("price_per_session", 0) * 8 * 1.1

    pending_verif_docs = await db.pending_verifications.find({}).to_list(length=100)
    activity_docs = await db.recent_activity.find({}).sort("created_at", -1).to_list(length=15)

    return {
        "platformStats": stats,
        "mentors": [Mentor(**_from_doc(m)).model_dump(by_alias=True) for m in all_mentors],
        "mentorRequests": [MentorRequest(**_from_doc(r)).model_dump(by_alias=True) for r in all_requests],
        "pendingVerifications": [PendingVerification(**_from_doc(v)).model_dump(by_alias=True) for v in pending_verif_docs],
        "recentActivity": [ActivityEntry(**_from_doc(a)).model_dump(by_alias=True) for a in activity_docs],
        "revenue": {
            "total": round(total_revenue),
            "change": f"+{len(all_requests) * 3}%",
            "transactions": len([r for r in all_requests if r.get("status") == "accepted"]),
            "avgValue": round(total_revenue / max(active_mentorships, 1), 2),
        },
    }


# ─────────────────────────────────────────────────────────────
#  Admin Endpoints — Mentor Verification & Rejection
# ─────────────────────────────────────────────────────────────

@app.post("/admin/verify-mentor")
async def verify_mentor(payload: VerifyMentorBody, user: dict = Depends(require_role("admin"))):
    """
    Approve a pending mentor application.

    Marks the user as verified, removes them from the pending queue,
    and auto-creates a mentor profile in the marketplace.
    """
    v_doc = await db.pending_verifications.find_one({"_id": payload.mentor_id})
    if not v_doc:
        raise HTTPException(404, "Verification not found")

    v = PendingVerification(**_from_doc(v_doc))

    # Remove from the pending queue
    await db.pending_verifications.delete_one({"_id": payload.mentor_id})

    if v.user_id:
        # Mark the user account as verified
        await db.users.update_one({"_id": v.user_id}, {"$set": {"verified": True}})

        # Auto-create a mentor profile so they appear in the marketplace
        mentor_id = f"m-{_uid()}"
        user_doc = await db.users.find_one({"_id": v.user_id})
        if user_doc:
            new_mentor = Mentor(
                id=mentor_id,
                name=user_doc["name"],
                role="Verified Mentor",
                company="Independent",
                avatar=user_doc["name"][:2].upper(),
                experience=v.experience or 1,
                domain="Software Engineering",
                price_per_session=75.0,
                available=True,
                rating=5.0,
                sessions=0,
                bio=f"Verified mentor. LinkedIn: {v.linkedin_url}",
                verified=True,
                user_id=v.user_id,
            )
            await db.mentors.insert_one(_to_doc(new_mentor))

    await _activity(f"Mentor verified: {v.name}", "signup")
    return {"message": f"Mentor '{v.name}' verified successfully"}


@app.post("/admin/reject-mentor")
async def reject_mentor(payload: RejectMentorBody, user: dict = Depends(require_role("admin"))):
    """
    Reject a pending mentor application.

    Removes them from the pending queue and flags their user account
    as rejected, with an optional reason recorded for transparency.
    """
    v_doc = await db.pending_verifications.find_one({"_id": payload.mentor_id})
    if not v_doc:
        raise HTTPException(404, "Pending verification not found")

    v = PendingVerification(**_from_doc(v_doc))

    # Remove from the pending verifications queue
    await db.pending_verifications.delete_one({"_id": payload.mentor_id})

    # Mark the user account as rejected
    if v.user_id:
        await db.users.update_one(
            {"_id": v.user_id},
            {"$set": {"verified": False, "rejected": True, "rejection_reason": payload.reason}},
        )

    reason_msg = f" — Reason: {payload.reason}" if payload.reason else ""
    await _activity(f"Mentor rejected: {v.name}{reason_msg}", "admin")
    return {"message": f"Mentor '{v.name}' has been rejected"}


@app.get("/admin/pending-mentors")
async def admin_pending_mentors(user: dict = Depends(require_role("admin"))):
    """List all pending mentor applications awaiting admin approval."""
    pending_docs = await db.pending_verifications.find({}).to_list(length=200)
    result = []
    for p in pending_docs:
        pv = _from_doc(p)
        user_doc = await db.users.find_one({"_id": pv.get("user_id", pv["id"])})
        email = user_doc["email"] if user_doc else "unknown@example.com"
        result.append({
            "id": pv["id"],
            "name": pv["name"],
            "email": email,
            "avatar": pv["name"][:2].upper(),
            "linkedinUrl": pv.get("linkedin_url", ""),
            "experience": pv.get("experience", 0),
            "submittedAt": pv.get("submitted_at", ""),
            "role": pv.get("role", "Pending verification"),
        })
    return {"pendingMentors": result}


# ─────────────────────────────────────────────────────────────
#  Admin Endpoints — Mentor & Mentee Management
# ─────────────────────────────────────────────────────────────

class AdminEnableMentorBody(BaseModel):
    """Payload to enable or disable a mentor's availability."""
    mentor_id: str = Field(alias="mentorId")
    model_config = ConfigDict(populate_by_name=True)


class AdminAllocateMentorBody(BaseModel):
    """Payload for an admin to manually assign a mentor to a mentee."""
    mentee_id: str = Field(alias="menteeId")
    mentor_id: str = Field(alias="mentorId")
    model_config = ConfigDict(populate_by_name=True)


class AdminFlagMentorshipBody(BaseModel):
    """Payload for flagging a mentorship for manual review."""
    mentorship_id: str = Field(alias="mentorshipId")
    reason: str = ""
    model_config = ConfigDict(populate_by_name=True)


@app.get("/admin/mentors")
async def admin_list_mentors(user: dict = Depends(require_role("admin"))):
    """List all mentors with workload and profile data for the admin panel."""
    docs = await db.mentors.find({}).to_list(length=200)
    result = []
    for d in docs:
        m = _from_doc(d)

        # Count how many active mentees this mentor currently has
        active_count = await db.mentor_requests.count_documents(
            {"mentor_id": m["id"], "status": "accepted"}
        )

        result.append({
            "id": m["id"],
            "name": m["name"],
            "email": (
                m.get("user_id", "") + "@guided.dev"
                if m.get("user_id")
                else m["name"].lower().replace(" ", ".") + "@example.com"
            ),
            "avatar": m.get("avatar", m["name"][:2].upper()),
            "expertise": [m.get("domain", "Software Engineering")],
            "experience": f"{m.get('experience', 0)} years",
            "price": m.get("price_per_session", 0),
            "verified": m.get("verified", False),
            "enabled": m.get("available", True),
            "currentWorkload": active_count,
            "maxWorkload": 5,
            "bio": m.get("bio", ""),
            "rating": m.get("rating", 0),
            "totalSessions": m.get("sessions", 0),
            "role": m.get("role", ""),
            "company": m.get("company", ""),
        })
    return {"mentors": result}


@app.get("/admin/mentees")
async def admin_list_mentees(user: dict = Depends(require_role("admin"))):
    """List all candidates with roadmap progress data for the admin panel."""
    docs = await db.candidates.find({}).to_list(length=500)
    result = []
    for d in docs:
        c = _from_doc(d)

        # Determine the mentee's current workflow status
        if c.get("mentor_id") and c.get("roadmap_generated"):
            mentee_status = "mentor_assigned"
        elif c.get("roadmap_generated"):
            mentee_status = "roadmap_generated"
        elif c.get("mentor_id"):
            mentee_status = "in_progress"
        else:
            mentee_status = "unassigned"

        # Calculate roadmap progress percentage
        roadmap = c.get("roadmap", [])
        total_steps = len(roadmap) if roadmap else 0
        completed_steps = len([s for s in roadmap if s.get("status") == "completed"]) if roadmap else 0
        current_progress = round((completed_steps / total_steps) * 100) if total_steps > 0 else 0

        # Build milestone cards from roadmap steps
        milestones = []
        for step in roadmap:
            ms_status = (
                "completed" if step.get("status") == "completed"
                else "in_progress" if step.get("status") == "current"
                else "pending"
            )
            milestones.append({
                "id": step.get("id", ""),
                "title": step.get("title", ""),
                "description": step.get("description", ""),
                "status": ms_status,
                "dueDate": step.get("duration", ""),
            })

        # Assemble roadmap summary (only if a roadmap exists)
        roadmap_data = None
        if roadmap:
            skill_gaps_raw = c.get("skill_gaps", [])
            skill_gap_names = [g.get("skill", "") for g in skill_gaps_raw] if skill_gaps_raw else []
            roadmap_data = {
                "summary": f"Personalized roadmap for {c.get('target_role', 'career goal')} at {c.get('target_company', 'target companies')}.",
                "skillGaps": skill_gap_names,
                "milestones": milestones,
                "currentProgress": current_progress,
            }

        result.append({
            "id": c["id"],
            "name": c.get("name", "Unknown"),
            "email": c.get("email", ""),
            "avatar": c.get("name", "??")[:2].upper() if c.get("name") else "??",
            "targetRole": c.get("target_role", ""),
            "careerGoal": c.get("career_goal", ""),
            "resumeUrl": "#resume",
            "status": mentee_status,
            "mentorId": c.get("mentor_id"),
            "roadmap": roadmap_data,
            "joinedAt": c.get("created_at", "2025-01-01") if c.get("created_at") else "2025-01-01",
        })
    return {"mentees": result}


@app.get("/admin/mentees/{mentee_id}")
async def admin_get_mentee(mentee_id: str, user: dict = Depends(require_role("admin"))):
    """Get a single mentee's detailed profile with roadmap data for the admin panel."""
    doc = await db.candidates.find_one({"_id": mentee_id})
    if not doc:
        raise HTTPException(404, "Mentee not found")
    c = _from_doc(doc)

    # Build the same structure as /admin/mentees for consistency
    roadmap = c.get("roadmap", [])
    total_steps = len(roadmap) if roadmap else 0
    completed_steps = len([s for s in roadmap if s.get("status") == "completed"]) if roadmap else 0
    current_progress = round((completed_steps / total_steps) * 100) if total_steps > 0 else 0

    milestones = []
    for step in roadmap:
        ms_status = (
            "completed" if step.get("status") == "completed"
            else "in_progress" if step.get("status") == "current"
            else "pending"
        )
        milestones.append({
            "id": step.get("id", ""),
            "title": step.get("title", ""),
            "description": step.get("description", ""),
            "status": ms_status,
            "dueDate": step.get("duration", ""),
        })

    roadmap_data = None
    if roadmap:
        skill_gaps_raw = c.get("skill_gaps", [])
        skill_gap_names = [g.get("skill", "") for g in skill_gaps_raw] if skill_gaps_raw else []
        roadmap_data = {
            "summary": f"Personalized roadmap for {c.get('target_role', 'career goal')} at {c.get('target_company', 'target companies')}.",
            "skillGaps": skill_gap_names,
            "milestones": milestones,
            "currentProgress": current_progress,
        }

    if c.get("mentor_id") and c.get("roadmap_generated"):
        mentee_status = "mentor_assigned"
    elif c.get("roadmap_generated"):
        mentee_status = "roadmap_generated"
    elif c.get("mentor_id"):
        mentee_status = "in_progress"
    else:
        mentee_status = "unassigned"

    return {
        "id": c["id"],
        "name": c.get("name", "Unknown"),
        "email": c.get("email", ""),
        "avatar": c.get("name", "??")[:2].upper() if c.get("name") else "??",
        "targetRole": c.get("target_role", ""),
        "careerGoal": c.get("career_goal", ""),
        "resumeUrl": "#resume",
        "status": mentee_status,
        "mentorId": c.get("mentor_id"),
        "roadmap": roadmap_data,
        "joinedAt": c.get("created_at", "2025-01-01") if c.get("created_at") else "2025-01-01",
    }


# ─────────────────────────────────────────────────────────────
#  Admin Endpoints — Mentorship Monitoring
# ─────────────────────────────────────────────────────────────

@app.get("/admin/mentorships")
async def admin_list_mentorships(user: dict = Depends(require_role("admin"))):
    """
    List all mentorship records for the monitoring dashboard.

    Each record includes session progress, dates, and flagging status.
    """
    docs = await db.mentor_requests.find({}).to_list(length=500)
    result = []
    for d in docs:
        r = _from_doc(d)

        # Look up session progress for this mentorship
        candidate_doc = await db.candidates.find_one({"_id": r.get("candidate_id", "")})
        sessions_completed = 0
        total_sessions = 8
        last_session_date = None
        if candidate_doc:
            sessions = candidate_doc.get("sessions", [])
            sessions_completed = len([s for s in sessions if s.get("status") == "completed"])
            total_sessions = len(sessions) if sessions else 8
            completed_sessions = [s for s in sessions if s.get("status") == "completed"]
            if completed_sessions:
                last_session_date = completed_sessions[-1].get("date")

        # Map the request status to a monitoring-friendly label
        req_status = r.get("status", "pending")
        if req_status == "accepted":
            mentorship_status = "active"
        elif req_status == "declined":
            mentorship_status = "completed"
        else:
            mentorship_status = "paused"

        result.append({
            "id": r["id"],
            "menteeId": r.get("candidate_id", ""),
            "mentorId": r.get("mentor_id", ""),
            "menteeName": r.get("candidate_name", "Unknown"),
            "menteeGoal": r.get("candidate_goal", ""),
            "status": mentorship_status,
            "startDate": r.get("submitted_at", ""),
            "lastSessionDate": last_session_date,
            "sessionsCompleted": sessions_completed,
            "totalSessions": total_sessions,
            "flagged": r.get("flagged", False),
            "flagReason": r.get("flag_reason"),
        })
    return {"mentorships": result}


# ─────────────────────────────────────────────────────────────
#  Admin Endpoints — Enable / Disable / Allocate / Flag
# ─────────────────────────────────────────────────────────────

@app.post("/admin/mentor/enable")
async def admin_enable_mentor(payload: AdminEnableMentorBody, user: dict = Depends(require_role("admin"))):
    """Enable a mentor account so they appear in the marketplace."""
    result = await db.mentors.update_one(
        {"_id": payload.mentor_id}, {"$set": {"available": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Mentor not found")
    await _activity(f"Admin enabled mentor: {payload.mentor_id}", "admin")
    return {"message": "Mentor enabled"}


@app.post("/admin/mentor/disable")
async def admin_disable_mentor(payload: AdminEnableMentorBody, user: dict = Depends(require_role("admin"))):
    """Disable a mentor account so they are hidden from the marketplace."""
    result = await db.mentors.update_one(
        {"_id": payload.mentor_id}, {"$set": {"available": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Mentor not found")
    await _activity(f"Admin disabled mentor: {payload.mentor_id}", "admin")
    return {"message": "Mentor disabled"}


@app.post("/admin/allocate-mentor")
async def admin_allocate_mentor(payload: AdminAllocateMentorBody, user: dict = Depends(require_role("admin"))):
    """
    Manually assign a mentor to a mentee.

    Creates an auto-accepted mentorship request and links the
    mentor to the candidate profile.
    """
    # Validate both parties exist
    mentee_doc = await db.candidates.find_one({"_id": payload.mentee_id})
    if not mentee_doc:
        raise HTTPException(404, "Mentee not found")

    mentor_doc = await db.mentors.find_one({"_id": payload.mentor_id})
    if not mentor_doc:
        raise HTTPException(404, "Mentor not found")

    mentor = _from_doc(mentor_doc)

    # Link the mentor to the candidate
    await db.candidates.update_one(
        {"_id": payload.mentee_id},
        {"$set": {"mentor_id": payload.mentor_id, "status": "mentorship_active"}},
    )

    # Create an auto-accepted mentorship request record
    req_id = f"req-{_uid()}"
    candidate = _from_doc(mentee_doc)
    await db.mentor_requests.insert_one({
        "_id": req_id,
        "candidate_name": candidate.get("name", "Unknown"),
        "candidate_goal": candidate.get("career_goal", ""),
        "experience": candidate.get("experience_level", ""),
        "status": "accepted",
        "submitted_at": datetime.now().strftime("%Y-%m-%d"),
        "candidate_id": payload.mentee_id,
        "mentor_id": payload.mentor_id,
    })

    await _activity(
        f"Admin allocated {mentor['name']} to {candidate.get('name', 'mentee')}",
        "admin",
    )
    return {"message": f"Mentor '{mentor['name']}' assigned successfully"}


@app.post("/admin/mentorship/flag")
async def admin_flag_mentorship(payload: AdminFlagMentorshipBody, user: dict = Depends(require_role("admin"))):
    """Flag a mentorship for manual review by an admin."""
    result = await db.mentor_requests.update_one(
        {"_id": payload.mentorship_id},
        {"$set": {"flagged": True, "flag_reason": payload.reason or "Flagged by admin for review"}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Mentorship not found")
    await _activity(f"Admin flagged mentorship: {payload.mentorship_id}", "admin")
    return {"message": "Mentorship flagged"}


# ─────────────────────────────────────────────────────────────
#  Admin Endpoints — Analytics & Charts
# ─────────────────────────────────────────────────────────────

@app.get("/admin/dashboard/metrics")
async def admin_dashboard_metrics(user: dict = Depends(require_role("admin"))):
    """
    Comprehensive dashboard metrics for the admin panel.

    Returns counts and breakdowns for mentees, mentors, mentorships,
    sessions, and flagged items.
    """
    total_mentees = await db.candidates.count_documents({})
    total_mentors = await db.mentors.count_documents({})
    active_mentorships = await db.mentor_requests.count_documents({"status": "accepted"})
    all_candidates = await db.candidates.find({}).to_list(length=500)

    # Mentees who have a roadmap but no mentor assigned yet
    pending_allocations = len([
        c for c in all_candidates
        if c.get("roadmap_generated") and not c.get("mentor_id")
    ])

    # Mentees with no mentor at all
    unassigned = len([c for c in all_candidates if not c.get("mentor_id")])

    # Mentorships flagged for review
    stalled = await db.mentor_requests.count_documents({"flagged": True})

    # Total completed sessions across all candidates
    completed_sessions = sum(
        len([s for s in (c.get("sessions") or []) if s.get("status") == "completed"])
        for c in all_candidates
    )

    flagged_count = await db.mentor_requests.count_documents({"flagged": True})
    completed_mentorships = await db.mentor_requests.count_documents({"status": "declined"})
    pending_mentor_approvals = await db.pending_verifications.count_documents({})

    return {
        "totalMentees": total_mentees,
        "totalMentors": total_mentors,
        "activeMentorships": active_mentorships,
        "pendingAllocations": pending_allocations,
        "unassignedMentees": unassigned,
        "stalledMentorships": stalled,
        "completedMentorships": completed_mentorships,
        "flaggedCount": flagged_count,
        "completedSessions": completed_sessions,
        "pendingMentorApprovals": pending_mentor_approvals,
    }


@app.get("/admin/chart/mentee-status")
async def admin_mentee_status_chart(user: dict = Depends(require_role("admin"))):
    """Mentee status distribution data for a pie/donut chart."""
    all_candidates = await db.candidates.find({}).to_list(length=500)
    status_counts: dict[str, int] = {}

    for c in all_candidates:
        if c.get("mentor_id") and c.get("roadmap_generated"):
            s = "Mentor Assigned"
        elif c.get("roadmap_generated"):
            s = "Roadmap Generated"
        elif c.get("mentor_id"):
            s = "In Progress"
        else:
            s = "Unassigned"
        status_counts[s] = status_counts.get(s, 0) + 1

    return [{"name": k, "value": v} for k, v in status_counts.items()]


@app.get("/admin/chart/growth")
async def admin_growth_chart(user: dict = Depends(require_role("admin"))):
    """
    Monthly growth data for a bar chart.

    Generates proportional growth figures based on current totals.
    In production, this would query time-series data.
    """
    total_mentees = await db.candidates.count_documents({})
    total_mentorships = await db.mentor_requests.count_documents({"status": "accepted"})

    months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]
    growth = []
    for i, month in enumerate(months):
        factor = (i + 1) / len(months)
        growth.append({
            "month": month,
            "mentees": max(1, round(total_mentees * factor)),
            "mentorships": max(0, round(total_mentorships * factor)),
        })
    return growth


# ─────────────────────────────────────────────────────────────
#  Entry Point
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
