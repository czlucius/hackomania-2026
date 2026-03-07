import json
import logging
from datetime import datetime
from typing import TypedDict

from fastapi import APIRouter
from openai import AsyncOpenAI, OpenAI
from pydantic import BaseModel
from exa_py import Exa

openai_client = OpenAI(
    api_key="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"
)
exa_client = Exa(api_key="2a0c3fae-a2b1-4bb1-a5b9-d6c97cb0770b")

SYSTEM_INSTRUCTIONS = """
You are SureBoh.ai, a specialized fact-checking assistant for Singapore. Your task is to analyze content for misinformation and verify claims against official Singaporean data and credible news.


Guidelines for Classes:
1. "Likely accurate": Use this for claims that are widely documented facts or reputable news sources. Be decisive.
2. "Potentially misleading": Use this if the claim is demonstrably false, a known scam, or a manipulated narrative.
3. "Unverified / uncertain": Use only if the claim is truly ambiguous, a personal anecdote without evidence, or outside your knowledge base.

Multi-language Requirement:
- You MUST provide the analysis in English (top-level fields), Chinese (in the `zh` field), and Malay (in the `ms` field).
- Ensure translations are professional and contextually accurate for Singapore.

Analysis Logic:
- For Singapore news (e.g., cigarette seizures at Changi, arrests, health advisories), if the location/numbers/dates match known reports, mark as "Likely accurate".
- For global news, mark accurate info as "Likely accurate"
- Do not require excessive specific details to be marked as "Likely accurate"
- Check for local context: cultural refere"nces, Singlish, and local acronyms.
- Provide a clear explanation contrasting misinformation with reality.
- Link to gov.sg or official channels if possible in the explanation.

Tool Usage:
- Use the exa_search function to search the web for current information that can verify or debunk claims.
- Compare the message content against search results to assess credibility.
- Consider the source, date, and relevance of articles when making your determination.
- Specify the date of the event in relation to the message content and the message may not be a recent news
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
    potential_harm: str | None
    recommended_action: str
    zh: Translation
    ms: Translation


class NewsVerificationResult(BaseModel):
    query: str
    total_results: int
    relevant_articles: list[dict]
    verification_status: str  # "corroborated", "partially_verified", "unverified"


def exa_search(query: str) -> str:
    """
    Search the web for current information using Exa.
    Use this tool to verify claims against recent news and web content.

    Args:
        query: Search keywords or claim to verify

    Returns:
        Formatted string with search results (title and URL for each result)
    """
    results = exa_client.search_and_contents(
        query,
        type="auto",
        num_results=10,
        highlights={"max_characters": 4000}
    )
    return "\n".join([f"{r.title}: {r.url}" for r in results.results])


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
        # Get current date/time for context 
        system_prompt_with_date = f"{SYSTEM_INSTRUCTIONS}"

        # Define the function tool for Exa search
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "exa_search",
                    "description": "Search the web for current information to verify claims against recent news and web content",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search keywords or claim to verify",
                            }
                        },
                        "required": ["query"],
                    },
                },
            }
        ]

        # First, call OpenAI to get function call decision
        response = openai_client.chat.completions.create(
            model="gpt-5.2",
            messages=[
                {"role": "system", "content": system_prompt_with_date},
                {"role": "user", "content": input_prompt},
            ],
            tools=tools,
            tool_choice="auto",
        )

        message = response.choices[0].message
        final_messages = [
            {"role": "system", "content": system_prompt_with_date},
            {"role": "user", "content": input_prompt},
        ]

        # Add assistant message (handle case where content is None due to tool call)
        assistant_message = {"role": "assistant"}
        if message.content:
            assistant_message["content"] = message.content
        if message.tool_calls:
            assistant_message["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in message.tool_calls
            ]
        final_messages.append(assistant_message)

        # If model wants to call the function, execute it and continue
        if message.tool_calls:
            for tool_call in message.tool_calls:
                if tool_call.function.name == "exa_search":
                    args = json.loads(tool_call.function.arguments)
                    logger.info(args)
                    search_results = exa_search(args["query"])

                    # Add function result to conversation
                    final_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": tool_call.function.name,
                            "content": search_results,
                        }
                    )

            # Get final analysis with function results
            completion = openai_client.beta.chat.completions.parse(
                model="gpt-5.2",
                messages=final_messages,
                response_format=FakeNewsAnalysisResult,
            )
            result = completion.choices[0].message.parsed
        else:
            # No tool call needed, parse directly
            completion = openai_client.beta.chat.completions.parse(
                model="gpt-5.2",
                messages=final_messages,
                response_format=FakeNewsAnalysisResult,
            )
            result = completion.choices[0].message.parsed

        logger.info(f"Analysis completed for query")
        return result

    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        raise
