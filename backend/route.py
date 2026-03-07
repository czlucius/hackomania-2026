import logging
from typing import TypedDict

from fastapi import APIRouter
from openai import AsyncOpenAI, OpenAI
from pydantic import BaseModel

openai_client = OpenAI(
    api_key="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"
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


@router.post("/check")
async def check(user_request: InputFormat):
    # Preformulate the input prompt based on the user request
    content_type = user_request.get("type", "message") or "message"
    source_url = user_request.get("source_url", "")
    content = user_request.get("content", "")
    from_user = user_request.get("from_user", "")
    group_chat = user_request.get("group_chat", "")

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
        """

            model="gpt-5.2",  # Using a model that supports structured outputs
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTIONS},
                {"role": "user", "content": input_prompt},
            ],
            output_type=FakeNewsAnalysisResult,
            temperature=0.7,
            tools=[
                {type: "web_search"},
            ],"""
        # Use OpenAI SDK with structured outputs
        completion = openai_client.responses.parse(
            model="gpt-5.2",
            tools=[
                {"type": "web_search"},
            ],
            input=[
                {"role": "system", "content": SYSTEM_INSTRUCTIONS},
                {"role": "user", "content": input_prompt},
            ],
            text_format=FakeNewsAnalysisResult,
        )

        # Extract the parsed response
        result = completion.output_parsed
        logger.info(f"Analysis completed: {completion.output}")

        return result

    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise
