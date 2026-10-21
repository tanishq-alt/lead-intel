"""
Nano Onboarding Batch 3 — 120+ hyper-targeted queries.
Focus: filetype:pdf on company domains, k12 school districts, small hospitals,
home care agencies, counties, cities, nonprofits, faith-based orgs.
These are the highest-signal, easiest-to-close leads.
Output: scripts/nano_batch3_leads.csv
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

# ── 120+ queries targeting proven high-yield formats ──────────────────────────
SEARCH_QUERIES = [
    # ── K12 School Districts by state ──────────────────────────────────────────
    '"new hire packet" site:.k12.tx.us filetype:pdf',
    '"new hire packet" site:.k12.fl.us filetype:pdf',
    '"new hire packet" site:.k12.ga.us filetype:pdf',
    '"new hire packet" site:.k12.nc.us filetype:pdf',
    '"new hire packet" site:.k12.oh.us filetype:pdf',
    '"new hire packet" site:.k12.pa.us filetype:pdf',
    '"new hire packet" site:.k12.ca.us filetype:pdf',
    '"new hire packet" site:.k12.ny.us filetype:pdf',
    '"new hire packet" site:.k12.va.us filetype:pdf',
    '"new hire packet" site:.k12.tn.us filetype:pdf',
    '"new hire packet" site:.k12.mn.us filetype:pdf',
    '"new hire packet" site:.k12.wi.us filetype:pdf',
    '"new hire packet" site:.k12.il.us filetype:pdf',
    '"new hire packet" site:.k12.az.us filetype:pdf',
    '"new hire packet" site:.k12.co.us filetype:pdf',
    '"new hire packet" site:.k12.sc.us filetype:pdf',
    '"new hire packet" site:.k12.al.us filetype:pdf',
    '"new hire packet" site:.k12.mo.us filetype:pdf',
    '"new hire packet" site:.k12.in.us filetype:pdf',
    '"new hire packet" site:.k12.ky.us filetype:pdf',
    '"new employee packet" "school district" filetype:pdf',
    '"new hire packet" "school district" HR filetype:pdf',
    '"new hire packet" "ISD" OR "CISD" OR "USD" filetype:pdf',
    # ── Home Care Agencies ─────────────────────────────────────────────────────
    '"new hire packet" "home care" filetype:pdf site:.com',
    '"new hire packet" "home health" filetype:pdf site:.com',
    '"caregiver new hire packet" filetype:pdf site:.com',
    '"caregiver packet" filetype:pdf "new hire" site:.com',
    '"home care" "new hire packet" filetype:pdf Texas',
    '"home care" "new hire packet" filetype:pdf Florida',
    '"home care" "new hire packet" filetype:pdf Georgia',
    '"home care" "new hire packet" filetype:pdf Ohio',
    '"home care" "new hire packet" filetype:pdf Pennsylvania',
    '"home care" "new hire packet" filetype:pdf Michigan',
    '"home health" "new hire packet" filetype:pdf',
    '"private duty" "new hire packet" filetype:pdf',
    '"hospice" "new hire packet" filetype:pdf site:.com',
    '"personal care attendant" "new hire packet" filetype:pdf',
    '"direct support professional" "new hire packet" filetype:pdf',
    # ── Small Hospitals & Health Systems ──────────────────────────────────────
    '"new hire packet" "medical center" filetype:pdf site:.org',
    '"new hire packet" "regional hospital" filetype:pdf',
    '"new hire packet" "community hospital" filetype:pdf',
    '"new hire packet" "health system" filetype:pdf site:.org',
    '"new employee packet" hospital filetype:pdf site:.org',
    '"new hire packet" "critical access hospital" filetype:pdf',
    '"new hire packet" "rural hospital" filetype:pdf',
    '"new hire forms" hospital "complete and return" filetype:pdf',
    '"employee packet" "medical" filetype:pdf site:.org',
    # ── Senior Living / Skilled Nursing ───────────────────────────────────────
    '"new hire packet" "assisted living" filetype:pdf site:.com',
    '"new hire packet" "skilled nursing" filetype:pdf site:.com',
    '"new hire packet" "senior living" filetype:pdf site:.com',
    '"new hire packet" "nursing home" filetype:pdf site:.com',
    '"new hire packet" "memory care" filetype:pdf site:.com',
    '"new hire packet" "long term care" filetype:pdf site:.com',
    '"new employee packet" "assisted living" filetype:pdf',
    '"caregiver paperwork" "new hire" "assisted living" filetype:pdf',
    # ── County / City Government ───────────────────────────────────────────────
    '"new hire packet" "county" filetype:pdf site:.gov',
    '"new hire packet" "city of" filetype:pdf site:.gov',
    '"new employee packet" "county" filetype:pdf site:.gov',
    '"new hire forms" "county" "complete and return" site:.gov',
    '"new hire packet" "municipality" OR "township" filetype:pdf',
    '"new hire checklist" "county" HR filetype:pdf',
    '"new hire packet" "fire department" filetype:pdf',
    '"new hire packet" "police department" OR "sheriff" filetype:pdf',
    '"new hire packet" "public works" OR "utilities" filetype:pdf',
    # ── Nonprofits ─────────────────────────────────────────────────────────────
    '"new hire packet" "nonprofit" filetype:pdf site:.org',
    '"new hire packet" "foundation" filetype:pdf site:.org',
    '"new hire packet" "community health" filetype:pdf site:.org',
    '"new hire packet" "shelter" OR "food bank" OR "pantry" filetype:pdf',
    '"new hire packet" "social services" filetype:pdf site:.org',
    '"new hire packet" "disability services" filetype:pdf',
    '"new hire packet" "behavioral health" filetype:pdf',
    '"new hire packet" "mental health" filetype:pdf site:.org',
    '"new hire packet" "substance abuse" OR "recovery" filetype:pdf',
    '"new hire packet" "developmental disabilities" filetype:pdf',
    # ── Faith-Based Organizations ──────────────────────────────────────────────
    '"new hire packet" "church" filetype:pdf site:.org',
    '"new hire packet" "ministry" filetype:pdf site:.org',
    '"new employee packet" "diocese" OR "archdiocese" filetype:pdf',
    '"new hire packet" "christian school" filetype:pdf',
    '"new hire packet" "parochial school" OR "catholic school" filetype:pdf',
    '"new hire packet" "faith" "employee" filetype:pdf site:.org',
    # ── Childcare / Daycares ───────────────────────────────────────────────────
    '"new hire packet" "childcare" filetype:pdf site:.com',
    '"new hire packet" "daycare" filetype:pdf site:.com',
    '"new hire packet" "preschool" filetype:pdf site:.com',
    '"staff new hire packet" "childcare" OR "daycare" filetype:pdf',
    '"new employee packet" "early childhood" filetype:pdf',
    # ── Manufacturing / Industrial ─────────────────────────────────────────────
    '"new hire packet" "manufacturing" filetype:pdf site:.com',
    '"new hire packet" "plant" OR "factory" filetype:pdf site:.com',
    '"new employee packet" "manufacturing" filetype:pdf',
    '"new hire forms" "manufacturing" "complete and return"',
    '"new hire packet" "food processing" OR "food manufacturing" filetype:pdf',
    '"new hire packet" "auto parts" OR "automotive supplier" filetype:pdf',
    '"new hire packet" "metal fabrication" OR "machining" filetype:pdf',
    # ── Construction / Trades ─────────────────────────────────────────────────
    '"new hire packet" "construction" filetype:pdf site:.com',
    '"new hire packet" "contractor" filetype:pdf site:.com',
    '"new hire packet" "electrical contractor" filetype:pdf',
    '"new hire packet" "plumbing" OR "HVAC" filetype:pdf',
    '"new hire packet" "roofing" OR "general contractor" filetype:pdf',
    '"new hire packet" "landscaping" OR "lawn care" filetype:pdf',
    '"new hire packet" "pest control" OR "janitorial" filetype:pdf',
    # ── Staffing Companies ─────────────────────────────────────────────────────
    '"new hire packet" "staffing" filetype:pdf site:.com',
    '"new hire packet" "temp agency" filetype:pdf',
    '"new hire packet" "workforce" filetype:pdf site:.com',
    '"caregiver new hire packet" "staffing agency" filetype:pdf',
    '"new hire packet" "light industrial" staffing filetype:pdf',
    # ── Dental / Veterinary / Medical Practices ────────────────────────────────
    '"new hire packet" "dental" filetype:pdf site:.com',
    '"new hire packet" "dental practice" OR "dental office" filetype:pdf',
    '"new hire packet" "veterinary" filetype:pdf site:.com',
    '"new hire packet" "optometry" OR "vision center" filetype:pdf',
    '"new hire packet" "chiropractic" filetype:pdf site:.com',
    '"new hire packet" "physical therapy" filetype:pdf site:.com',
    '"new hire packet" "urgent care" filetype:pdf',
    '"new hire packet" "dialysis" filetype:pdf',
    # ── Hospitality ───────────────────────────────────────────────────────────
    '"new hire packet" "hotel" filetype:pdf site:.com',
    '"new hire packet" "resort" filetype:pdf site:.com',
    '"new hire packet" "restaurant" filetype:pdf site:.com',
    '"new hire packet" "food service" filetype:pdf site:.com',
    # ── HR Job Posting Signals (strongest purchase intent) ────────────────────
    '"prepare new hire packets" "HR coordinator" OR "HR generalist" job',
    '"maintain personnel files" "new hire" HR coordinator job',
    '"process new hire paperwork" HR coordinator OR administrator job',
    '"collect new hire forms" HR generalist OR coordinator job',
    '"new hire paperwork" "manually" HR coordinator job',
    '"onboarding paperwork" "paper" HR coordinator job description',
    '"new hire packet" "coordinate" HR generalist job responsibilities',
    '"complete paperwork" "before your first day" company HR',
    '"new hire packet" "please complete and return" HR',
    '"new hire packet" "due to HR" OR "submit to HR" OR "return to HR"',
    # ── Direct PDF URL pattern signals ────────────────────────────────────────
    '"NewHirePacket.pdf" OR "New-Hire-Packet.pdf" site:.com',
    '"NewHirePacket.pdf" OR "New-Hire-Packet.pdf" site:.org',
    '"NewEmployeePacket.pdf" site:.com OR site:.org',
    '"new_hire_packet.pdf" site:.com',
    '"employee-onboarding-packet.pdf" site:.com OR site:.org',
    '"2024-new-hire-packet.pdf" OR "2025-new-hire-packet.pdf" site:.com',
    '"2025-New-Employee-Packet.pdf" OR "2024-New-Employee-Packet.pdf"',
    '"new hire packet" "wp-content/uploads" filetype:pdf',
    '"new hire packet" "/sites/default/files" filetype:pdf',
    '"new hire packet" "/wp-content" filetype:pdf site:.com',
    # ── Fax signals ────────────────────────────────────────────────────────────
    '"fax completed forms" new hire OR onboarding HR',
    '"fax to" new hire forms OR paperwork company HR',
    '"please fax" new hire OR employee forms OR paperwork',
    # ── Specific high-yield geographic markets ─────────────────────────────────
    '"new hire packet" filetype:pdf Texas hospital OR clinic',
    '"new hire packet" filetype:pdf Florida "home care" OR "senior living"',
    '"new hire packet" filetype:pdf "North Carolina" OR "South Carolina"',
    '"new hire packet" filetype:pdf Tennessee OR Kentucky OR Arkansas',
    '"new hire packet" filetype:pdf Oklahoma OR Kansas OR Nebraska',
    '"new hire packet" filetype:pdf "New Mexico" OR "Idaho" OR "Montana"',
    '"new hire packet" filetype:pdf Mississippi OR Louisiana OR Alabama',
    '"new hire packet" filetype:pdf "West Virginia" OR "Kentucky" nonprofit',
]

SIGNAL_PATTERNS = [
    (re.compile(r"prepare\s+new.hire\s+packets?", re.I), "paper_packets", "prepare new hire packets"),
    (re.compile(r"new.hire\s+packet", re.I), "paper_packets", "new hire packet"),
    (re.compile(r"new.employee\s+packet", re.I), "paper_packets", "new employee packet"),
    (re.compile(r"bring\s+(completed\s+)?paperwork", re.I), "in_person_paperwork", "bring completed paperwork"),
    (re.compile(r"complete\s+(and\s+return|paperwork)\s+before\s+(your\s+)?(first\s+day|start\s+date)", re.I), "in_person_paperwork", "complete before first day"),
    (re.compile(r"return\s+(completed\s+)?forms?\s+to\s+HR", re.I), "email_forms", "return completed forms to HR"),
    (re.compile(r"(please\s+)?fax\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "fax completed forms"),
    (re.compile(r"mail\s+(completed\s+)?forms?\s+(back\s+)?to", re.I), "fax_mail", "mail completed forms"),
    (re.compile(r"email\s+(completed\s+)?forms?\s+to", re.I), "email_forms", "email completed forms"),
    (re.compile(r"print\s+and\s+(complete|fill|sign)", re.I), "paper_packets", "print and complete forms"),
    (re.compile(r"paper.based\s+onboarding", re.I), "paper_packets", "paper-based onboarding"),
    (re.compile(r"report\s+to\s+HR\s+(on\s+)?(your\s+)?first\s+day", re.I), "in_person_paperwork", "report to HR on first day"),
    (re.compile(r"handwritten\s+fields?", re.I), "paper_packets", "handwritten fields on forms"),
    (re.compile(r"fill\s+out.*by\s+hand", re.I), "paper_packets", "fill out by hand"),
    (re.compile(r"collect\s+(and\s+process\s+)?new\s+hire\s+(forms?|paperwork|documents?)", re.I), "paper_packets", "collect new hire forms"),
    (re.compile(r"process\s+new\s+hire\s+paperwork", re.I), "paper_packets", "process new hire paperwork"),
    (re.compile(r"coordinate\s+new\s+hire\s+paperwork", re.I), "paper_packets", "coordinate new hire paperwork"),
    (re.compile(r"maintain\s+(physical\s+)?personnel\s+files?", re.I), "physical_files", "maintain personnel files"),
    (re.compile(r"scan\s+and\s+file\s+(employee|personnel)", re.I), "physical_files", "scan and file employee documents"),
    (re.compile(r"due\s+to\s+HR\s+by", re.I), "paper_packets", "new hire packet due to HR by"),
    (re.compile(r"submit\s+(to|your)\s+HR\s+(department|office)", re.I), "paper_packets", "submit to HR office"),
    (re.compile(r"return\s+(this\s+)?(packet|forms?|paperwork)\s+to\s+(the\s+)?HR", re.I), "paper_packets", "return packet to HR"),
    (re.compile(r"manually\s+enter.*new\s+hire", re.I), "manual_data_entry", "manually enter new hire data"),
    (re.compile(r"new\s+hire\s+packet.*due\s+(to|by)", re.I), "paper_packets", "new hire packet due"),
    (re.compile(r"download.*new\s+hire\s+packet", re.I), "paper_packets", "download new hire packet"),
    (re.compile(r"fillable\s+pdf.*new.hire|new.hire.*fillable\s+pdf", re.I), "paper_packets", "fillable PDF new hire forms"),
]

# Already in master — skip these
ALREADY_FOUND = {
    "montefioreeinstein.org","wou.edu","mercy.com","cfocolorado.biz",
    "gavilan.edu","rcc.edu","nau.edu","arizona.edu","unl.edu","oswego.edu",
    "seattleu.edu","oregon.gov","oregonmetro.gov","hawaii.gov","wellstar.org",
    "inova.org","hratexas.org","fluidmgmt.com","pallcarenj.org","lssmn.org",
    "employerflexible.com","mmyerscpa.com","nyc.gov","apsd1.org",
    "northlandchristian.org","idaho-dea.org","towson.edu","ttu.edu",
    "natlm.com","thetintstitute.com",
    # batch 1 noise (already excluded in master but skip here too)
    "welcometowellstar.com","my.clevelandclinic.org","anthropology.arizona.edu",
    "in.nau.edu","ww1.oswego.edu","law.seattleu.edu","businesscentral.unl.edu",
    "dod.hawaii.gov","lssmn.org","wou.edu",
}

SKIP_DOMAINS = {
    "linkedin","indeed","glassdoor","zoominfo","apollo","ziprecruiter",
    "monster","careerbuilder","simplyhired","salary","payscale",
    "bamboohr","gusto","rippling","adp","paychex","zenefits","workday",
    "clickboarding","onboardia","sapling","talmundo","lessonly",
    "jotform","typeform","docusign","adobe","hellosign","pandadoc",
    "shrm","aihr","hrcloud","hrdive","forbes","businessinsider",
    "medium.com","blogspot","wordpress.com","substack",
    "youtube.com","udemy.com","eddy.com","joinhomebase.com",
    "workbright.com","xemplo.com","signnow.com","sourcetable.com",
    "getdianahr.com","tryharmony.ai","employersresource.com",
    "hron-call.com","keyhro.com","servanthr.com",
    "barandrestaurant.com","numerico.com","twistedsifter.com",
    "carecade.org","reddit.com","quora.com","twitter.com","facebook.com",
    "scribd","issuu","slideshare","docsend","template","sampleforms",
    "chron.com","bizfluent","nolo.com","legalzoom.com","findlaw.com",
    "paylocity","paycor","kronos","successfactors","ceridian","connecteam",
    "brighthub.com","bizappln.com","fresh-catalog.com","thecapable.io",
    "ltcmconsulting.com","mass-ala.org","pinterest.com","vimeo.com",
    "rackcdn.com","ngojobsinafrica.com","ajiriwa.net","dohaj.com",
    "welcometothejungle.com","compasspayroll.com","mn.gov",
    "ngojobsinafrica","ajiriwa","dohaj","welcometothejungle",
    "wi.us","yorkny.gov","tarrantcountytx.gov",
}

NON_US_PAT = re.compile(
    r"\.(co\.tz|co\.ke|co\.za|co\.uk|co\.in|com\.au|co\.nz|co\.ng|com\.ng|"
    r"org\.tz|org\.ke|com\.br|com\.mx|com\.ph|com\.pk|net\.au|de|fr|es|it|"
    r"nl|pl|ru|tr|cn|jp|uk|au|in|ng|tz|ke|za)(/|$)", re.I
)

CDN_HOSTS = {
    "s3.amazonaws.com","hubspotusercontent","squarespace.com","webflow.io",
    "webflow.com","wixsite.com","hibu.com","sharepoint.com","drive.google.com",
    "dropbox.com","docsend.com","rackcdn.com","cloudfront.net","fastly.net",
}

SIGNAL_REASONS = {
    "paper_packets":"Uses physical new-hire packets — printing, filling, collecting paper forms.",
    "email_forms":"Distributes or collects onboarding forms via email — no digital workflow.",
    "spreadsheet":"Tracks onboarding in Excel/Sheets instead of an HRIS.",
    "physical_files":"Maintains physical personnel files — paper-based record keeping.",
    "manual_data_entry":"HR manually enters new hire data from paper into payroll systems.",
    "fax_mail":"Sends or accepts onboarding documents by fax or mail.",
    "in_person_paperwork":"New hires complete paperwork on their first day or at an in-person HR appointment.",
}

OUTREACH_ANGLES = {
    "paper_packets":"Replace your paper new-hire packets with mobile-first digital onboarding — new hires complete everything before day one.",
    "email_forms":"Eliminate form back-and-forth by letting new hires e-sign everything in one flow.",
    "spreadsheet":"Replace your Excel onboarding tracker with real-time visibility into every new hire's completion status.",
    "physical_files":"Digitize physical personnel files — cut compliance risk and free up HR time.",
    "manual_data_entry":"Eliminate manual data entry by having new hires self-serve info directly into your payroll system.",
    "fax_mail":"Replace fax/mail forms with a mobile onboarding link new hires complete in under 10 minutes.",
    "in_person_paperwork":"Let new hires complete all paperwork digitally before day one — no stacks of paper on the first morning.",
}

INDUSTRY_KEYWORDS = {
    "Healthcare / Home Care":["home care","home health","hospice","private duty","personal care","caregiver"],
    "Senior Living":["senior living","assisted living","memory care","skilled nursing","nursing home","long-term care","elder care"],
    "Healthcare":["hospital","medical center","health system","healthcare","health care","clinic","dialysis","urgent care"],
    "Dental / Medical Practice":["dental","dentist","orthodont","veterinary","optometry","chiropractic","physical therapy"],
    "Manufacturing":["manufacturing","plant","factory","production","fabricat","machining","food processing"],
    "Construction":["construction","contractor","builder","trades","subcontract","electrical","plumbing","hvac","roofing","landscaping"],
    "Logistics / Transportation":["logistics","trucking","transportation","distribution","fulfillment","freight"],
    "Staffing":["staffing","temp agency","workforce solutions","light industrial"],
    "Hospitality":["hotel","hospitality","restaurant","food service","catering","resort"],
    "Property Management":["property management","real estate","apartment","residential","leasing"],
    "Education":["school","childcare","daycare","early education","university","college","school district","K-12","preschool","isd","cisd","usd"],
    "Nonprofit / Social Services":["nonprofit","non-profit","social services","charity","community","behavioral health","mental health","substance abuse","developmental"],
    "Faith-Based":["church","faith","ministry","diocese","christian school","parochial","catholic school"],
    "Government":["city of","county of","municipal","government","public sector","fire department","police","sheriff","public works"],
    "Retail":["retail","store","grocery","supermarket","convenience"],
    "Security":["security","guard service","patrol"],
}

CSV_FIELDS = [
    "Company Name","Verified Company Domain","Official Website","Country",
    "State or Province","Industry","Estimated Employee Count",
    "Exact Manual-Onboarding Signal","Exact Evidence Quote",
    "Reason This Indicates Manual Onboarding","Signal Type",
    "Evidence Source Title","Verified Evidence Link","Evidence Date",
    "Confidence Level","Recommended Outreach Angle",
]

HEADERS = {
    "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                 "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def should_skip(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower().replace("www.","")
    except Exception:
        return True
    if any(s in host for s in SKIP_DOMAINS):
        return True
    if NON_US_PAT.search(url):
        return True
    if any(c in host for c in CDN_HOSTS):
        return True
    return False


def canonical(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower().replace("www.","")
        parts = host.split(".")
        # Keep k12.XX.us full for school districts
        if len(parts) >= 4 and parts[-3] == "k12":
            return host
        # Keep subdomains that are non-generic
        if len(parts) >= 3 and parts[0] not in ("my","cdn","static","uploads","docs","files","assets","api","mail","app"):
            return ".".join(parts[-2:])
        return host
    except Exception:
        return url


def detect_industry(text: str) -> str:
    t = text.lower()
    for industry, kws in INDUSTRY_KEYWORDS.items():
        if any(kw in t for kw in kws):
            return industry
    return "General Business"


def extract_quote(text: str, match: re.Match, ctx: int = 300) -> str:
    start = max(0, match.start() - ctx)
    end = min(len(text), match.end() + ctx)
    snippet = text[start:end].strip()
    sentences = re.split(r'(?<=[.!?])\s+', snippet)
    relevant = [s for s in sentences if match.re.search(s)]
    return " ".join(relevant[:3]).strip() if relevant else snippet[:400]


def extract_state(text: str) -> str:
    states = {
        "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID",
        "IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS",
        "MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
        "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
        "WI","WY","DC",
    }
    m = re.search(r'\b(' + '|'.join(states) + r')\b', text)
    return m.group(1) if m else ""


def fetch(url: str, timeout: int = 12) -> Optional[str]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        if r.status_code != 200:
            return None
        ct = r.headers.get("content-type", "")
        if "pdf" in ct or url.lower().endswith(".pdf"):
            try:
                import io
                from pdfminer.high_level import extract_text
                return extract_text(io.BytesIO(r.content))
            except Exception:
                return None
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script","style","nav","footer","header"]):
            tag.decompose()
        return soup.get_text(" ", strip=True)
    except Exception:
        return None


def analyze(url: str, title: str) -> Optional[dict]:
    text = fetch(url)
    if not text or len(text) < 80:
        return None
    for pat, sig_type, sig_label in SIGNAL_PATTERNS:
        m = pat.search(text)
        if m:
            quote = extract_quote(text, m)
            if any(v in quote.lower() for v in [
                "bamboohr","gusto","rippling","workday","hris system",
                "our platform","our software","onboarding software","our product",
            ]):
                continue
            state = extract_state(text[:3000])
            industry = detect_industry(text[:5000] + " " + title)
            is_job = any(kw in text[:2000].lower() for kw in [
                "responsibilities","qualifications","requirements","duties",
                "we are looking for","you will be responsible",
            ])
            is_doc = url.endswith(".pdf") or any(d in url for d in [".edu/",".org/",".gov/"])
            return {
                "signal_type": sig_type, "signal": sig_label, "quote": quote,
                "state_province": state, "industry": industry,
                "confidence": "High" if (is_job or is_doc) else "Medium",
            }
    return None


URL_PACKET_RE = re.compile(
    r"(new.hire.packet|new.employee.packet|newhire.packet|new_hire_packet|"
    r"employee.packet|caregiver.packet|staff.packet|onboarding.packet|"
    r"new.hire.forms|new.hire.checklist|employee.onboarding)",
    re.I
)
SKIP_HOSTS_FOR_PDF = {"scribd","issuu","slideshare","docsend","dropbox","drive.google",
                      "sharepoint","s3.amazonaws","hubspotusercontent","squarespace",
                      "webflow","wixsite","hibu","rackcdn","cloudfront","fastly"}


def is_company_packet_url(url: str) -> bool:
    if not url.lower().endswith(".pdf"):
        return False
    host = urlparse(url).netloc.lower()
    if any(s in host for s in SKIP_HOSTS_FOR_PDF):
        return False
    return bool(URL_PACKET_RE.search(urlparse(url).path.lower()))


def company_name_from(title: str, url: str) -> str:
    if title:
        m = re.search(r'\bat\s+([^|–\-]{3,60})', title, re.I)
        if m:
            name = m.group(1).strip()
            if 3 < len(name) < 60 and "job" not in name.lower():
                return name
        parts = re.split(r'[|–\-]', title)
        if len(parts) >= 2:
            c = parts[-1].strip()
            if 3 < len(c) < 70:
                return c
    host = urlparse(url).netloc.replace("www.","").split(".")[0]
    return host.replace("-"," ").title()


def ddg(query: str, n: int = 10, retries: int = 4) -> list[dict]:
    for attempt in range(retries):
        try:
            with DDGS() as d:
                results = list(d.text(query, max_results=n))
                if results:
                    return results
                wait = 10 * (attempt + 1)
                print(f"  DDG empty, waiting {wait}s...", file=sys.stderr)
                time.sleep(wait)
        except Exception as e:
            msg = str(e)
            if any(x in msg.lower() for x in ["no results","rate","429","ratelimit","too many"]):
                wait = 20 * (attempt + 1)
                print(f"  DDG rate-limited (attempt {attempt+1}), waiting {wait}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                print(f"  DDG error: {e}", file=sys.stderr)
                return []
    return []


def to_row(r: dict) -> dict:
    st = r.get("signal_type","")
    return {
        "Company Name": r.get("company_name",""),
        "Verified Company Domain": r.get("domain",""),
        "Official Website": r.get("website",""),
        "Country": "US",
        "State or Province": r.get("state_province",""),
        "Industry": r.get("industry",""),
        "Estimated Employee Count": "",
        "Exact Manual-Onboarding Signal": r.get("signal",""),
        "Exact Evidence Quote": r.get("quote","").replace("\n"," ").replace("\r"," ").strip(),
        "Reason This Indicates Manual Onboarding": SIGNAL_REASONS.get(st,""),
        "Signal Type": st,
        "Evidence Source Title": r.get("source_title",""),
        "Verified Evidence Link": r.get("source_url",""),
        "Evidence Date": "",
        "Confidence Level": r.get("confidence",""),
        "Recommended Outreach Angle": OUTREACH_ANGLES.get(st,""),
    }


def main():
    OUT = "/Users/tanishqmac/lead-intel/scripts/nano_batch3_leads.csv"
    seen_urls: set[str] = set()
    seen_domains: set[str] = ALREADY_FOUND.copy()
    leads: list[dict] = []

    print("Nano Batch 3 — 120+ Hyper-Targeted Queries")
    print(f"Queries: {len(SEARCH_QUERIES)} | Pre-skipping {len(ALREADY_FOUND)} known domains")
    print("=" * 72)

    for qi, query in enumerate(SEARCH_QUERIES, 1):
        print(f"\n[{qi}/{len(SEARCH_QUERIES)}] {query[:80]}...")
        results = ddg(query, n=10)
        candidates = []
        for r in results:
            url = r.get("href","")
            if not url or url in seen_urls or should_skip(url):
                continue
            snippet = (r.get("title","") + " " + r.get("body","")).lower()
            if not any(p.search(snippet) for p, _, _ in SIGNAL_PATTERNS):
                continue
            seen_urls.add(url)
            candidates.append({"url": url, "title": r.get("title",""), "body": r.get("body","")})

        print(f"  DDG: {len(results)} → candidates: {len(candidates)}")
        time.sleep(4)  # polite delay between queries

        for c in candidates:
            dom = canonical(c["url"])
            if dom in seen_domains:
                continue
            print(f"  Fetching: {c['url'][:80]}...")

            if is_company_packet_url(c["url"]):
                result = {
                    "signal_type": "paper_packets",
                    "signal": "new hire packet PDF on company domain",
                    "quote": f"Company hosts a new hire packet PDF: {c['url']}",
                    "state_province": "",
                    "industry": detect_industry(c["title"]),
                    "confidence": "High",
                }
            else:
                result = analyze(c["url"], c["title"])
            time.sleep(1)

            if not result:
                continue

            name = company_name_from(c["title"], c["url"])
            if any(s in name.lower() for s in [
                "template","how to","what is","sample","free printable",
                "blog","article","guide","overview",
            ]):
                continue

            seen_domains.add(dom)
            host = urlparse(c["url"]).netloc.lower().replace("www.","")
            leads.append(to_row({
                "company_name": name,
                "domain": dom,
                "website": f"https://www.{dom}",
                **result,
                "source_title": c["title"],
                "source_url": c["url"],
            }))
            print(f"  ✓ {name} [{dom}] [{result['confidence']}] — {result['signal_type']}")

        # Checkpoint every 20 queries
        if qi % 20 == 0 and leads:
            with open(OUT, "w", newline="", encoding="utf-8") as f:
                csv.DictWriter(f, fieldnames=CSV_FIELDS).writeheader()
                csv.DictWriter(f, fieldnames=CSV_FIELDS).writerows(leads)
            print(f"  ── checkpoint: {len(leads)} leads saved ──")

    print(f"\n{'='*72}")
    print(f"Batch 3 total: {len(leads)} leads")
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        w.writerows(leads)
    print(f"Saved → {OUT}")
    for r in leads:
        print(f"  • {r['Company Name']} ({r['Verified Company Domain']}) [{r['Signal Type']}] [{r['Confidence Level']}]")


if __name__ == "__main__":
    main()
