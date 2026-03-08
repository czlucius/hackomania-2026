import os
import sys
import base64
import logging
import numpy as np
import cv2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

# Ensure src/ is importable from the backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.extraction.robust_extractor import RobustSynthIDExtractor

logger = logging.getLogger(__name__)
router = APIRouter()

CODEBOOK_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "artifacts", "codebook", "synthid_codebook.pkl"
)

_extractor: Optional[RobustSynthIDExtractor] = None


def get_extractor() -> RobustSynthIDExtractor:
    global _extractor
    if _extractor is None:
        _extractor = RobustSynthIDExtractor()
        if os.path.exists(CODEBOOK_PATH):
            _extractor.load_codebook(CODEBOOK_PATH)
            logger.info("SynthID codebook loaded from %s", CODEBOOK_PATH)
        else:
            logger.warning("SynthID codebook not found at %s", CODEBOOK_PATH)
    return _extractor


class SynthIDCheckRequest(BaseModel):
    image_url: Optional[str] = None
    image_b64: Optional[str] = None   # raw base64, no data URI prefix
    image_mime: Optional[str] = "image/jpeg"


class SynthIDResult(BaseModel):
    is_synthid_watermarked: bool
    confidence: float
    correlation: float
    phase_match: float
    structure_ratio: float
    carrier_strength: float


@router.post("/image/synthid", response_model=SynthIDResult)
async def check_synthid(request: SynthIDCheckRequest):
    if not request.image_url and not request.image_b64:
        raise HTTPException(
            status_code=400,
            detail="Either image_url or image_b64 is required"
        )

    ext = get_extractor()
    if ext.codebook is None:
        raise HTTPException(
            status_code=503,
            detail="SynthID codebook not available. Run the extractor first: "
                   "python src/extraction/robust_extractor.py extract <image_dir> "
                   "--output artifacts/codebook/robust_codebook.pkl"
        )

    if request.image_b64:
        try:
            img_bytes = base64.b64decode(request.image_b64)
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("cv2.imdecode returned None")
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
    else:
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(request.image_url)
                resp.raise_for_status()
            img_bytes = resp.content
            img_array = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Could not decode image from URL")
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")

    try:
        result = ext.detect_array(img)
        # cv2.imshow("Debug - SynthID Detection", img)
        # cv2.waitKey(0)
        return SynthIDResult(
            is_synthid_watermarked=result.is_watermarked,
            confidence=result.confidence,
            correlation=result.correlation,
            phase_match=result.phase_match,
            structure_ratio=result.structure_ratio,
            carrier_strength=result.carrier_strength,
        )
    except Exception as e:
        logger.error("SynthID detection failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")
