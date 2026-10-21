"""
Nano Onboarding Batch 2 — 80+ fresh queries, new industries.
Skips domains already found in batch 1.
Output: scripts/nano_batch2_leads.csv
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

SEARCH_QUERIES = [
    # ── Senior Living / Assisted Living ─────────────────────────────────────────
    '"new hire packet" filetype:pdf "senior living" OR "assisted living"',
    '"new hire packet" filetype:pdf "skilled nursing" OR "nursing home"',
    '"new hire packet" filetype:pdf "memory care" OR "long-term care"',
    '"new employee packet" filetype:pdf "senior care" OR "elder care"',
    '"onboarding paperwork" "assisted living" "new employee" OR "caregiver"',
    '"new hire forms" "complete and return" "senior living" OR "skilled nursing"',
    # ── Home Health / Home Care ──────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "home health" OR "home care"',
    '"caregiver new hire packet" filetype:pdf',
    '"new hire packet" filetype:pdf "personal care" OR "private duty"',
    '"new hire packet" filetype:pdf hospice',
    '"employee packet" filetype:pdf "home health agency"',
    '"caregiver paperwork" "complete and return" OR "email to" OR "fax to"',
    # ── Dental / Optometry / Chiropractic ────────────────────────────────────────
    '"new hire packet" filetype:pdf dental OR dentist',
    '"new employee packet" filetype:pdf "dental office" OR "dental practice"',
    '"new hire packet" filetype:pdf optometry OR "eye care" OR "vision center"',
    '"new hire packet" filetype:pdf chiropractic OR "chiropractic clinic"',
    '"employee onboarding" "paper forms" dental office',
    # ── Physical Therapy / Rehab ─────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "physical therapy" OR "occupational therapy"',
    '"new employee packet" filetype:pdf "rehabilitation" OR "rehab center"',
    '"employee paperwork" "physical therapy clinic" "complete and return"',
    # ── Childcare / Daycare ──────────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "childcare" OR "daycare" OR "child care"',
    '"new employee packet" filetype:pdf "preschool" OR "early childhood"',
    '"new hire forms" "childcare center" "complete before" OR "return to"',
    '"staff paperwork" daycare OR "child care" OR preschool "new hire"',
    # ── Retail / Grocery ─────────────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "grocery" OR "supermarket" OR "food store"',
    '"new hire paperwork" "retail" "complete and return" OR "first day"',
    '"employee packet" filetype:pdf "convenience store" OR "gas station"',
    '"new hire forms" "sign and return" retail OR "department store"',
    # ── Restaurant / Food Service ─────────────────────────────────────────────────
    '"new hire packet" filetype:pdf restaurant OR "food service" OR catering',
    '"employee paperwork" restaurant "complete on" OR "first day" OR "before starting"',
    '"new hire forms" "quick service" OR "fast casual" OR "fine dining"',
    '"staff onboarding" restaurant "paper forms" OR "new hire packet"',
    # ── Hotel / Hospitality ───────────────────────────────────────────────────────
    '"new hire packet" filetype:pdf hotel OR "hotel group" OR resort',
    '"new employee packet" filetype:pdf "hospitality" OR "lodging"',
    '"employee paperwork" hotel "complete before" OR "first day"',
    '"new hire forms" hotel resort "sign and return"',
    # ── Property Management / Real Estate ────────────────────────────────────────
    '"new hire packet" filetype:pdf "property management" OR "apartment" OR "HOA"',
    '"new employee packet" filetype:pdf "real estate" OR "leasing"',
    '"employee paperwork" "property management" "complete and return"',
    '"onboarding forms" "apartment community" OR "residential" "new hire"',
    # ── Agriculture / Farm / Ranch ────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "farm" OR "agriculture" OR "ranch"',
    '"employee paperwork" "seasonal workers" OR "farm workers" "new hire"',
    # ── Transportation / Trucking ─────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "trucking" OR "transportation" OR "courier"',
    '"driver paperwork" "new hire" "complete and return" OR "fax to"',
    '"new employee packet" filetype:pdf "logistics" OR "freight" OR "delivery"',
    # ── Security / Guard Services ──────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "security" OR "guard service" OR "patrol"',
    '"new employee packet" filetype:pdf "security company" OR "security guard"',
    # ── Auto / Automotive ──────────────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "auto dealer" OR "dealership" OR "automotive"',
    '"employee onboarding" "auto shop" OR "body shop" paper forms',
    # ── Nonprofit / Faith-Based ───────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "nonprofit" OR "non-profit" OR "501c3"',
    '"new hire packet" filetype:pdf "church" OR "faith" OR "ministry"',
    '"new employee packet" filetype:pdf "community center" OR "YMCA" OR "shelter"',
    '"new hire forms" "community health center" "complete and return"',
    # ── Government / Public Sector ────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "city of" OR "county of" OR "township"',
    '"new employee packet" filetype:pdf "school district" OR "public school"',
    '"new hire packet" filetype:pdf "fire department" OR "police department"',
    '"new hire checklist" "public sector" "paper forms" OR "complete and return"',
    # ── More Education ────────────────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "community college" OR "technical college"',
    '"new hire packet" filetype:pdf "charter school" OR "private school"',
    '"employee packet" filetype:pdf "school district"',
    '"new hire forms" site:.k12 filetype:pdf',
    # ── Veterinary ────────────────────────────────────────────────────────────────
    '"new hire packet" filetype:pdf "veterinary" OR "animal hospital" OR "vet clinic"',
    '"new employee forms" "veterinary clinic" "complete and return"',
    # ── Specific HR job posting signals ──────────────────────────────────────────
    '"prepare and distribute new hire packets" HR coordinator job',
    '"update personnel files" "new hire" HR administrator OR coordinator',
    '"coordinate new hire paperwork" HR generalist',
    '"collect and process" "new hire documents" HR coordinator',
    '"manually enter" "new hire" "into the system" payroll HR',
    '"process new hire paperwork" HR administrator OR coordinator',
    '"prepare onboarding documents" "paper" OR "manually" HR',
    # ── Fax / mail signals ────────────────────────────────────────────────────────
    '"fax completed forms" new hire HR',
    '"mail completed forms" new hire OR employee HR',
    '"new hire forms" "fax to" OR "mail to" HR department',
    # ── Spreadsheet signals ───────────────────────────────────────────────────────
    '"track new hires" "excel" OR "spreadsheet" HR coordinator',
    '"onboarding checklist" "excel" company HR new hire',
    '"new hire tracking spreadsheet" HR coordinator OR manager',
    # ── Direct domain signals — more industries ───────────────────────────────────
    '"NewHirePacket.pdf" OR "new-hire-packet.pdf" site:.com -bamboohr',
    '"new-employee-packet.pdf" site:.com',
    '"employee-onboarding-packet.pdf" OR "onboarding-packet.pdf" site:.com',
    '"new_hire_packet.pdf" site:.org OR site:.net',
    '"New Hire Packet" site:.k12.ca.us OR site:.k12.tx.us OR site:.k12.fl.us',
    '"New Hire Packet" site:.k12.ny.us OR site:.k12.pa.us OR site:.k12.ga.us',
    # ── Specific geographic markets ───────────────────────────────────────────────
    '"new hire packet" "home care" Texas OR Florida OR Georgia',
    '"new hire packet" "assisted living" California OR New York OR Illinois',
    '"new hire packet" "senior living" Ohio OR Michigan OR Pennsylvania',
    '"employee packet" construction Texas OR Florida OR Arizona',
]

SIGNAL_PATTERNS = [
    (re.compile(r"prepare\s+new.hire\s+packets?", re.I), "paper_packets", "prepare new hire packets"),
    (re.compile(r"collect\s+(completed\s+)?forms", re.I), "email_forms", "collect completed forms"),
    (re.compile(r"scan\s+(and\s+file|employee\s+documents?|personnel\s+records?)", re.I), "physical_files", "scan and file employee documents"),
    (re.compile(r"maintain\s+physical\s+personnel\s+files?", re.I), "physical_files", "maintain physical personnel files"),
    (re.compile(r"physical\s+personnel\s+files?", re.I), "physical_files", "physical personnel files"),
    (re.compile(r"(track\s+new\s+hires?\s+in\s+excel|new\s+hire\s+tracking\s+spreadsheet|onboarding\s+(checklist\s+)?spreadsheet)", re.I), "spreadsheet", "track new hires in Excel / onboarding spreadsheet"),
    (re.compile(r"bring\s+(completed\s+)?paperwork", re.I), "in_person_paperwork", "bring completed paperwork"),
    (re.compile(r"print\s+and\s+(complete|fill)", re.I), "paper_packets", "print and complete/fill forms"),
    (re.compile(r"manual(ly)?\s+(data\s+entry|enter).*new\s+hire", re.I), "manual_data_entry", "manual data entry for new hires"),
    (re.compile(r"manually\s+enter.*into\s+(the\s+)?system", re.I), "manual_data_entry", "manually enter into system"),
    (re.compile(r"process\s+new\s+hire\s+paperwork", re.I), "paper_packets", "process new hire paperwork"),
    (re.compile(r"fax\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "fax completed forms"),
    (re.compile(r"mail\s+(completed\s+)?forms?\s+(back\s+)?to", re.I), "fax_mail", "mail completed forms"),
    (re.compile(r"email\s+(completed\s+)?forms?\s+to", re.I), "email_forms", "email completed forms to"),
    (re.compile(r"return\s+(completed\s+)?forms?\s+to\s+HR", re.I), "email_forms", "return completed forms to HR"),
    (re.compile(r"new.hire\s+packet", re.I), "paper_packets", "new hire packet"),
    (re.compile(r"new.employee\s+packet", re.I), "paper_packets", "new employee packet"),
    (re.compile(r"paper.based\s+onboarding", re.I), "paper_packets", "paper-based onboarding"),
    (re.compile(r"complete\s+(and\s+return|paperwork)\s+before\s+(your\s+)?(first\s+day|start\s+date)", re.I), "in_person_paperwork", "complete and return before first day"),
    (re.compile(r"fillable\s+pdf.*new.hire", re.I), "paper_packets", "fillable PDF new hire forms"),
    (re.compile(r"report\s+to\s+HR\s+(on\s+)?(your\s+)?first\s+day", re.I), "in_person_paperwork", "report to HR on first day"),
    (re.compile(r"handwritten\s+fields?", re.I), "paper_packets", "handwritten fields on forms"),
    (re.compile(r"fill\s+out.*by\s+hand", re.I), "paper_packets", "fill out by hand"),
    (re.compile(r"coordinate\s+new\s+hire\s+paperwork", re.I), "paper_packets", "coordinate new hire paperwork"),
    (re.compile(r"update\s+personnel\s+files?", re.I), "physical_files", "update personnel files"),
    (re.compile(r"distribute\s+new\s+hire\s+packets?", re.I), "paper_packets", "distribute new hire packets"),
    (re.compile(r"collect\s+and\s+process.*new\s+hire", re.I), "paper_packets", "collect and process new hire documents"),
]

# Already found domains — skip these
ALREADY_FOUND = {
    "montefioreeinstein.org", "wou.edu", "mercy.com", "cfocolorado.biz",
    "gavilan.edu", "rcc.edu", "nau.edu", "arizona.edu", "unl.edu",
    "oswego.edu", "seattleu.edu", "oregon.gov", "oregonmetro.gov",
    "hawaii.gov", "wellstar.org", "inova.org", "hratexas.org",
    "fluidmgmt.com", "pallcarenj.org", "lssmn.org", "employerflexible.com",
    "mmyerscpa.com",
    # also subdomains from batch 1
    "welcometowellstar.com", "my.clevelandclinic.org", "anthropology.arizona.edu",
    "in.nau.edu", "ww1.oswego.edu", "law.seattleu.edu", "businesscentral.unl.edu",
    "dod.hawaii.gov",
}

SKIP_DOMAINS = {
    "linkedin", "indeed", "glassdoor", "zoominfo", "apollo", "ziprecruiter",
    "monster", "careerbuilder", "simplyhired", "salary", "payscale",
    "bamboohr", "gusto", "rippling", "adp", "paychex", "zenefits", "workday",
    "clickboarding", "onboardia", "sapling", "talmundo", "lessonly",
    "jotform", "typeform", "docusign", "adobe", "hellosign", "pandadoc",
    "shrm", "aihr", "hrcloud", "hrdive", "forbes", "businessinsider",
    "medium.com", "blogspot", "wordpress.com", "substack",
    "youtube.com", "udemy.com", "eddy.com", "joinhomebase.com",
    "vectortechnicalinc.com", "yourohionews.com",
    "workbright.com", "xemplo.com", "signnow.com", "sourcetable.com",
    "getdianahr.com", "tryharmony.ai", "employersresource.com",
    "hron-call.com", "keyhro.com", "servanthr.com",
    "barandrestaurant.com", "numerico.com", "twistedsifter.com",
    "carecade.org", "creai.mx", "reddit.com", "quora.com",
    "scribd", "issuu", "slideshare", "docsend",
    "template", "sampleforms", "freeprintable",
    "chron.com", "bizfluent", "smallbusiness.chron",
    "nolo.com", "legalzoom.com", "findlaw.com",
    "paylocity", "paycor", "kronos", "successfactors", "ceridian",
    "connecteam", "trainual", "talentlms",
    "documentation.infinite.com", "hron-call.com",
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
    "Healthcare": ["hospital", "medical center", "health system", "healthcare", "health care"],
    "Healthcare / Home Care": ["home care", "home health", "hospice", "private duty", "personal care", "caregiver"],
    "Senior Living": ["senior living", "assisted living", "memory care", "skilled nursing", "nursing home", "long-term care", "elder care"],
    "Dental / Medical": ["dental", "dentist", "orthodont", "veterinary", "optometry", "chiropractic", "physical therapy", "eye care"],
    "Manufacturing": ["manufacturing", "plant", "factory", "production", "fabricat", "machining"],
    "Construction": ["construction", "contractor", "builder", "trades", "subcontract", "electrical", "plumbing", "hvac"],
    "Logistics / Transportation": ["logistics", "trucking", "transportation", "distribution", "fulfillment", "freight", "courier"],
    "Staffing": ["staffing", "temp agency", "workforce solutions"],
    "Hospitality": ["hotel", "hospitality", "restaurant", "food service", "catering", "resort", "lodging"],
    "Property Management": ["property management", "real estate", "apartment", "residential", "leasing"],
    "Education / Childcare": ["school", "childcare", "daycare", "early education", "university", "college", "school district", "K-12", "preschool"],
    "Nonprofit / Social Services": ["nonprofit", "non-profit", "social services", "charity", "community", "faith", "church", "ministry"],
    "Government": ["city of", "county of", "municipal", "government", "public sector", "fire department", "police"],
    "Retail": ["retail", "store", "grocery", "supermarket", "convenience"],
    "Security": ["security", "guard service", "patrol"],
    "Automotive": ["auto dealer", "dealership", "automotive", "auto shop"],
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
    # skip generic CDN / hosting platforms
    cdn_patterns = ["s3.amazonaws.com", "hubspotusercontent", "squarespace.com",
                    "webflow.com", "wixsite.com", "hibu.com", "sharepoint.com",
                    "drive.google.com", "dropbox.com", "docsend.com"]
    if any(c in host for c in cdn_patterns):
        return True
    return False


def get_canonical_domain(url: str) -> str:
    host = urlparse(url).netloc.lower().replace("www.", "")
    # Collapse subdomains to root for dedup
    parts = host.split(".")
    if len(parts) >= 3 and parts[-2] in ("k12", "co", "or", "wa", "ca", "edu"):
        return host  # keep as-is for k12, state domains
    if len(parts) >= 3 and parts[0] not in ("my", "cdn", "static", "uploads", "docs", "files", "assets"):
        return ".".join(parts[-2:])  # strip subdomain
    return host


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
        "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID",
        "IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS",
        "MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
        "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
        "WI","WY","DC",
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


def extract_company_name(title: str, url: str) -> str:
    if title:
        m = re.search(r'\bat\s+([^|–\-]{3,60})', title, re.I)
        if m:
            name = m.group(1).strip()
            if 3 < len(name) < 60 and not any(w in name.lower() for w in ["job", "career", "glassdoor", "indeed"]):
                return name
        parts = re.split(r'[|–\-]', title)
        if len(parts) >= 2:
            candidate = parts[-1].strip()
            if 3 < len(candidate) < 70:
                return candidate
    host = urlparse(url).netloc.replace("www.", "").split(".")[0]
    return host.replace("-", " ").title()


URL_PACKET_PAT = re.compile(
    r"(new.hire.packet|new.employee.packet|newhire.packet|new_hire_packet|"
    r"employee.packet|employee.onboarding|new.hire.forms|staff.packet|"
    r"caregiver.packet|new.hire.checklist|onboarding.packet)",
    re.I
)

SKIP_HOSTING = {"scribd", "issuu", "slideshare", "docsend", "dropbox", "drive.google",
                "sharepoint", "s3.amazonaws", "hubspotusercontent", "squarespace",
                "webflow", "wixsite", "hibu"}


def url_is_company_packet(url: str) -> bool:
    if not url.lower().endswith(".pdf"):
        return False
    host = urlparse(url).netloc.lower()
    if any(s in host for s in SKIP_HOSTING):
        return False
    path = urlparse(url).path.lower()
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
                "our platform", "our software", "onboarding tool", "onboarding solution",
                "our product", "our app",
            ]):
                continue

            state = extract_state(text[:3000])
            industry = detect_industry(text[:5000] + title)

            is_job_posting = any(kw in text[:2000].lower() for kw in [
                "responsibilities", "qualifications", "requirements", "job description",
                "duties", "we are looking for", "we're looking for", "you will be responsible",
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


def ddg_search(query: str, max_results: int = 10, retries: int = 3) -> list[dict]:
    for attempt in range(retries):
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                if results:
                    return results
                # Empty result — might be rate limit, back off
                wait = 8 * (attempt + 1)
                print(f"  DDG empty, waiting {wait}s...", file=sys.stderr)
                time.sleep(wait)
        except Exception as e:
            msg = str(e)
            if "No results" in msg or "rate" in msg.lower() or "429" in msg:
                wait = 15 * (attempt + 1)
                print(f"  DDG rate-limited (attempt {attempt+1}), waiting {wait}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                print(f"  DDG error: {e}", file=sys.stderr)
                return []
    return []


def to_csv_row(r: dict) -> dict:
    st = r.get("signal_type", "")
    return {
        "Company Name": r.get("company_name", ""),
        "Verified Company Domain": r.get("domain", ""),
        "Official Website": r.get("website", ""),
        "Country": "US",
        "State or Province": r.get("state_province", ""),
        "Industry": r.get("industry", ""),
        "Estimated Employee Count": "",
        "Exact Manual-Onboarding Signal": r.get("signal", ""),
        "Exact Evidence Quote": r.get("quote", "").replace("\n", " ").replace("\r", " ").strip(),
        "Reason This Indicates Manual Onboarding": SIGNAL_REASONS.get(st, ""),
        "Signal Type": st,
        "Evidence Source Title": r.get("source_title", ""),
        "Verified Evidence Link": r.get("source_url", ""),
        "Evidence Date": "",
        "Confidence Level": r.get("confidence", ""),
        "Recommended Outreach Angle": OUTREACH_ANGLES.get(st, ""),
    }


def main():
    output_file = "/Users/tanishqmac/lead-intel/scripts/nano_batch2_leads.csv"
    seen_urls: set[str] = set()
    seen_domains: set[str] = ALREADY_FOUND.copy()
    leads: list[dict] = []

    print("Nano Onboarding Batch 2 — New Industries")
    print(f"Queries: {len(SEARCH_QUERIES)} | Skipping {len(ALREADY_FOUND)} already-found domains")
    print("=" * 70)

    for qi, query in enumerate(SEARCH_QUERIES, 1):
        print(f"\n[{qi}/{len(SEARCH_QUERIES)}] {query[:78]}...")
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

        print(f"  DDG: {len(results)} → candidates: {len(candidates)}")
        time.sleep(3)  # polite delay between queries to avoid rate-limiting

        for c in candidates:
            raw_domain = urlparse(c["url"]).netloc.lower().replace("www.", "")
            domain = get_canonical_domain(c["url"])
            if domain in seen_domains or raw_domain in seen_domains:
                continue

            print(f"  Analyzing: {c['url'][:80]}...")

            if url_is_company_packet(c["url"]):
                result = {
                    "signal_type": "paper_packets",
                    "signal": "new hire packet PDF on company domain",
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

            company_name = extract_company_name(c["title"], c["url"])
            if any(skip in company_name.lower() for skip in [
                "resume", "job board", "template", "how to", "what is",
                "sample", "example", "free printable", "blog", "article",
            ]):
                continue

            seen_domains.add(domain)
            lead = {
                "company_name": company_name,
                "domain": domain,
                "website": f"https://www.{domain}",
                "state_province": result["state_province"],
                "industry": result["industry"],
                "signal": result["signal"],
                "quote": result["quote"],
                "signal_type": result["signal_type"],
                "source_title": c["title"],
                "source_url": c["url"],
                "confidence": result["confidence"],
            }
            leads.append(to_csv_row(lead))
            print(f"  ✓ {company_name} [{domain}] [{result['confidence']}] — {result['signal_type']}")

        if qi % 15 == 0 and leads:
            with open(output_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
                writer.writeheader()
                writer.writerows(leads)
            print(f"  [checkpoint] {len(leads)} leads saved")

    print(f"\n{'=' * 70}")
    print(f"Total new leads: {len(leads)}")
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(leads)
    print(f"Saved → {output_file}")
    for lead in leads:
        print(f"  • {lead['Company Name']} ({lead['Verified Company Domain']}) [{lead['Signal Type']}] [{lead['Confidence Level']}]")


if __name__ == "__main__":
    main()
