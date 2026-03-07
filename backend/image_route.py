from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from openai import OpenAI
import os

router = APIRouter(prefix="/image", tags=["Image Analysis"])

logger = logging.getLogger(__name__)

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=api_key)

class ImageCheckRequest(BaseModel):
    image_url: str

class ImageCheckResponse(BaseModel):
    warning: str | None

SYSTEM_INSTRUCTIONS = """
You are SureAnot.ai's vision detection engine. Your task is to analyze images to determine if they are likely AI-generated or digitally manipulated.
Specifically look for:
- Known AI generator watermarks (e.g., Midjourney, DALL-E, Stable Diffusion).
- Unnatural artifacts like distorted hands, weird background text, inconsistent lighting, or physical impossibilities.
- Signs of deepfake face swapping.

If you are highly confident the image is AI-generated or manipulated, describe the issue concisely (e.g., "Potential AI-generated image detected: Unnatural artifacts (e.g. distorted fingers) visible.").
If the image looks normal, or if you are unsure, do not return a warning (return None). 
Your output must fit the ImageCheckResponse schema.
"""

@router.post("/check", response_model=ImageCheckResponse)
async def check_image(request: ImageCheckRequest):
    if not request.image_url:
        raise HTTPException(status_code=400, detail="Missing image_url")
        
    try:
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTIONS},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Is this image likely AI generated? Check for watermarks and artifacts."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": request.image_url,
                            },
                        },
                    ],
                }
            ],
            response_format=ImageCheckResponse,
            timeout=30,
        )
        
        result = completion.choices[0].message.parsed
        return result

    except Exception as e:
        logger.error(f"Image analysis failed: {str(e)}")
        # In case of API failure, don't break the extension UI, just return no warning
        return ImageCheckResponse(warning=None)
