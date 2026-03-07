import os
import sys
import logging
import hashlib
import datetime
import clickhouse_connect
from urllib.parse import urlparse
from typing import TypedDict
from fastapi import APIRouter
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

openai_client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

SYSTEM_INSTRUCTIONS = """
You are SureAnot.ai, a specialized fact-checking assistant for Singapore. Your mission is to help people make informed decisions in a fragmented information landscape. Communities need tools that help them UNDERSTAND information better, not just delete it.

Core Criteria for Analysis:

1. Assess Credibility:
- Classify content strictly as: "Likely accurate", "Unverified / uncertain", or "Potentially misleading".
- Explain CLEARLY why content is classified that way. Make uncertainty visible.
- Always provide a "verdict" (one-word summary).

2. Surface Context:
- Highlight source credibility signals (e.g., "Official Government Channel", "Parody Account", "Unverified Forward").
- Evaluate supporting evidence or its absence.
- Point out missing context that changes the narrative.
- Display confidence levels (High/Medium/Low).
- Link to relevant official (gov.sg, SPF, MOH) or verified resources in the explanation.

3. Local & Multi-language Context:
- Summary/Explanation must be available in English, Chinese (zh), and Malay (ms).
- Detect and handle cultural references, Singlish, and mixed-language (code-switching) content.
- Ensure the language is easy to understand for different literacy levels—avoid overly technical jargon.

4. Reduce Real-World Harm:
- Focus on reducing panic during crises and improving clarity during local policy changes.
- Support healthy community discussion by being a neutral, evidence-based arbiter.

Multi-language Requirement:
- You will receive a `preferred_lang` (en, zh, ms, ta).
- ALWAYS provide the English fields (`explanation`, `verdict`, etc.).
- ONLY provide the translation for `zh`, `ms`, or `ta` if it matches the `preferred_lang`. If `preferred_lang` is `en`, set `zh`, `ms`, and `ta` to null.
- For Tamil (`ta`), write in standard Tamil used in Singapore (Tamil Nadu Tamil is acceptable, avoid overly archaic vocabulary).
- This is for performance optimization. Keep explanations concise (max 2 sentences).
- If a translation is requested later via the `/translate` endpoint, you will handle it there.

Analysis Logic:
- For Singapore news, match against known reports (ST, CNA, Mothership).
- For domain-level tracking, we use the full hostname (e.g., forums.hardwarezone.com.sg).
"""

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Connect to Clickhouse
try:
    ch_host = os.getenv('CLICKHOUSE_HOST') or 'pokdknhsax.ap-southeast-1.aws.clickhouse.cloud'
    ch_user = os.getenv('CLICKHOUSE_USER') or 'default'
    ch_pass = os.getenv('CLICKHOUSE_PASSWORD')
    
    ch_client = clickhouse_connect.get_client(
        host=ch_host,
        user=ch_user,
        password=ch_pass,
        port=443,
        secure=True
    )
    logger.info(f"Connected to ClickHouse at {ch_host} successfully.")
except Exception as e:
    logger.error(f"Failed to connect to ClickHouse: {e}")
    ch_client = None

router = APIRouter()

class InputFormat(BaseModel):
    source_url: str | None = ""
    content: str
    from_user: str | None = None
    group_chat: bool | None = False
    type: str | None = "message"  # "message" or "website" or "article"
    preferred_lang: str | None = "en" # "en", "zh", "ms"


class Translation(BaseModel):
    explanation: str

class FakeNewsAnalysisResult(BaseModel):
    classification: (
        str  # "Likely accurate", "Unverified / uncertain", "Potentially misleading"
    )
    confidence_level: str  # "High", "Medium", "Low"
    explanation: str
    verdict: str # One-word summary of the classification e.g. "Verified" or "Misleading"
    source_credibility: str
    supporting_evidence: str
    missing_context: str | None
    potential_harm: str | None
    recommended_action: str
    zh: Translation | None = None
    ms: Translation | None = None
    ta: Translation | None = None
    community_score: int | None = None


analysis_cache = {}


# ClickHouse client is initialized once at the top


@router.post("/check")
async def check(user_request: InputFormat):
    # Preformulate the input prompt based on the user request
    content_type = user_request.type or "message"
    source_url = user_request.source_url or ""
    content = user_request.content
    from_user = user_request.from_user or ""
    group_chat = user_request.group_chat or False
    preferred_lang = user_request.preferred_lang or "en"

    # Extract score from ClickHouse if URL matches
    community_score = 0
    if source_url and ch_client:
        try:
            parsed = urlparse(source_url)
            domain = parsed.netloc.replace("www.", "")
            res = ch_client.query(f"SELECT score FROM links WHERE domain = '{domain}' LIMIT 1")
            if len(res.result_rows) > 0:
                community_score = res.result_rows[0][0]
        except Exception as e:
            logger.error(f"Failed to get score from ClickHouse: {e}")

    # Check cache first
    content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
    if content_hash in analysis_cache:
        logger.info(f"Cache hit for content hash: {content_hash}")
        # Attach latest score to cached result before returning
        cached_result = analysis_cache[content_hash]
        cached_result.community_score = community_score
        return cached_result

    prompt_parts = [
        f"Please analyze the following {content_type} for fake news and misinformation:",
        f"Preferred Language for translation: {preferred_lang}",
        "",
    ]

    if source_url:
        prompt_parts.append(f"Source URL: {source_url}")
    if from_user:
        prompt_parts.append(f"Shared by: {from_user}")
    if group_chat:
        prompt_parts.append(f"Group/Channel: {group_chat}")

    prompt_parts += [
        "",
        "<content>\n",
        content,
        "\n</content>\n",
        "Please provide a structured analysis with classification, confidence level, explanation, source credibility assessment, supporting evidence evaluation, any missing context, potential harm, and recommended action.",
    ]

    input_prompt = "\n".join(prompt_parts)

    try:
        # Use OpenAI SDK with structured outputs
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTIONS},
                {"role": "user", "content": input_prompt},
            ],
            response_format=FakeNewsAnalysisResult,
        )

        # Extract the parsed response
        result = completion.choices[0].message.parsed
        result.community_score = community_score
        logger.info(f"Analysis completed: {completion.choices[0].message.content}")

        # Save to cache
        analysis_cache[content_hash] = result

        # Record domain sightings in ClickHouse (Criteria: tracks domain reach even without votes)
        if domain and ch_client:
            try:
                # Upsert domain record if not seen before (record sighting)
                check_query = f"SELECT count() FROM links WHERE domain = '{domain}'"
                res = ch_client.query(check_query)
                exists = res.result_rows[0][0] > 0
                if not exists:
                    url_hash = hashlib.sha256(source_url.encode()).hexdigest()[:16]
                    ch_client.insert('links', [[
                        source_url, url_hash, domain, 0, 0, 0, 'system_sighting', datetime.datetime.now(), datetime.datetime.now()
                    ]], column_names=['url', 'url_hash', 'domain', 'score', 'upvotes', 'downvotes', 'submitted_by', 'created_at', 'updated_at'])
                    logger.info(f"Recorded new domain sighting in ClickHouse: {domain}")
                else:
                    logger.info(f"Domain already exists in ClickHouse sighting check: {domain}")
            except Exception as e:
                logger.error(f"Failed to record sighting for {domain}: {e}")

        return result

    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise



class TranslationRequest(BaseModel):
    text: str
    target_lang: str # 'zh' or 'ms'

@router.post("/translate")
async def translate(request: TranslationRequest):
    lang_map = {
        'zh': 'Chinese (Singapore context)',
        'ms': 'Malay (Singapore context)',
        'ta': 'Tamil (Singapore Tamil context, standard written form)'
    }
    target_name = lang_map.get(request.target_lang, 'English')
    
    prompt = f"Translate the following fact-checking explanation into {target_name}. Ensure it sounds natural for a Singaporean audience:\n\n{request.text}"
    
    try:
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional translator specializing in Singaporean local context and Singlish-to-Standard transitions."},
                {"role": "user", "content": prompt},
            ],
            response_format=Translation,
        )
        return completion.choices[0].message.parsed
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return {"explanation": "Translation failed. Sila cuba lagi / 请重试。"}

class VoteRequest(BaseModel):
    claim_text: str
    verdict: str | None = None
    trust_score: int | float | None = None
    vote: str # 'upvote' or 'downvote'
    platform: str
    url: str | None = None

@router.post("/telemetry/vote")
async def submit_vote(request: VoteRequest):
    if not ch_client:
        return {"status": "error", "message": "ClickHouse not connected"}
    
    # We mainly group by domain for link credibility
    domain = "unknown"
    if request.url:
        parsed = urlparse(request.url)
        domain = parsed.netloc.replace("www.", "")
    else:
        return {"status": "skipped", "reason": "No URL provided for domain tracking"}

    url_hash = hashlib.sha256((request.url or "").encode()).hexdigest()[:16]
    
    try:
        score_delta = 1 if request.vote == 'upvote' else -1
        upvote_delta = 1 if request.vote == 'upvote' else 0
        downvote_delta = 1 if request.vote == 'downvote' else 0
        
        # Check if domain exists
        select_query = f"SELECT count() FROM links WHERE domain = '{domain}'"
        logger.info(f"Executing SQL: {select_query}")
        res = ch_client.query(select_query)
        exists = res.result_rows[0][0] > 0
        
        if exists:
            # Edit existing domain stats (ignoring updated_at as it's a key column in ReplacingMergeTree)
            if request.vote == 'upvote':
                update_query = f"ALTER TABLE links UPDATE upvotes = upvotes + 1, score = score + 1 WHERE domain = '{domain}'"
            else:
                update_query = f"ALTER TABLE links UPDATE downvotes = downvotes + 1, score = score - 1 WHERE domain = '{domain}'"
            
            logger.info(f"Executing SQL: {update_query}")
            ch_client.command(update_query)
        else:
            # Insert new domain
            logger.info("Executing SQL: INSERT INTO links (url, url_hash, domain, score, upvotes, downvotes, submitted_by, created_at, updated_at)")
            ch_client.insert('links', [[
                request.url, url_hash, domain, score_delta, upvote_delta, downvote_delta, 'system', datetime.datetime.now(), datetime.datetime.now()
            ]], column_names=['url', 'url_hash', 'domain', 'score', 'upvotes', 'downvotes', 'submitted_by', 'created_at', 'updated_at'])
            
        logger.info(f"Successfully processed vote for {domain}")
        return {"status": "success", "domain": domain}
    except Exception as e:
        logger.error(f"Failed to submit to ClickHouse: {e}")
        return {"status": "error", "message": str(e)}
