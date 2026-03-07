import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

NEWSAPI_BASE_URL = "https://newsapi.org/v2"
NEWSAPI_KEY = "e02bbe19442e4ebdaee6cb7a52fdc94d"


class NewsAPIService:
    """Service for querying NewsAPI to verify message content against news articles."""

    def __init__(self, api_key: str = NEWSAPI_KEY, base_url: str = NEWSAPI_BASE_URL):
        self.api_key = api_key
        self.base_url = base_url

    async def search_articles(
        self,
        query: str,
        from_date: Optional[str] = None,
        sort_by: str = "popularity",
        language: str = "en",
        to_date: str | None = None
    ) -> dict:
        """
        Search for articles matching the query.

        Args:
            query: Search keywords or phrase
            from_date: Start date for articles (YYYY-MM-DD format)
                        to_date: End date for articles (YYYY-MM-DD format)

            sort_by: Sort order - 'popularity', 'relevancy', or 'publishedAt'
            language: Language code (default 'en' for English)

        Returns:
            JSON response from NewsAPI
        """
        if from_date is None:
            # Default to last 7 days
            from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        if to_date is None:
        # Default to today
            to_date = (datetime.now() ).strftime("%Y-%m-%d")

        url = f"{self.base_url}/everything"
        params = {
            "q": query,
            "from": from_date,
            "to": to_date,
            "sortBy": sort_by,
            "apiKey": self.api_key,
            "language": language,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                result = response.json()
                logger.info(f"Found {result.get('totalResults', 0)} articles for query: {query}")
                return result
            except httpx.HTTPError as e:
                logger.error(f"NewsAPI HTTP error: {e}")
                return {"status": "error", "message": str(e), "articles": []}
            except Exception as e:
                logger.error(f"NewsAPI error: {e}")
                return {"status": "error", "message": str(e), "articles": []}

    async def search_top_headlines(
        self,
        query: Optional[str] = None,
        country: str = "sg",
        category: Optional[str] = None,
    ) -> dict:
        """
        Search for top headlines.

        Args:
            query: Search keywords or phrase
            country: Country code (default 'sg' for Singapore)
            category: Category like 'general', 'business', 'health', etc.

        Returns:
            JSON response from NewsAPI
        """
        url = f"{self.base_url}/top-headlines"
        params = {
            "country": country,
            "apiKey": self.api_key,
        }

        if query:
            params["q"] = query
        if category:
            params["category"] = category

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                result = response.json()
                logger.info(f"Found {result.get('totalResults', 0)} headlines")
                return result
            except httpx.HTTPError as e:
                logger.error(f"NewsAPI HTTP error: {e}")
                return {"status": "error", "message": str(e), "articles": []}
            except Exception as e:
                logger.error(f"NewsAPI error: {e}")
                return {"status": "error", "message": str(e), "articles": []}

    async def verify_claim(self, claim_text: str, from_date: str | None = None, to_date: str | None= None) -> dict:
        """
        Verify a claim by searching for related news articles.

        Args:
            claim_text: The claim/message content to verify

        Returns:
            Verification result with related articles and credibility score
        """
        # Extract key terms from claim (simple keyword extraction)
        # In production, this could use NLP for better keyword extraction
        logger.info(f"verify claim {claim_text}")
        # search_query = self._extract_search_terms(claim_text)

        # Search for articles
        articles_result = await self.search_articles(query=claim_text, from_date=from_date, to_date=to_date)
        # headlines_result = await self.search_top_headlines(query=search_query)

        # Combine and analyze results
        articles = articles_result.get("articles", [])
        # headlines = headlines_result.get("articles", [])

        # Find relevant articles
        relevant_articles = self._find_relevant_articles(
            claim_text, articles 
        )
        logger.info(str(relevant_articles))

        return {
            "query": claim_text,
            "total_results": articles_result.get("totalResults", 0),
           # + headlines_result.get("totalResults", 0),
            "relevant_articles": relevant_articles,
            "verification_status": self._assess_credibility(claim_text, relevant_articles),
        }

    def _extract_search_terms(self, text: str) -> str:
        """
        Extract key search terms from text.
        Simple implementation - could be enhanced with NLP.
        """
        # Remove common words and extract meaningful terms
        # For now, just use the first 50 chars as a simple approach
        # In production, use proper keyword extraction
        words = text.split()
        # Filter out very short words and common stopwords
        stopwords = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "shall",
            "can", "need", "dare", "ought", "used", "to", "of", "in",
            "for", "on", "with", "at", "by", "from", "as", "into",
            "through", "during", "before", "after", "above", "below",
            "between", "under", "again", "further", "then", "once",
            "here", "there", "when", "where", "why", "how", "all",
            "each", "few", "more", "most", "other", "some", "such",
            "no", "nor", "not", "only", "own", "same", "so", "than",
            "too", "very", "just", "and", "but", "if", "or", "because",
            "until", "while", "although", "though", "after", "before"
        }
        meaningful_words = [
            word for word in words
            if len(word) > 3 and word.lower() not in stopwords
        ]

        # Take top 10 meaningful words
        search_terms = " ".join(meaningful_words[:10])

        # Fallback to original text if no meaningful words found
        if not search_terms:
            search_terms = text[:100]

        return search_terms

    def _find_relevant_articles(self, claim: str, articles: list) -> list:
        """
        Find articles relevant to the claim.
        """
        claim_lower = claim.lower()
        relevant = []

        for article in articles[:10]:  # Check top 10 articles
            title = article.get("title", "").lower()
            description = article.get("description", "").lower()
            content = article.get("content", "").lower()

            # Simple relevance scoring based on keyword overlap
            score = 0

            # Check if article title matches claim keywords
            for word in claim.split():
                if len(word) > 3 and word.lower() in title:
                    score += 2
                if len(word) > 3 and word.lower() in description:
                    score += 1

            if score > 0:
                relevant.append({
                    "title": article.get("title", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "url": article.get("url", ""),
                    "published_at": article.get("publishedAt", ""),
                    "relevance_score": score,
                })

        # Sort by relevance score
        relevant.sort(key=lambda x: x["relevance_score"], reverse=True)
        return relevant[:5]  # Return top 5 most relevant

    def _assess_credibility(self, claim: str, articles: list) -> str:
        """
        Assess credibility based on found articles.
        """
        if not articles:
            return "unverified"

        # Check for high-relevance articles from credible sources
        credible_sources = {
            "straits times", "channel newsasia", "cna", "mothership",
            "today online", "gov.sg", "reuters", "bloomberg", "bbc",
            "cnn", "associated press", "ap news"
        }

        has_credible_match = False
        for article in articles:
            source = article.get("source", "").lower()
            if any(cred in source for cred in credible_sources):
                has_credible_match = True
                break

        if has_credible_match and articles[0].get("relevance_score", 0) >= 4:
            return "corroborated"
        elif articles:
            return "partially_verified"
        else:
            return "unverified"


# Singleton instance
news_api_service = NewsAPIService()
