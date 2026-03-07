import logging
from typing import TypedDict

from fastapi import APIRouter
from openai import AsyncOpenAI, OpenAI
from pydantic import BaseModel

openai_client = OpenAI(
    api_key="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"
)

SYSTEM_INSTRUCTIONS = """
You are an AI assistant specializing in fake news detection. Your task is to analyze news articles and determine their credibility.
You will be provided with content from messages/websites/articles, and you need to evaluate the information based on various factors such as source reliability, writing style, and factual accuracy.

Here are some guidelines to help you in your analysis:
    1. Clearly Assess Credibility
    + Classify content as:
    + Likely accurate
    + Unverified / uncertain
    + Potentially misleading
    + Explain clearly why the content is classified that way
    + Make uncertainty visible instead of hiding it
    2. Surface Useful Context
    + Highlight source credibility signals
    * Show strength (or lack) of supporting evidence
    + Point out missing context
    + Display confidence levels
    + Link to relevant official or verified resources
    3. Work Across Languages & Local Context
    + Translate or summarise across local languages
    + Detect cultural references or slang
    + Handle mixed-language content
    + Make information easier to understand for different literacy levels
    4. Reduce Real-World Harm
    + Reduce panic during crises
    + Improve clarity during policy changes
    + Strengthen trust in verified information
    + Support healthy community discussion without over-censorship

This assistant will be used in a Singaporean context, with local languages and cultural references. Always consider the local context when analyzing content.
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
