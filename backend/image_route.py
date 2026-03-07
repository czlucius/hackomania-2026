import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

IMAGE_SYSTEM_PROMPT = """You are SureAnot.ai, a visual misinformation detector focused on Singapore.

Analyze the provided image and classify it as exactly one of:
- "safe": No misinformation or manipulation concerns.
- "potentially_misleading": May contain misleading claims, out-of-context imagery, or false narrative.
- "manipulated": Clearly AI-generated, deepfaked, or digitally altered to deceive viewers.
- "scam": Contains scam, phishing, fake giveaway, or fraudulent promotional content.
- "uncertain": Cannot determine clearly from the image alone.

Check for: AI generation artifacts, manipulated infographics or charts with false data, fake
news headlines / fabricated screenshots, scam promotions, coordinated inauthentic behavior
signals, and known Singapore scam patterns (e.g. fake government announcements, fake celebrity
endorsements, too-good-to-be-true offers).

Provide a short explanation (1-2 sentences max) and a confidence level (high / medium / low).
"""


class ImageCheckRequest(BaseModel):
    image_url: str | None = None
    image_b64: str | None = None   # raw base64, no data URI prefix
    image_mime: str | None = "image/jpeg"
    context: str | None = None     # alt text or surrounding text
    platform: str | None = None    # 'WhatsApp', 'Telegram Web', 'Instagram', etc.


class _AnalysisOutput(BaseModel):
    classification: str
    explanation: str
    confidence: str


class ImageAnalysisResult(BaseModel):
    is_flagged: bool
    classification: str
    warning: str | None = None
    explanation: str
    confidence: str


@router.post("/image/check", response_model=ImageAnalysisResult)
async def check_image(request: ImageCheckRequest):
    if not request.image_url and not request.image_b64:
        raise HTTPException(status_code=400, detail="Either image_url or image_b64 is required")

    if not request.image_b64 and request.image_url:
        try:
            import httpx
            import base64
            async with httpx.AsyncClient() as client:
                resp = await client.get(request.image_url)
                resp.raise_for_status()
                request.image_b64 = base64.b64encode(resp.content).decode("utf-8")
                request.image_mime = resp.headers.get("content-type", "image/jpeg")
        except Exception as e:
            logger.warning(f"Failed to fetch image URL in backend, falling back to URL: {e}")

    if request.image_b64:
        mime = request.image_mime or "image/jpeg"
        image_content = {
            "type": "image_url",
            "image_url": {
                "url": f"data:{mime};base64,{request.image_b64}",
                "detail": "low",
            },
        }
    else:
        # Fallback if the URL couldn't be fetched and no base64 was provided originally
        image_content = {
            "type": "image_url",
            "image_url": {"url": request.image_url, "detail": "low"},
        }

    parts = ["Analyze this image for misinformation, manipulation, or scam content."]
    if request.context:
        parts.append(f"Alt text / context: {request.context}")
    if request.platform:
        parts.append(f"Source platform: {request.platform}")

    try:
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": IMAGE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": " ".join(parts)},
                        image_content,
                    ],
                },
            ],
            response_format=_AnalysisOutput,
            max_tokens=300,
        )
        out = completion.choices[0].message.parsed
        is_flagged = out.classification != "safe"
        return ImageAnalysisResult(
            is_flagged=is_flagged,
            classification=out.classification,
            warning=out.explanation if is_flagged else None,
            explanation=out.explanation,
            confidence=out.confidence,
        )
    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")
