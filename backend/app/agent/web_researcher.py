"""
Web Researcher Agent for RyzeCanvas.
Node 1.8: The Image & Asset Discovery Authority.

This agent searches the web for relevant images, icons, and visual references
that can be used in the generated project. It provides real image URLs
to the CodeSmith so generated pages use real visuals instead of placeholders.
"""
import json
import re
import asyncio
from typing import Dict, Any, List, Optional

import httpx


# ──────────────────────────────────────────
# Image Search via DuckDuckGo (no API key)
# ──────────────────────────────────────────

async def search_images(query: str, max_results: int = 6) -> List[Dict[str, str]]:
    """
    Search for images using DuckDuckGo's image API.
    Returns a list of dicts with 'url', 'title', and 'source'.
    """
    results = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Step 1: Get the vqd token from DuckDuckGo
            token_resp = await client.get(
                "https://duckduckgo.com/",
                params={"q": query},
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            # Extract vqd token from the response
            vqd_match = re.search(r'vqd=["\']([^"\']+)', token_resp.text)
            if not vqd_match:
                print(f"[WebResearcher] Could not extract vqd token for query: {query}")
                return _fallback_images(query, max_results)
            
            vqd = vqd_match.group(1)
            
            # Step 2: Search for images
            img_resp = await client.get(
                "https://duckduckgo.com/i.js",
                params={
                    "l": "us-en",
                    "o": "json",
                    "q": query,
                    "vqd": vqd,
                    "f": ",,,,,",
                    "p": "1",
                },
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            
            if img_resp.status_code == 200:
                data = img_resp.json()
                for item in data.get("results", [])[:max_results]:
                    results.append({
                        "url": item.get("image", ""),
                        "thumbnail": item.get("thumbnail", ""),
                        "title": item.get("title", ""),
                        "source": item.get("source", ""),
                        "width": item.get("width", 0),
                        "height": item.get("height", 0),
                    })
    except Exception as e:
        print(f"[WebResearcher] Image search error: {e}")
    
    if not results:
        return _fallback_images(query, max_results)
    
    return results


def _fallback_images(query: str, max_results: int = 6) -> List[Dict[str, str]]:
    """
    Fallback: Use Unsplash Source API (no key required) to get relevant images.
    These are always valid, high-quality, and free to use.
    """
    # Clean query for URL
    clean_query = re.sub(r'[^a-zA-Z0-9 ]', '', query).strip().replace(' ', ',')
    results = []
    
    sizes = [
        (1200, 800),
        (800, 600),
        (600, 400),
        (1200, 600),
        (800, 800),
        (400, 300),
    ]
    
    for i in range(min(max_results, len(sizes))):
        w, h = sizes[i]
        results.append({
            "url": f"https://source.unsplash.com/{w}x{h}/?{clean_query}&sig={i}",
            "thumbnail": f"https://source.unsplash.com/400x300/?{clean_query}&sig={i}",
            "title": f"{query} image {i+1}",
            "source": "unsplash",
            "width": w,
            "height": h,
        })
    
    return results


async def search_web_info(query: str) -> Dict[str, Any]:
    """
    Search DuckDuckGo for general web information about a topic.
    Returns structured text data that can inform code generation.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json"},
                headers={"User-Agent": "RyzeCanvas"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "abstract": data.get("AbstractText", ""),
                    "heading": data.get("Heading", ""),
                    "image": data.get("Image", ""),
                    "related_topics": [
                        {
                            "text": topic.get("Text", ""),
                            "url": topic.get("FirstURL", ""),
                        }
                        for topic in data.get("RelatedTopics", [])[:5]
                        if isinstance(topic, dict) and topic.get("Text")
                    ]
                }
    except Exception as e:
        print(f"[WebResearcher] Web info search error: {e}")
    
    return {"abstract": "", "heading": "", "image": "", "related_topics": []}


# ──────────────────────────────────────────
# Web Researcher Agent Class
# ──────────────────────────────────────────

class WebResearcherAgent:
    """
    Node 1.8: The Web Researcher.
    
    Responsibilities:
    1. Analyze the project manifest to determine what images/assets are needed.
    2. Search the web for relevant high-quality images.
    3. Return a mapping of asset names to real image URLs.
    4. Optionally search for contextual information about the project topic.
    """
    
    def __init__(self):
        self.found_images: Dict[str, str] = {}
        self.web_context: str = ""
    
    async def research(self, manifest: Dict[str, Any], prompt: str) -> Dict[str, Any]:
        """
        Main entry point. Analyzes the manifest and prompt to search for 
        relevant images and contextual web data.
        
        Returns:
            {
                "images": {"hero": "url", "feature1": "url", ...},
                "image_list": [{"url": ..., "title": ..., ...}],
                "web_context": "text summary from the web"
            }
        """
        project_name = manifest.get("projectName", "")
        design_system = manifest.get("designSystem", {})
        
        # Build search queries based on the prompt and manifest
        search_queries = self._build_search_queries(prompt, project_name, manifest)
        
        # Run image searches in parallel
        all_images = []
        tasks = [search_images(q, max_results=3) for q in search_queries[:4]]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, list):
                all_images.extend(result)
        
        # Deduplicate by URL
        seen_urls = set()
        unique_images = []
        for img in all_images:
            if img["url"] and img["url"] not in seen_urls:
                seen_urls.add(img["url"])
                unique_images.append(img)
        
        # Create named image mapping for the CodeSmith
        image_mapping = {}
        for i, img in enumerate(unique_images[:8]):
            key = f"image_{i+1}"
            if i == 0:
                key = "hero_image"
            elif i == 1:
                key = "feature_image_1"
            elif i == 2:
                key = "feature_image_2"
            elif i == 3:
                key = "about_image"
            image_mapping[key] = img["url"]
        
        self.found_images = image_mapping
        
        # Also grab web context
        web_info = await search_web_info(prompt)
        self.web_context = web_info.get("abstract", "")
        
        return {
            "images": image_mapping,
            "image_list": unique_images[:8],
            "web_context": self.web_context,
            "web_info": web_info,
        }
    
    def _build_search_queries(self, prompt: str, project_name: str, manifest: Dict) -> List[str]:
        """Build smart search queries from the prompt and manifest."""
        queries = []
        
        # Primary query based on user prompt
        # Extract key terms (remove common words)
        stop_words = {"build", "create", "make", "a", "an", "the", "with", "for", "and", "or", "page", "website", "app"}
        words = [w for w in prompt.lower().split() if w not in stop_words and len(w) > 2]
        primary_topic = " ".join(words[:5])
        
        if primary_topic:
            queries.append(f"{primary_topic} high quality photo")
            queries.append(f"{primary_topic} modern design")
        
        # Project-specific queries
        if project_name:
            queries.append(f"{project_name} professional")
        
        # Feature-specific queries from the manifest
        features = manifest.get("features", [])
        if features:
            for feature in features[:2]:
                if isinstance(feature, str):
                    queries.append(f"{feature} icon illustration")
                elif isinstance(feature, dict):
                    queries.append(f"{feature.get('name', '')} illustration")
        
        # Fallback
        if not queries:
            queries = [f"{prompt} stock photo", f"{prompt} illustration"]
        
        return queries


def get_web_researcher() -> WebResearcherAgent:
    """Factory function for the Web Researcher agent."""
    return WebResearcherAgent()
