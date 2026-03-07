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
You are SureBoh.ai, a specialized fact-checking assistant for Singapore. Your task is to analyze content for misinformation and verify claims against official Singaporean data and credible news.

Guidelines for Classes:
1. "Likely accurate": Use this for claims that match official government reports (SPF, MOH, MOM, MOT, Singapore Customs), established news (Straits Times, CNA, Mothership), or widely documented facts. Be decisive.
2. "Potentially misleading": Use this if the claim is demonstrably false, a known scam, or a manipulated narrative.
3. "Unverified / uncertain": Use only if the claim is truly ambiguous, a personal anecdote without evidence, or outside your knowledge base.

Multi-language Requirement:
- You MUST provide the analysis in English (top-level fields), Chinese (in the `zh` field), and Malay (in the `ms` field).
- Ensure translations are professional and contextually accurate for Singapore.

Analysis Logic:
- For Singapore news (e.g., cigarette seizures at Changi, arrests, health advisories), if the location/numbers/dates match known reports, mark as "Likely accurate".
- Check for local context: cultural references, Singlish, and local acronyms.
- Provide a clear explanation contrasting misinformation with reality.
- Link to gov.sg or official channels if possible in the explanation.
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
    ch_client = clickhouse_connect.get_client(
        host=os.getenv('CLICKHOUSE_HOST'),
        user=os.getenv('CLICKHOUSE_USER'),
        password=os.getenv('CLICKHOUSE_PASSWORD'),
        secure=True
    )
    logger.info("Connected to ClickHouse successfully.")
except Exception as e:
    logger.error(f"Failed to connect to ClickHouse: {e}")
    ch_client = None

router = APIRouter()

class InputFormat(TypedDict):
    source_url: str
    content: str
    from_user: str | None
    group_chat: bool | None
    type: str | None  # "message" or "website" or "article"


class Translation(BaseModel):
    explanation: str
    supporting_evidence: str
    missing_context: str | None
    recommended_action: str


class FakeNewsAnalysisResult(BaseModel):
    classification: (
        str  # "Likely accurate", "Unverified / uncertain", "Potentially misleading"
    )
    confidence_level: str  # "High", "Medium", "Low"
    explanation: str
    source_credibility: str
    supporting_evidence: str
    missing_context: str | None
    potential_harm: str | None
    recommended_action: str
    zh: Translation
    ms: Translation
    community_score: int | None = None


analysis_cache = {}


# ClickHouse client is initialized once at the top


@router.post("/check")
async def check(user_request: InputFormat):
    # Preformulate the input prompt based on the user request
    content_type = user_request.get("type", "message") or "message"
    source_url = user_request.get("source_url", "")
    content = user_request.get("content", "")
    from_user = user_request.get("from_user", "")
    group_chat = user_request.get("group_chat", "")

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
            model="gpt-4o-mini",
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

        return result

    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise



# ClickHouse client is used from module level

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
        select_query = f"SELECT url FROM links WHERE domain = '{domain}' LIMIT 1"
        logger.info(f"Executing SQL: {select_query}")
        res = ch_client.query(select_query)
        
        if len(res.result_rows) > 0:
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
