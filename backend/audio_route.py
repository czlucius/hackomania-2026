import os
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
from dotenv import load_dotenv

from route import check, InputFormat

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Extensions Whisper accepts (used for validation + safe filename construction)
SUPPORTED_EXTENSIONS = {'.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm'}

# Map common browser-reported MIME types to a safe extension when the filename
# has no extension or an unrecognised one.
MIME_TO_EXT = {
    'audio/mpeg':       '.mp3',
    'audio/mp3':        '.mp3',
    'audio/mp4':        '.mp4',
    'video/mp4':        '.mp4',
    'audio/m4a':        '.m4a',
    'audio/x-m4a':      '.m4a',
    'audio/wav':        '.wav',
    'audio/x-wav':      '.wav',
    'audio/wave':       '.wav',
    'audio/webm':       '.webm',
    'video/webm':       '.webm',
    'audio/ogg':        '.ogg',
    'audio/oga':        '.oga',
    'audio/flac':       '.flac',
    'audio/x-flac':     '.flac',
}


def _resolve_ext(filename: str, content_type: str) -> str:
    """Return a Whisper-supported extension, derived from filename then MIME type."""
    ext = os.path.splitext(filename or '')[1].lower()
    if ext in SUPPORTED_EXTENSIONS:
        return ext
    # Fall back to content_type mapping
    base_ct = (content_type or '').split(';')[0].strip().lower()
    ext = MIME_TO_EXT.get(base_ct, '')
    if ext:
        return ext
    raise HTTPException(
        status_code=400,
        detail=f"Unsupported audio format. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
    )


@router.post("/audio/check")
async def check_audio(file: UploadFile = File(...)):
    ext = _resolve_ext(file.filename or '', file.content_type or '')

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

    # Pass (filename, bytes) tuple so the SDK uses our chosen extension to set
    # the correct Content-Type — no temp file needed.
    safe_name = f"audio{ext}"
    print(f"Received audio file: {file.filename}, resolved extension: {ext}, size: {len(audio_bytes)} bytes" + str(audio_bytes[:20]))
    try:
        import io
        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = safe_name
        
        transcription = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=file_obj,
            language="en",
        )
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    transcript = transcription.text.strip()
    if not transcript:
        raise HTTPException(status_code=422, detail="No speech detected in the audio file.")

    logger.info(f"Audio transcript ({len(transcript)} chars): {transcript[:120]}")

    try:
        analysis = await check(InputFormat(content=transcript, type="message", preferred_lang="en"))
    except Exception as e:
        logger.error(f"Audio text analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    result = analysis.model_dump()
    result["transcript"] = transcript
    return result
