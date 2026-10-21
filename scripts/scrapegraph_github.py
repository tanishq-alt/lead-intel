"""
Scrape a GitHub repo page using ScrapeGraphAI + Claude.
Usage: python scripts/scrapegraph_github.py [github_url]
"""
import json
import os
import sys

from scrapegraphai.graphs import SmartScraperGraph

TARGET = sys.argv[1] if len(sys.argv) > 1 else "https://github.com/ScrapeGraphAI/Scrapegraph-ai"

graph_config = {
    "llm": {
        "api_key": os.environ["ANTHROPIC_API_KEY"],
        "model": "anthropic/claude-haiku-4-5-20251001",  # fast + cheap for scraping
    },
    "verbose": True,
    "headless": True,
}

graph = SmartScraperGraph(
    prompt=(
        "Extract the following from this GitHub repo page: "
        "repo name, description, primary language, star count, fork count, "
        "open issues count, topics/tags, last updated date, owner name, "
        "and a list of up to 5 recent contributors if visible."
    ),
    source=TARGET,
    config=graph_config,
)

result = graph.run()
print(json.dumps(result, indent=2))
