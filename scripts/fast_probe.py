"""
Fast targeted prober — uses HEAD to skip 404s, only fetches confirmed URLs.
Targets smaller/regional companies that commonly have public new hire packet PDFs.
Output: scripts/fast_probe_leads.csv
"""
import csv
import re
import time
from typing import Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

# (domain, company_name, industry, state, headcount, probe_urls)
# probe_urls: most likely URL for a new hire packet on this specific domain
TARGETS = [
    # ── Home care / hospice ─────────────────────────────────────────────────────
    ("brightspringhealth.com", "BrightSpring Health Services", "Healthcare / Home Care", "KY", "40,000+",
     ["/careers", "/hr/new-hire-packet", "/new-hire-packet.pdf"]),
    ("almostatvhome.com", "Almost Family Home Health", "Healthcare / Home Care", "KY", "5,000+",
     ["/new-hire-packet.pdf", "/careers/new-hire-packet"]),
    ("chartersenior.com", "Charter Senior Living", "Senior Living", "TN", "2,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire"]),
    ("paramounthomehealth.com", "Paramount Home Health", "Healthcare / Home Care", "TX", "500+",
     ["/new-hire-packet.pdf", "/caregiver-forms", "/forms"]),
    ("hcsgcorp.com", "HCSG (Healthcare Services Group)", "Healthcare / Home Care", "PA", "40,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("sunriseseniorliving.com", "Sunrise Senior Living", "Senior Living", "VA", "30,000+",
     ["/careers/new-hire-packet", "/new-hire-packet.pdf"]),
    ("genesishcc.com", "Genesis Healthcare", "Senior Living", "PA", "40,000+",
     ["/new-hire-packet.pdf", "/careers/new-hire"]),
    # ── School districts ────────────────────────────────────────────────────────
    ("friscoisd.org", "Frisco ISD", "Education", "TX", "8,000+",
     ["/hr/new-hire-packet", "/human-resources/new-hire-packet",
      "/sites/default/files/new-hire-packet.pdf", "/new-hire-packet.pdf"]),
    ("conroeisd.net", "Conroe ISD", "Education", "TX", "10,000+",
     ["/new-hire-packet", "/hr/new-hire-packet.pdf", "/human-resources/new-hire"]),
    ("kleinisd.net", "Klein ISD", "Education", "TX", "8,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/human-resources/new-hire-packet"]),
    ("fortbendisd.com", "Fort Bend ISD", "Education", "TX", "12,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire", "/human-resources/new-hire-packet"]),
    ("killeenisd.org", "Killeen ISD", "Education", "TX", "7,000+",
     ["/hr/new-hire-packet", "/new-hire-packet.pdf"]),
    ("neisd.net", "North East ISD (San Antonio)", "Education", "TX", "10,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/human-resources"]),
    ("northsideisd.net", "Northside ISD", "Education", "TX", "15,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("pisd.edu", "Plano ISD", "Education", "TX", "8,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/human-resources/new-hire"]),
    ("pgcps.org", "Prince George's County Public Schools", "Education", "MD", "20,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/human-resources/new-hire-packet"]),
    ("ccsd.net", "Clark County School District", "Education", "NV", "40,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/human-resources"]),
    ("philasd.org", "School District of Philadelphia", "Education", "PA", "15,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("houstonisd.org", "Houston ISD", "Education", "TX", "30,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire", "/human-resources/new-hire-packet"]),
    # ── Community colleges ──────────────────────────────────────────────────────
    ("harpercollege.edu", "Harper College", "Education", "IL", "1,000+",
     ["/hr/new-hire-packet", "/new-hire-packet.pdf", "/human-resources/new-hire"]),
    ("racc.edu", "Reading Area Community College", "Education", "PA", "500+",
     ["/hr/new-hire-packet", "/new-hire-packet.pdf"]),
    ("elgin.edu", "Elgin Community College", "Education", "IL", "1,000+",
     ["/hr/new-hire-packet", "/new-hire-packet.pdf"]),
    ("ivytech.edu", "Ivy Tech Community College", "Education", "IN", "10,000+",
     ["/hr/new-hire-packet", "/human-resources/new-hire-packet.pdf"]),
    ("austincc.edu", "Austin Community College", "Education", "TX", "3,000+",
     ["/hr/new-hire-packet", "/new-hire-packet.pdf"]),
    # ── Nonprofits ──────────────────────────────────────────────────────────────
    ("bethesda.org", "Bethesda (Lutheran Communities)", "Nonprofit", "WI", "3,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("maryvale.org", "Maryvale", "Nonprofit", "CA", "1,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("crisiscenter.com", "Crisis Center", "Nonprofit", "TX", "500+",
     ["/new-hire-packet.pdf", "/forms"]),
    ("lutheranservices.org", "Lutheran Services in America", "Nonprofit", "DC", "2,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("catholiccharitiesusa.org", "Catholic Charities USA", "Nonprofit", "VA", "1,000+",
     ["/new-hire-packet.pdf", "/human-resources"]),
    ("easterseals.com", "Easter Seals", "Nonprofit", "IL", "10,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire"]),
    # ── Construction / trades ───────────────────────────────────────────────────
    ("sundt.com", "Sundt Construction", "Construction", "AZ", "2,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/careers/new-hire"]),
    ("walbridge.com", "Walbridge", "Construction", "MI", "2,000+",
     ["/new-hire-packet.pdf", "/careers/new-hire-packet"]),
    ("mccarthybuilding.com", "McCarthy Building Companies", "Construction", "MO", "5,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("perkinseastman.com", "Perkins Eastman", "Construction", "NY", "1,000+",
     ["/new-hire-packet.pdf", "/hr"]),
    ("hksinc.com", "HKS Architects", "Construction", "TX", "1,500+",
     ["/new-hire-packet.pdf", "/hr/new-hire"]),
    # ── Staffing ────────────────────────────────────────────────────────────────
    ("staffmark.com", "Staffmark Group", "Staffing", "TN", "30,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/careers/new-hire"]),
    ("resourcemfg.com", "ResourceMFG (TrueBlue)", "Staffing", "OH", "10,000+",
     ["/new-hire-packet.pdf", "/new-hire-packet", "/hr/new-hire-packet"]),
    ("remx.com", "RemX Specialty Staffing", "Staffing", "TX", "1,000+",
     ["/new-hire-packet.pdf", "/careers/new-hire"]),
    # ── Healthcare systems ──────────────────────────────────────────────────────
    ("integrishealth.com", "INTEGRIS Health", "Healthcare", "OK", "8,000+",
     ["/new-hire-packet.pdf", "/careers/new-hire", "/hr/new-hire-packet"]),
    ("hartfordhealthcare.org", "Hartford HealthCare", "Healthcare", "CT", "20,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire", "/human-resources/new-hire-packet"]),
    ("highmarkhealth.org", "Highmark Health", "Healthcare", "PA", "30,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("peakresources.org", "Peak Resources", "Senior Living", "NC", "2,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet", "/careers/new-hire"]),
    ("centrahealth.com", "Centra Health", "Healthcare", "VA", "5,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("salemhealth.org", "Salem Health", "Healthcare", "OR", "4,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("mcleodhealth.org", "McLeod Health", "Healthcare", "SC", "4,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("wellspan.org", "WellSpan Health", "Healthcare", "PA", "23,000+",
     ["/new-hire-packet.pdf", "/careers/new-hire-packet", "/hr/new-hire-packet"]),
    ("baptisthealth.com", "Baptist Health South Florida", "Healthcare", "FL", "24,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    ("utmb.edu", "UTMB Health", "Healthcare", "TX", "13,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire-packet"]),
    # ── Local government ────────────────────────────────────────────────────────
    ("cityofmesaaz.gov", "City of Mesa, AZ", "Government", "AZ", "5,000+",
     ["/hr/new-hire-packet", "/human-resources/new-hire-packet.pdf"]),
    ("fortworth.gov", "City of Fort Worth, TX", "Government", "TX", "7,000+",
     ["/hr/new-hire-packet", "/human-resources/new-hire-packet.pdf"]),
    ("sandiego.gov", "City of San Diego", "Government", "CA", "12,000+",
     ["/hr/new-hire-packet", "/human-resources/new-hire-packet.pdf"]),
    ("tucsonaz.gov", "City of Tucson, AZ", "Government", "AZ", "3,500+",
     ["/hr/new-hire-packet", "/new-hire-packet.pdf"]),
    ("jaxsheriff.org", "Jacksonville Sheriff's Office", "Government", "FL", "3,000+",
     ["/new-hire-packet.pdf", "/hr/new-hire"]),
]

SIGNAL_PATTERNS = [
    (re.compile(r"new.hire\s+packet", re.I), "paper_packets", "new hire packet"),
    (re.compile(r"new.employee\s+packet", re.I), "paper_packets", "new employee packet"),
    (re.compile(r"bring\s+(completed\s+)?paperwork", re.I), "in_person_paperwork", "bring completed paperwork"),
    (re.compile(r"complete\s+(and\s+return|paperwork)\s+before\s+(your\s+)?first\s+day", re.I), "in_person_paperwork", "complete before first day"),
    (re.compile(r"return\s+(completed\s+)?forms?\s+to\s+HR", re.I), "email_forms", "return completed forms to HR"),
    (re.compile(r"fax\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "fax completed forms"),
    (re.compile(r"print\s+and\s+(complete|fill|sign)", re.I), "paper_packets", "print and complete forms"),
    (re.compile(r"handwritten\s+fields?", re.I), "paper_packets", "handwritten fields"),
    (re.compile(r"paper.based\s+onboarding", re.I), "paper_packets", "paper-based onboarding"),
    (re.compile(r"mail\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "mail completed forms"),
]

SIGNAL_REASONS = {
    "paper_packets": "Uses physical new-hire packets — printing, filling, collecting paper forms.",
    "in_person_paperwork": "New hires complete paperwork on their first day — no e-signature.",
    "email_forms": "Distributes or collects onboarding forms via email with no digital workflow.",
    "fax_mail": "Sends or accepts onboarding documents by fax or mail.",
    "physical_files": "Maintains physical personnel files — paper-based record keeping.",
    "manual_data_entry": "HR manually enters new hire data into payroll/HR systems from paper.",
    "spreadsheet": "Tracks onboarding progress in Excel/Sheets instead of an HRIS.",
}

OUTREACH_ANGLES = {
    "paper_packets": "Replace your paper new-hire packets with mobile-first digital onboarding so new hires complete everything before day one.",
    "in_person_paperwork": "Let new hires complete all their paperwork digitally before day one.",
    "email_forms": "Eliminate the back-and-forth of emailing forms by letting new hires e-sign everything in one flow.",
    "fax_mail": "Replace fax/mail forms with a mobile onboarding link new hires complete in under 10 minutes.",
    "physical_files": "Digitize your physical personnel files to reduce compliance risk and free up HR time.",
    "manual_data_entry": "Eliminate manual data entry by having new hires self-serve their own info directly into your payroll system.",
    "spreadsheet": "Replace your Excel onboarding tracker with real-time visibility into every new hire's completion status.",
}

CSV_FIELDS = [
    "Company Name", "Verified Company Domain", "Official Website", "Country",
    "State or Province", "Industry", "Estimated Employee Count",
    "Exact Manual-Onboarding Signal", "Exact Evidence Quote",
    "Reason This Indicates Manual Onboarding", "Signal Type",
    "Evidence Source Title", "Verified Evidence Link", "Evidence Date",
    "Confidence Level", "Recommended Outreach Angle",
]

ALREADY_FOUND = {
    "montefioreeinstein.org", "wou.edu", "mercy.com", "cfocolorado.biz",
    "gavilan.edu", "rcc.edu", "nau.edu", "arizona.edu", "unl.edu",
    "oswego.edu", "seattleu.edu", "oregon.gov", "oregonmetro.gov",
    "hawaii.gov", "wellstar.org", "inova.org", "hratexas.org",
    "fluidmgmt.com", "pallcarenj.org", "lssmn.org", "employerflexible.com",
    "mmyerscpa.com", "nyc.gov", "apsd1.org", "northlandchristian.org",
    "idaho-dea.org", "towson.edu", "ttu.edu", "natlm.com", "thetintstitute.com",
}


def head_ok(url: str, timeout: int = 5) -> bool:
    try:
        r = requests.head(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def fetch_text(url: str, timeout: int = 10) -> Optional[str]:
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
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(" ", strip=True)
    except Exception:
        return None


def extract_quote(text: str, match: re.Match, ctx: int = 300) -> str:
    start = max(0, match.start() - ctx)
    end = min(len(text), match.end() + ctx)
    snippet = text[start:end].strip()
    sentences = re.split(r'(?<=[.!?])\s+', snippet)
    relevant = [s for s in sentences if match.re.search(s)]
    return " ".join(relevant[:3]).strip() if relevant else snippet[:400]


def probe(domain: str, urls: list[str]) -> Optional[dict]:
    for path in urls:
        url = f"https://www.{domain}{path}"
        # Fast HEAD check first
        if not head_ok(url):
            url = f"https://{domain}{path}"
            if not head_ok(url):
                continue
        # URL exists — fetch and analyze
        text = fetch_text(url)
        if not text or len(text) < 50:
            continue
        for pat, sig_type, sig_label in SIGNAL_PATTERNS:
            m = pat.search(text)
            if m:
                quote = extract_quote(text, m)
                if any(v in quote.lower() for v in ["bamboohr", "gusto", "rippling", "workday", "our software"]):
                    continue
                return {
                    "signal_type": sig_type,
                    "signal": sig_label,
                    "quote": quote,
                    "source_url": url,
                    "is_pdf": url.lower().endswith(".pdf"),
                }
    return None


def main():
    out_file = "/Users/tanishqmac/lead-intel/scripts/fast_probe_leads.csv"
    leads = []
    seen = ALREADY_FOUND.copy()

    print("Fast Targeted Prober")
    print(f"Targets: {len(TARGETS)} companies (HEAD+GET, skips 404s)")
    print("=" * 70)

    for i, (domain, company_name, industry, state, headcount, probe_urls) in enumerate(TARGETS, 1):
        if domain in seen:
            continue
        print(f"[{i}/{len(TARGETS)}] {company_name} ({domain})...", end=" ", flush=True)
        result = probe(domain, probe_urls)
        time.sleep(0.3)
        if result:
            st = result["signal_type"]
            conf = "High" if result["is_pdf"] else "Medium"
            row = {
                "Company Name": company_name,
                "Verified Company Domain": domain,
                "Official Website": f"https://www.{domain}",
                "Country": "US",
                "State or Province": state,
                "Industry": industry,
                "Estimated Employee Count": headcount,
                "Exact Manual-Onboarding Signal": result["signal"],
                "Exact Evidence Quote": result["quote"].replace("\n", " ").replace("\r", " ").strip(),
                "Reason This Indicates Manual Onboarding": SIGNAL_REASONS.get(st, ""),
                "Signal Type": st,
                "Evidence Source Title": f"{company_name} — HR Page",
                "Verified Evidence Link": result["source_url"],
                "Evidence Date": "",
                "Confidence Level": conf,
                "Recommended Outreach Angle": OUTREACH_ANGLES.get(st, ""),
            }
            leads.append(row)
            seen.add(domain)
            print(f"✓ [{st}] [{conf}]")
        else:
            print("—")

    print(f"\n{'='*70}")
    print(f"Fast probe leads: {len(leads)}")
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(leads)
    print(f"Saved → {out_file}")
    for r in leads:
        print(f"  • {r['Company Name']} ({r['Verified Company Domain']}) [{r['Signal Type']}]")


if __name__ == "__main__":
    main()
