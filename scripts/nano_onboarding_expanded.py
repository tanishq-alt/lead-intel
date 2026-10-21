"""
Expanded B2B GTM Research: US/Canada companies using manual/paper-based (nano) onboarding.

Runs 60+ targeted DDG queries across industries, fetches pages, extracts evidence.
Output: nano_onboarding_leads_expanded.csv
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

# ── 60+ Search queries across industries ──────────────────────────────────────
SEARCH_QUERIES = [
    # Healthcare
    '"new hire packet" filetype:pdf hospital OR "medical center" OR "health system"',
    '"new hire packet" filetype:pdf "home care" OR "home health" OR hospice',
    '"new hire packet" filetype:pdf "senior living" OR "assisted living" OR "nursing home"',
    '"new employee packet" filetype:pdf hospital OR clinic OR healthcare',
    '"onboarding paperwork" "senior living" OR "assisted living" OR "memory care"',
    '"complete paperwork" "before your first day" healthcare hospital',
    '"new hire forms" "return to HR" hospital OR clinic',
    '"bring completed paperwork" healthcare clinic OR hospital',
    # Manufacturing / Industrial
    '"new hire packet" filetype:pdf manufacturing OR factory OR plant',
    '"new hire forms" construction contractor OR builder',
    '"employee paperwork" manufacturing "complete and return" OR "sign and return"',
    '"new hire packet" warehousing OR logistics OR distribution',
    '"onboarding paperwork" manufacturing OR "sheet metal" OR "metal fabricat"',
    '"new hire checklist" "manual" OR "paper forms" manufacturing',
    '"complete paperwork" "first day" manufacturing OR plant OR factory',
    # Staffing & Temp
    '"new hire packet" staffing OR "temp agency" OR "temporary placement"',
    '"complete your new hire paperwork" staffing OR workforce',
    '"onboarding documents" "fax to" OR "email to" staffing',
    '"new hire packet" "home care" staffing OR caregiver',
    # Construction & Trades
    '"new hire packet" filetype:pdf construction OR contracting',
    '"employee paperwork" "bring to" OR "return to" construction OR trades',
    '"new hire forms" "subcontractor" OR "union" construction',
    '"onboarding paperwork" "construction" OR "electrician" OR "plumber"',
    # Property Management / Real Estate
    '"new hire packet" "property management" OR "real estate"',
    '"employee paperwork" "property management" OR apartment OR residential',
    '"onboarding forms" "property management" site:.com',
    # Education & Childcare
    '"new hire packet" filetype:pdf school OR university OR "community college"',
    '"new employee packet" filetype:pdf "school district" OR "charter school"',
    '"new hire forms" "childcare" OR "daycare" OR "early childhood"',
    '"complete paperwork" "first day" school OR district OR "K-12"',
    '"new hire packet" "complete and return" school OR district',
    # Nonprofit & Social Services
    '"new hire packet" filetype:pdf nonprofit OR "social services" OR charity',
    '"employee paperwork" "nonprofit" "complete and return"',
    '"new hire forms" "faith-based" OR church OR "community organization"',
    '"new hire packet" filetype:pdf "social services" OR "community health"',
    # Hospitality & Food Service
    '"new hire packet" hotel OR hospitality OR restaurant',
    '"employee paperwork" hotel OR resort OR "food service"',
    '"bring completed paperwork" hotel OR restaurant OR hospitality',
    '"new hire forms" "catering" OR "food service" OR restaurant',
    # Retail
    '"new hire packet" retail OR store OR "grocery store"',
    '"employee paperwork" "bring to" retail OR "department store"',
    '"new hire checklist" retail OR "point of sale" OR store',
    # Government & Public Sector
    '"new hire packet" filetype:pdf city OR county OR municipality',
    '"new employee packet" filetype:pdf government OR "public sector"',
    '"employee paperwork" "government" "complete and return"',
    # Dental & Veterinary
    '"bring completed paperwork" dental OR dentist OR orthodontist',
    '"new hire packet" filetype:pdf dental OR veterinary OR "vet clinic"',
    '"new patient paperwork" "bring to" dental OR orthodontic',
    # Physical Therapy / Chiropractic
    '"bring completed paperwork" "physical therapy" OR chiropractic OR "PT clinic"',
    '"new patient forms" "complete and bring" OR "print and bring" physical therapy',
    '"new hire packet" filetype:pdf "physical therapy" OR chiropractic',
    # High-signal job posting terms
    '"prepare new hire packets" HR coordinator OR "HR generalist"',
    '"maintain physical personnel files" HR job OR coordinator',
    '"manual data entry" "new hires" payroll OR HR',
    '"scan and file" "employee documents" OR "personnel records" HR',
    '"onboarding spreadsheet" OR "track new hires in excel" HR manager',
    '"new hire paperwork" "email completed" OR "fax completed" HR',
    '"collect signed" "new hire" OR "employee" forms HR coordinator',
    # Specific signal: in-person HR appointment
    '"report to HR" "first day" OR "before starting" new hire',
    '"visit HR" "complete" OR "bring" paperwork new hire',
    '"HR appointment" "new hire" OR "onboarding" forms paper',
    # Public-hosted PDF packets
    '"new hire packet" site:.org filetype:pdf',
    '"new hire packet" site:.edu filetype:pdf',
    '"new employee packet" filetype:pdf site:.com',
    # Direct domain signals
    '"new-hire-packet.pdf" OR "new_hire_packet.pdf" site:.com',
    '"NewHirePacket.pdf" OR "new-hire-forms.pdf" company',
    '"employee-packet.pdf" OR "EmployeePacket.pdf" company HR',
    # Pain point / buying signal
    '"tired of paper onboarding" OR "paper-based onboarding" problem',
    '"looking for onboarding software" replace paper OR manual',
    '"still using paper" onboarding HR coordinator',
    '"excel spreadsheet" onboarding "new hires" company HR',
    '"fax" onboarding forms new hire company HR',
]

SIGNAL_PATTERNS = [
    (re.compile(r"prepare\s+new.hire\s+packets?", re.I), "paper_packets", "prepare new hire packets"),
    (re.compile(r"collect\s+(completed\s+)?forms", re.I), "email_forms", "collect completed forms"),
    (re.compile(r"scan\s+(and\s+file|employee\s+documents?|personnel\s+records?)", re.I), "physical_files", "scan and file employee documents"),
    (re.compile(r"maintain\s+physical\s+personnel\s+files?", re.I), "physical_files", "maintain physical personnel files"),
    (re.compile(r"physical\s+personnel\s+files?", re.I), "physical_files", "physical personnel files"),
    (re.compile(r"(track\s+new\s+hires?\s+in\s+excel|onboarding\s+spreadsheet)", re.I), "spreadsheet", "track new hires in Excel / onboarding spreadsheet"),
    (re.compile(r"bring\s+(completed\s+)?paperwork", re.I), "in_person_paperwork", "bring completed paperwork"),
    (re.compile(r"print\s+and\s+(complete|fill)", re.I), "paper_packets", "print and complete/fill forms"),
    (re.compile(r"manual\s+data\s+entry.*new\s+hire", re.I), "manual_data_entry", "manual data entry for new hires"),
    (re.compile(r"fax\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "fax completed forms"),
    (re.compile(r"mail\s+(completed\s+)?forms?\s+(back\s+)?to", re.I), "fax_mail", "mail completed forms"),
    (re.compile(r"email\s+(completed\s+)?forms?\s+to", re.I), "email_forms", "email completed forms to"),
    (re.compile(r"return\s+(completed\s+)?forms?\s+to\s+HR", re.I), "email_forms", "return completed forms to HR"),
    (re.compile(r"new.hire\s+packet", re.I), "paper_packets", "new hire packet"),
    (re.compile(r"new.employee\s+packet", re.I), "paper_packets", "new employee packet"),
    (re.compile(r"paper.based\s+onboarding", re.I), "paper_packets", "paper-based onboarding"),
    (re.compile(r"complete\s+paperwork\s+before\s+(your\s+)?first\s+day", re.I), "in_person_paperwork", "complete paperwork before first day"),
    (re.compile(r"complete\s+paperwork\s+before\s+(your\s+)?start\s+date", re.I), "in_person_paperwork", "complete paperwork before start date"),
    (re.compile(r"fillable\s+pdf.*new.hire", re.I), "paper_packets", "fillable PDF new hire forms"),
    (re.compile(r"report\s+to\s+HR\s+(on\s+)?(your\s+)?first\s+day", re.I), "in_person_paperwork", "report to HR on first day"),
    (re.compile(r"visit\s+HR\s+(to\s+)?(complete|collect|bring)", re.I), "in_person_paperwork", "visit HR to complete paperwork"),
    (re.compile(r"collect\s+signed.{0,30}forms", re.I), "email_forms", "collect signed forms"),
    (re.compile(r"still\s+using\s+paper\s+onboarding", re.I), "paper_packets", "still using paper onboarding"),
    (re.compile(r"excel\s+spreadsheet.*new\s+hire", re.I), "spreadsheet", "Excel spreadsheet for new hires"),
    (re.compile(r"handwritten\s+fields?", re.I), "paper_packets", "handwritten fields on forms"),
    (re.compile(r"fill\s+out.*by\s+hand", re.I), "paper_packets", "fill out by hand"),
    (re.compile(r"completed\s+paperwork.*appointment", re.I), "in_person_paperwork", "bring completed paperwork to appointment"),
]

SKIP_DOMAINS = {
    "linkedin", "indeed", "glassdoor", "zoominfo", "apollo", "ziprecruiter",
    "monster", "careerbuilder", "simplyhired", "salary", "payscale",
    "jobfind", "ajiriwa", "hirify", "jobted", "helpfuljobs",
    "bamboohr", "gusto", "rippling", "adp", "paychex", "zenefits", "workday",
    "clickboarding", "onboardia", "sapling", "talmundo", "lessonly",
    "jotform", "typeform", "docusign", "adobe", "hellosign", "pandadoc",
    "onblick", "simplyfile", "shrm", "aihr", "hrcloud", "hrdive",
    "forbes", "businessinsider", "medium.com", "blogspot", "wordpress.com",
    "substack", "tinyteam.io", "formstack", "excelbundle", "filerequestpro",
    "guideless", "ocrflow", "fill.io", "easyfill", "pinterest", "fiverr", "etsy",
    "slideshare", "scribd", "issuu", "template", "sampleforms",
    "youtube.com", "udemy.com", "eddy.com", "joinhomebase.com",
    "vectortechnicalinc.com", "paper.ula.edu.pe", "yourohionews.com",
    "lawire", "workforcesoftware", "paylocity", "paycor", "kronos",
    "successfactors", "sap", "oracle", "ceridian", "ultiprohr",
    "connecteam", "trainual", "talentlms", "docebo",
    "hireright", "checkr", "sterling", "accurate", "employeebridge",
    "reddit.com", "quora.com", "twitter.com", "facebook.com",
    "yelp.com", "healthgrades.com", "vitals.com",
    "nolo.com", "legalzoom.com", "findlaw.com",
    "chron.com", "bizfluent.com", "smallbusiness.chron.com",
}

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
    "in_person_paperwork": "New hires complete paperwork on their first day or at an in-person HR appointment — no e-signature.",
}

OUTREACH_ANGLES = {
    "paper_packets": "Replace your paper new-hire packets with mobile-first digital onboarding so new hires complete everything before day one.",
    "email_forms": "Eliminate the back-and-forth of emailing forms by letting new hires e-sign everything in one flow.",
    "spreadsheet": "Replace your Excel onboarding tracker with real-time visibility into every new hire's completion status.",
    "physical_files": "Digitize your physical personnel files to reduce compliance risk and free up HR time.",
    "manual_data_entry": "Eliminate manual data entry by having new hires self-serve their own info directly into your payroll system.",
    "fax_mail": "Replace fax/mail forms with a mobile onboarding link new hires complete in under 10 minutes.",
    "in_person_paperwork": "Let new hires complete all their paperwork digitally before day one — no stacks of paper on the first morning.",
}

INDUSTRY_KEYWORDS = {
    "Healthcare / Home Care": ["home care", "home health", "hospice", "medical center", "hospital", "clinic", "health system", "healthcare", "patient"],
    "Senior Living": ["senior living", "assisted living", "memory care", "skilled nursing", "nursing home", "long-term care", "elder care"],
    "Manufacturing": ["manufacturing", "plant", "factory", "production", "warehouse", "fabricat", "machining", "assembly"],
    "Construction": ["construction", "contractor", "builder", "trades", "subcontract", "electrical", "plumbing", "hvac"],
    "Logistics / Warehousing": ["logistics", "warehousing", "distribution", "fulfillment", "freight", "shipping", "supply chain"],
    "Staffing": ["staffing", "temp agency", "temporary placement", "workforce solutions", "staffing agency"],
    "Hospitality": ["hotel", "hospitality", "restaurant", "food service", "catering", "resort", "lodging"],
    "Property Management": ["property management", "real estate", "apartment", "residential", "leasing", "property"],
    "Education": ["school", "childcare", "daycare", "early education", "university", "college", "school district", "K-12"],
    "Nonprofit / Social Services": ["nonprofit", "non-profit", "social services", "charity", "community", "faith", "church"],
    "Dental / Medical": ["dental", "dentist", "orthodont", "veterinary", "optometry", "chiropractic", "physical therapy"],
    "Government": ["city of", "county of", "municipal", "government", "public sector"],
    "Retail": ["retail", "store", "grocery", "supermarket", "department store", "merchandise"],
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


def extract_quote(text: str, match: re.Match, context_chars: int = 300) -> str:
    start = max(0, match.start() - context_chars)
    end = min(len(text), match.end() + context_chars)
    snippet = text[start:end].strip()
    sentences = re.split(r'(?<=[.!?])\s+', snippet)
    relevant = [s for s in sentences if match.re.search(s)]
    if relevant:
        return " ".join(relevant[:3]).strip()
    return snippet[:400].strip()


def extract_state(text: str) -> str:
    us_states = {
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
        "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
        "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
        "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
        "WI", "WY", "DC",
    }
    m = re.search(r'\b(' + '|'.join(us_states) + r')\b', text)
    return m.group(1) if m else ""


def fetch_page(url: str, timeout: int = 12) -> Optional[str]:
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
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(" ", strip=True)
    except Exception:
        return None


def extract_company_name(soup_title: str, url: str) -> str:
    if soup_title:
        m = re.search(r'\bat\s+([^|–\-]{3,60})', soup_title, re.I)
        if m:
            name = m.group(1).strip()
            if len(name) > 3 and not any(w in name.lower() for w in ["jobs", "careers", "glassdoor", "indeed"]):
                return name
        parts = re.split(r'[|–\-]', soup_title)
        if len(parts) >= 2:
            # Try last segment first (often company name)
            candidate = parts[-1].strip()
            if 3 < len(candidate) < 60:
                return candidate
            return parts[0].strip()
    host = urlparse(url).netloc.replace("www.", "").split(".")[0]
    return host.replace("-", " ").title()


URL_PACKET_PAT = re.compile(r"(new.hire.packet|new.employee.packet|newhire.packet|new_hire_packet|employee.packet)", re.I)


def url_is_company_packet(url: str) -> bool:
    if not url.lower().endswith(".pdf"):
        return False
    path = urlparse(url).path.lower()
    host = urlparse(url).netloc.lower()
    # Only if hosted on a company domain (not generic doc sites)
    skip_hosts = ["scribd", "issuu", "slideshare", "docsend", "dropbox", "drive.google", "sharepoint"]
    if any(s in host for s in skip_hosts):
        return False
    return bool(URL_PACKET_PAT.search(path))


def analyze_page(url: str, title: str) -> Optional[dict]:
    text = fetch_page(url)
    if not text or len(text) < 100:
        return None

    for pattern, signal_type, signal_label in SIGNAL_PATTERNS:
        m = pattern.search(text)
        if m:
            quote = extract_quote(text, m)
            if any(vendor in quote.lower() for vendor in [
                "bamboohr", "gusto", "rippling", "workday software", "hris system",
                "our platform", "our software", "onboarding tool", "onboarding solution"
            ]):
                continue

            state = extract_state(text[:3000])
            industry = detect_industry(text[:5000] + title)

            is_job_posting = any(kw in text[:2000].lower() for kw in [
                "responsibilities", "qualifications", "requirements", "job description",
                "duties", "we are looking for", "we're looking for", "you will be responsible"
            ])
            is_official_doc = (url.endswith(".pdf") or ".edu/" in url
                               or ".org/" in url or ".gov/" in url)

            confidence = "High" if (is_job_posting or is_official_doc) else "Medium"

            return {
                "signal_type": signal_type,
                "signal": signal_label,
                "quote": quote,
                "state_province": state,
                "industry": industry,
                "confidence": confidence,
            }
    return None


def ddg_search(query: str, max_results: int = 10) -> list[dict]:
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
        "Reason This Indicates Manual Onboarding": SIGNAL_REASONS.get(st, ""),
        "Signal Type": st,
        "Evidence Source Title": r.get("source_title", ""),
        "Verified Evidence Link": r.get("source_url", ""),
        "Evidence Date": r.get("evidence_date", ""),
        "Confidence Level": r.get("confidence", ""),
        "Recommended Outreach Angle": OUTREACH_ANGLES.get(st, ""),
    }


def main():
    output_file = "/Users/tanishqmac/lead-intel/scripts/nano_onboarding_leads_expanded.csv"

    seen_urls: set[str] = set()
    seen_domains: set[str] = set()
    leads: list[dict] = []

    print("Nano Onboarding Lead Research — Expanded")
    print(f"Queries: {len(SEARCH_QUERIES)}  |  Out: {output_file}")
    print("=" * 68)

    for qi, query in enumerate(SEARCH_QUERIES, 1):
        print(f"\n[{qi}/{len(SEARCH_QUERIES)}] {query[:75]}...")
        results = ddg_search(query, max_results=10)

        candidates = []
        for r in results:
            url = r.get("href", "")
            title = r.get("title", "")
            body = r.get("body", "")
            if not url or url in seen_urls:
                continue
            if should_skip_url(url):
                continue
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

            if url_is_company_packet(c["url"]):
                result = {
                    "signal_type": "paper_packets",
                    "signal": "new hire packet PDF hosted on company domain",
                    "quote": f"Company hosts a new hire packet PDF at: {c['url']}",
                    "state_province": "",
                    "industry": detect_industry(c["title"]),
                    "confidence": "High",
                }
            else:
                result = analyze_page(c["url"], c["title"])
            time.sleep(0.8)

            if not result:
                continue

            page_title = c["title"]
            company_name = extract_company_name(page_title, c["url"])

            if any(skip in company_name.lower() for skip in [
                "resume", "job board", "jobs.com", "hiring", "recrui",
                "template", "how to", "what is", "sample", "example", "free printable"
            ]):
                continue

            seen_domains.add(domain)
            lead = {
                "company_name": company_name,
                "domain": domain,
                "website": f"https://www.{host}" if not host.startswith("www") else f"https://{host}",
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
            print(f"  ✓ {company_name} [{domain}] [{result['confidence']}] — {result['signal_type']}")

        # Save checkpoint every 10 queries
        if qi % 10 == 0 and leads:
            with open(output_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
                writer.writeheader()
                writer.writerows(leads)
            print(f"  [checkpoint] {len(leads)} leads saved")

    print(f"\n{'=' * 68}")
    print(f"Total leads found: {len(leads)}")

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(leads)

    print(f"Saved → {output_file}")
    print("\nAll leads:")
    for lead in leads:
        print(f"  • {lead['Company Name']} ({lead['Verified Company Domain']}) "
              f"[{lead['Signal Type']}] [{lead['Confidence Level']}]")


if __name__ == "__main__":
    main()
