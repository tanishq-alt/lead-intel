"""
B2B GTM Research: US/Canada companies using manual/paper-based employee onboarding.

Pure-Python pipeline (no LLM API limits):
  1. DDG search → raw URLs + snippets
  2. Keyword pre-filter on snippet
  3. Fetch + parse page with requests + BeautifulSoup
  4. Regex-find signal sentences → extract quote + company info
  5. Country heuristics → skip non-US/Canada

Usage: python scripts/manual_onboarding_research.py [--limit N]
Output: manual_onboarding_leads.csv
"""
import csv
import re
import sys
import time
from typing import Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from ddgs import DDGS

# ── Search queries ─────────────────────────────────────────────────────────────
SEARCH_QUERIES = [
    '"prepare new hire packets" HR coordinator job',
    '"new hire packet" "collect" "scan" HR coordinator',
    '"maintain physical personnel files" HR coordinator job',
    '"onboarding spreadsheet" OR "track new hires in excel" HR',
    '"bring completed paperwork" first day orientation HR',
    '"print and complete" "new hire paperwork" HR',
    '"manual data entry" "new hires" payroll HR administrator',
    '"scan and file" "employee documents" OR "personnel records" HR',
    '"new hire packet" filetype:pdf hospital',
    '"new hire packet" filetype:pdf "home care" OR "home health"',
    '"new hire packet" filetype:pdf "senior living" OR "assisted living"',
    '"new hire forms" filetype:pdf "return to" OR "email to" OR "fax to"',
    '"new hire paperwork" "home care" OR "home health" HR',
    '"onboarding paperwork" "senior living" OR "assisted living"',
    '"new hire forms" construction OR manufacturing HR coordinator',
    '"employee paperwork" "property management" HR coordinator',
    '"new hire packet" staffing logistics warehousing',
    '"paper new hire" OR "paper onboarding" healthcare company job',
    '"new employee packet" "complete and return" OR "sign and return" HR',
    '"complete paperwork" "before your first day" OR "before start date" HR',
]

# ── High-specificity signal patterns (regex → signal_type, label) ──────────────
SIGNAL_PATTERNS = [
    (re.compile(r"prepare\s+new.hire\s+packets?", re.I), "paper_packets", "prepare new hire packets"),
    (re.compile(r"collect\s+(completed\s+)?forms", re.I), "email_forms", "collect completed forms"),
    (re.compile(r"scan\s+(and\s+file|employee\s+documents?|personnel\s+records?)", re.I), "physical_files", "scan and file employee documents"),
    (re.compile(r"maintain\s+physical\s+personnel\s+files?", re.I), "physical_files", "maintain physical personnel files"),
    (re.compile(r"physical\s+personnel\s+files?", re.I), "physical_files", "physical personnel files"),
    (re.compile(r"(track\s+new\s+hires?\s+in\s+excel|onboarding\s+spreadsheet)", re.I), "spreadsheet", "track new hires in Excel / onboarding spreadsheet"),
    (re.compile(r"bring\s+(completed\s+)?paperwork", re.I), "in_person_paperwork", "bring completed paperwork"),
    (re.compile(r"print\s+and\s+complete.*new.hire", re.I), "paper_packets", "print and complete new hire forms"),
    (re.compile(r"manual\s+data\s+entry.*new\s+hire", re.I), "manual_data_entry", "manual data entry for new hires"),
    (re.compile(r"fax\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "fax completed forms"),
    (re.compile(r"mail\s+(completed\s+)?forms?\s+(back\s+)?to", re.I), "fax_mail", "mail completed forms"),
    (re.compile(r"email\s+completed\s+forms?\s+to", re.I), "email_forms", "email completed forms"),
    (re.compile(r"return\s+(completed\s+)?forms?\s+to", re.I), "email_forms", "return completed forms"),
    (re.compile(r"new.hire\s+packet", re.I), "paper_packets", "new hire packet"),
    (re.compile(r"new.employee\s+packet", re.I), "paper_packets", "new employee packet"),
    (re.compile(r"paper.based\s+onboarding", re.I), "paper_packets", "paper-based onboarding"),
    (re.compile(r"complete\s+paperwork\s+before\s+(your\s+)?first\s+day", re.I), "in_person_paperwork", "complete paperwork before first day"),
    (re.compile(r"complete\s+paperwork\s+before\s+(your\s+)?start\s+date", re.I), "in_person_paperwork", "complete paperwork before start date"),
    (re.compile(r"fillable\s+pdf.*new.hire", re.I), "paper_packets", "fillable PDF new hire forms"),
]

# ── Domains/hosts to skip ──────────────────────────────────────────────────────
SKIP_DOMAINS = {
    # Major job boards
    "linkedin", "indeed", "glassdoor", "zoominfo", "apollo", "ziprecruiter",
    "monster", "careerbuilder", "simplyhired", "salary", "payscale",
    "jobfind", "ajiriwa", "hirify", "jobted", "helpfuljobs", "jobwebtanzania",
    "ngojobsinafrica", "vacanciesinukraine", "kariyer", "untalent", "internshala",
    "velvetjobs", "resumeworded", "tealhq", "fishbowlapp", "glassdoor",
    "workopolis", "eluta", "jobbank", "jobboom",
    # HR software vendors
    "bamboohr", "gusto", "rippling", "adp", "paychex", "zenefits", "workday",
    "clickboarding", "onboardia", "sapling", "talmundo", "lessonly",
    "jotform", "typeform", "docusign", "adobe", "hellosign", "pandadoc",
    "onblick", "simplyfile", "approval.top",
    # Content / blog sites
    "shrm", "aihr", "hrcloud", "hrdive", "forbes", "businessinsider",
    "medium.com", "blogspot", "wordpress.com", "substack", "officeconsumer",
    "tinyteam.io", "formstack", "excelbundle", "filerequestpro", "lawire",
    "guideless", "ocrflow", "fill.io", "easyfill", "pinterest", "fiverr", "etsy",
    "slideshare", "scribd", "issuu",
    # Template/aggregator sites
    "vintti.com", "velvetjobs", "template", "sampleforms",
}

# Known non-US TLD patterns
NON_US_URL_PATTERNS = [
    r"\.(co\.tz|co\.ke|co\.za|co\.uk|co\.in|com\.au|co\.nz|co\.ng|com\.ng|"
    r"org\.tz|org\.ke|com\.br|com\.mx|com\.ph|com\.pk|net\.au)(/|$)",
    r"\.(de|fr|es|it|nl|pl|ru|tr|cn|jp|uk|au|in|ng|tz|ke|za)(/|$)",
]
NON_US_PAT = re.compile("|".join(NON_US_URL_PATTERNS), re.I)

SIGNAL_REASONS = {
    "paper_packets": "Uses physical new-hire packets — printing, filling, collecting paper forms.",
    "email_forms": "Distributes or collects onboarding forms via email with no digital workflow.",
    "spreadsheet": "Tracks onboarding progress in Excel/Sheets instead of an HRIS.",
    "physical_files": "Maintains physical personnel files — paper-based record keeping.",
    "manual_data_entry": "HR manually enters new hire data into payroll/HR systems from paper.",
    "fax_mail": "Sends or accepts onboarding documents by fax or mail.",
    "in_person_paperwork": "New hires complete paperwork on their first day — no e-signature.",
    "rfp_replacing_manual": "Published RFP or announcement to replace their manual onboarding.",
}

OUTREACH_ANGLES = {
    "paper_packets": "Replace your paper new-hire packets with mobile-first digital onboarding so new hires complete everything before day one.",
    "email_forms": "Eliminate the back-and-forth of emailing forms by letting new hires e-sign everything in one flow.",
    "spreadsheet": "Replace your Excel onboarding tracker with real-time visibility into every new hire's completion status.",
    "physical_files": "Digitize your physical personnel files to reduce compliance risk and free up HR time.",
    "manual_data_entry": "Eliminate manual data entry by having new hires self-serve their own info directly into your payroll system.",
    "fax_mail": "Replace fax/mail forms with a mobile onboarding link new hires complete in under 10 minutes.",
    "in_person_paperwork": "Let new hires complete all their paperwork digitally before day one — no stacks of paper on the first morning.",
    "rfp_replacing_manual": "You're already exploring paperless onboarding — let's show you how we get healthcare teams live in under a week.",
}

CSV_FIELDS = [
    "Company Name", "Verified Company Domain", "Official Website", "Country",
    "State or Province", "Industry", "Estimated Employee Count",
    "Exact Manual-Onboarding Signal", "Exact Evidence Quote",
    "Reason This Indicates Manual Onboarding", "Signal Type",
    "Evidence Source Title", "Verified Evidence Link", "Evidence Date",
    "Confidence Level", "Recommended Outreach Angle",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

INDUSTRY_KEYWORDS = {
    "Healthcare / Home Care": ["home care", "home health", "hospice", "medical center", "hospital", "clinic", "health system", "healthcare"],
    "Senior Living": ["senior living", "assisted living", "memory care", "skilled nursing", "nursing home", "long-term care"],
    "Manufacturing": ["manufacturing", "plant", "factory", "production", "warehouse", "fabricat"],
    "Construction": ["construction", "contractor", "builder", "trades", "subcontract"],
    "Logistics / Warehousing": ["logistics", "warehousing", "distribution", "fulfillment", "freight", "shipping"],
    "Staffing": ["staffing", "temp agency", "temporary placement", "workforce solutions"],
    "Hospitality": ["hotel", "hospitality", "restaurant", "food service", "catering"],
    "Property Management": ["property management", "real estate", "apartment", "residential"],
    "Education / Childcare": ["school", "childcare", "daycare", "early education", "university", "college"],
    "Retail": ["retail", "store", "merchandise"],
}


def should_skip_url(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return True
    if any(skip in host for skip in SKIP_DOMAINS):
        return True
    if NON_US_PAT.search(url):
        return True
    return False


def detect_industry(text: str) -> str:
    t = text.lower()
    for industry, kws in INDUSTRY_KEYWORDS.items():
        if any(kw in t for kw in kws):
            return industry
    return "General Business"


def extract_quote(text: str, match: re.Match, context_chars: int = 250) -> str:
    """Extract the sentence containing the match plus surrounding context."""
    start = max(0, match.start() - context_chars)
    end = min(len(text), match.end() + context_chars)
    snippet = text[start:end].strip()
    # Find the sentence boundary
    sentences = re.split(r'(?<=[.!?])\s+', snippet)
    # Return the sentences that overlap with the match
    relevant = [s for s in sentences if match.re.search(s)]
    if relevant:
        return " ".join(relevant[:3]).strip()
    return snippet[:400].strip()


def extract_state(text: str) -> str:
    """Try to find a US state abbreviation or name in the text."""
    us_states = {
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
        "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
        "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
        "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
        "WI", "WY", "DC",
    }
    m = re.search(r'\b(' + '|'.join(us_states) + r')\b', text)
    return m.group(1) if m else ""


def fetch_page(url: str, timeout: int = 10) -> Optional[str]:
    """Fetch a URL and return plain text, or None on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        if resp.status_code != 200:
            return None
        ct = resp.headers.get("content-type", "")
        if "pdf" in ct or url.lower().endswith(".pdf"):
            try:
                import io
                from pdfminer.high_level import extract_text
                return extract_text(io.BytesIO(resp.content))
            except Exception:
                return None
        soup = BeautifulSoup(resp.text, "html.parser")
        # Remove script/style
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(" ", strip=True)
    except Exception:
        return None


def extract_company_name(soup_title: str, url: str) -> str:
    """Best-effort company name extraction from page title and URL."""
    if soup_title:
        # "HR Coordinator at ACME Corp | Greenhouse" → "ACME Corp"
        m = re.search(r'\bat\s+([^|–\-]+)', soup_title, re.I)
        if m:
            return m.group(1).strip()
        # Fallback: first segment before pipe/dash
        parts = re.split(r'[|–\-]', soup_title)
        if len(parts) > 1:
            return parts[-1].strip() or parts[0].strip()
    # Fallback: domain name
    host = urlparse(url).netloc.replace("www.", "").split(".")[0]
    return host.replace("-", " ").title()


URL_PACKET_PAT = re.compile(r"(new.hire.packet|new.employee.packet|newhire.packet|new_hire_packet)", re.I)


def url_is_company_packet(url: str) -> bool:
    """Return True if the URL path strongly suggests a company new-hire packet PDF."""
    if not url.lower().endswith(".pdf"):
        return False
    path = urlparse(url).path.lower()
    return bool(URL_PACKET_PAT.search(path))


def analyze_page(url: str, title: str) -> Optional[dict]:
    """Fetch + analyze a page for manual onboarding signals. Returns result dict or None."""
    text = fetch_page(url)
    if not text or len(text) < 100:
        return None

    # Find the first matching signal pattern
    for pattern, signal_type, signal_label in SIGNAL_PATTERNS:
        m = pattern.search(text)
        if m:
            quote = extract_quote(text, m)
            # Skip if quote looks like generic blog content
            if any(vendor in quote.lower() for vendor in ["bamboohr", "gusto", "rippling", "workday software", "hris system", "our platform"]):
                continue

            state = extract_state(text[:3000])
            industry = detect_industry(text[:5000] + title)

            # Confidence: High if this is a job posting or official doc, Medium otherwise
            is_job_posting = any(kw in text[:2000].lower() for kw in
                                 ["responsibilities", "qualifications", "requirements", "job description",
                                  "duties", "we are looking for", "we're looking for", "you will"])
            is_official_doc = url.endswith(".pdf") or ".edu/" in url or ".org/" in url or ".gov/" in url

            confidence = "High" if (is_job_posting or is_official_doc) else "Medium"

            return {
                "signal_type": signal_type,
                "signal": signal_label,
                "quote": quote,
                "state_province": state,
                "industry": industry,
                "confidence": confidence,
                "text_sample": text[:3000],  # for company name extraction
            }
    return None


def get_page_title(url: str) -> str:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)
        if resp.status_code != 200:
            return ""
        soup = BeautifulSoup(resp.text, "html.parser")
        t = soup.find("title")
        return t.get_text(strip=True) if t else ""
    except Exception:
        return ""


def ddg_search(query: str, max_results: int = 8) -> list[dict]:
    try:
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))
    except Exception as e:
        print(f"  DDG error: {e}", file=sys.stderr)
        return []


def to_csv_row(r: dict) -> dict:
    st = r.get("signal_type", "")
    return {
        "Company Name": r.get("company_name", ""),
        "Verified Company Domain": r.get("domain", ""),
        "Official Website": r.get("website", ""),
        "Country": r.get("country", "US"),
        "State or Province": r.get("state_province", ""),
        "Industry": r.get("industry", ""),
        "Estimated Employee Count": r.get("employee_count", ""),
        "Exact Manual-Onboarding Signal": r.get("signal", ""),
        "Exact Evidence Quote": r.get("quote", ""),
        "Reason This Indicates Manual Onboarding": SIGNAL_REASONS.get(st, r.get("signal", "")),
        "Signal Type": st,
        "Evidence Source Title": r.get("source_title", ""),
        "Verified Evidence Link": r.get("source_url", ""),
        "Evidence Date": r.get("evidence_date", ""),
        "Confidence Level": r.get("confidence", ""),
        "Recommended Outreach Angle": OUTREACH_ANGLES.get(st, ""),
    }


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else len(SEARCH_QUERIES)
    queries = SEARCH_QUERIES[:limit]
    output_file = "manual_onboarding_leads.csv"

    seen_urls: set[str] = set()
    seen_domains: set[str] = set()
    leads: list[dict] = []

    print("B2B GTM Research — manual employee onboarding signals")
    print(f"Mode: Pure Python (no LLM)  |  Queries: {len(queries)}  |  Out: {output_file}")
    print("=" * 68)

    for qi, query in enumerate(queries, 1):
        print(f"\n[{qi}/{len(queries)}] {query[:72]}...")
        results = ddg_search(query, max_results=8)

        candidates = []
        for r in results:
            url = r.get("href", "")
            title = r.get("title", "")
            body = r.get("body", "")
            if not url or url in seen_urls:
                continue
            if should_skip_url(url):
                continue
            # Pre-filter: signal must appear in snippet OR title
            snippet_text = (title + " " + body).lower()
            has_sig = any(pat.search(snippet_text) for pat, _, _ in SIGNAL_PATTERNS)
            if not has_sig:
                continue
            seen_urls.add(url)
            candidates.append({"url": url, "title": title, "body": body})

        print(f"  DDG: {len(results)}  →  candidates: {len(candidates)}")

        for c in candidates:
            host = urlparse(c["url"]).netloc.lower().replace("www.", "")
            domain = host
            if domain in seen_domains:
                continue

            print(f"  Analyzing: {c['url'][:80]}...")

            # Fast-path: URL itself is strong evidence (e.g. company.com/New-Hire-Packet.pdf)
            if url_is_company_packet(c["url"]):
                result = {
                    "signal_type": "paper_packets",
                    "signal": "new hire packet PDF hosted on company domain",
                    "quote": f"Company hosts a new hire packet PDF at: {c['url']}",
                    "state_province": "",
                    "industry": detect_industry(c["title"]),
                    "confidence": "High",
                    "text_sample": c["title"],
                }
            else:
                result = analyze_page(c["url"], c["title"])
            time.sleep(1)

            if not result:
                continue

            # Fetch title for company name extraction (if we don't already have it from DDG)
            page_title = c["title"] or get_page_title(c["url"])
            company_name = extract_company_name(page_title, c["url"])

            # Skip if company name looks like a generic site
            if any(skip in company_name.lower() for skip in ["resume", "job board", "jobs", "hiring", "recrui"]):
                continue

            seen_domains.add(domain)
            lead = {
                "company_name": company_name,
                "domain": domain,
                "website": f"https://{host}",
                "country": "US",
                "state_province": result["state_province"],
                "industry": result["industry"],
                "employee_count": "",
                "signal": result["signal"],
                "quote": result["quote"],
                "signal_type": result["signal_type"],
                "source_title": page_title,
                "source_url": c["url"],
                "evidence_date": "",
                "confidence": result["confidence"],
            }
            leads.append(to_csv_row(lead))
            print(f"  ✓ {company_name} [{result['confidence']}] — {result['signal']}")

    print(f"\n{'=' * 68}")
    print(f"Total leads: {len(leads)}")

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(leads)

    print(f"Saved → {output_file}")
    if leads:
        print("\nPreview:")
        for lead in leads:
            print(f"  • {lead['Company Name']} ({lead['Verified Company Domain']}) "
                  f"[{lead['Confidence Level']}] — {lead['Signal Type']}")


if __name__ == "__main__":
    main()
