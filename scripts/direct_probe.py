"""
Direct URL prober — hits known company domains directly for new hire packet evidence.
No search engine needed. Tests ~150 companies across high-manual-onboarding industries.
Output: scripts/direct_probe_leads.csv
"""
import csv
import re
import time
from typing import Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

# ── Target companies: domain → (company name, industry, state, headcount) ──────
# These are companies known to operate in industries with high paper onboarding rates.
# We probe their HR/careers pages and known PDF URL patterns for evidence.
TARGETS = {
    # ── Home Care / Home Health ──────────────────────────────────────────────────
    "bayada.com": ("BAYADA Home Health Care", "Healthcare / Home Care", "NJ", "25,000+"),
    "amedisys.com": ("Amedisys Home Health", "Healthcare / Home Care", "LA", "20,000+"),
    "lhcgroup.com": ("LHC Group", "Healthcare / Home Care", "LA", "30,000+"),
    "brightspringhealth.com": ("BrightSpring Health Services", "Healthcare / Home Care", "KY", "40,000+"),
    "encompasshealth.com": ("Encompass Health", "Healthcare", "AL", "40,000+"),
    "almostatvhome.com": ("Almost Family Home Health", "Healthcare / Home Care", "KY", "5,000+"),
    "accentcare.com": ("AccentCare", "Healthcare / Home Care", "TX", "30,000+"),
    "comfortsystems.com": ("Comfort Systems", "HVAC / Field Services", "TX", "10,000+"),
    "apria.com": ("Apria Healthcare", "Healthcare / Home Care", "IN", "10,000+"),
    "staffmark.com": ("Staffmark Group", "Staffing", "TN", "30,000+"),
    # ── Senior Living ────────────────────────────────────────────────────────────
    "sunriseseniorliving.com": ("Sunrise Senior Living", "Senior Living", "VA", "30,000+"),
    "brookdaleliving.com": ("Brookdale Senior Living", "Senior Living", "TN", "50,000+"),
    "fivestarseniorliving.com": ("Five Star Senior Living", "Senior Living", "MA", "10,000+"),
    "holidaytouch.com": ("Holiday Retirement", "Senior Living", "OR", "5,000+"),
    "seniorliving.org": ("SeniorLiving.org", "Senior Living", "", ""),
    "benchmarkseniorliving.com": ("Benchmark Senior Living", "Senior Living", "MA", "5,000+"),
    "morrisons.ca": ("Morrison Healthcare", "Healthcare", "", ""),
    "lifespacecommunities.com": ("Life Space Communities", "Senior Living", "TX", "2,000+"),
    "hartfordhealthcare.org": ("Hartford HealthCare", "Healthcare", "CT", "20,000+"),
    "integrishealth.com": ("INTEGRIS Health", "Healthcare", "OK", "8,000+"),
    "peakresources.org": ("Peak Resources", "Senior Living", "NC", "2,000+"),
    "highmarkhealth.org": ("Highmark Health", "Healthcare", "PA", "30,000+"),
    "genesishcc.com": ("Genesis Healthcare", "Senior Living", "PA", "40,000+"),
    "kindredhealthcare.com": ("Kindred Healthcare", "Healthcare", "TX", "40,000+"),
    "maryvale.org": ("Maryvale", "Nonprofit / Social Services", "CA", "1,000+"),
    # ── Childcare / Daycare ───────────────────────────────────────────────────────
    "kindercare.com": ("KinderCare Learning Centers", "Education / Childcare", "OR", "30,000+"),
    "learningcaregroup.com": ("Learning Care Group", "Education / Childcare", "MI", "20,000+"),
    "brighthorizons.com": ("Bright Horizons", "Education / Childcare", "MA", "30,000+"),
    "discoverycsd.com": ("Discovery Child Care", "Education / Childcare", "", ""),
    "ymca.net": ("YMCA of the USA", "Nonprofit", "", "10,000+"),
    # ── Restaurant / Hospitality ──────────────────────────────────────────────────
    "darden.com": ("Darden Restaurants", "Hospitality", "FL", "180,000+"),
    "cracker-barrel.com": ("Cracker Barrel", "Hospitality", "TN", "70,000+"),
    "whataburger.com": ("Whataburger", "Hospitality", "TX", "50,000+"),
    "hardees.com": ("Hardee's / CKE Restaurants", "Hospitality", "CA", "20,000+"),
    "dennys.com": ("Denny's", "Hospitality", "SC", "10,000+"),
    "waffle-house.com": ("Waffle House", "Hospitality", "GA", "40,000+"),
    "bobevans.com": ("Bob Evans Farms", "Hospitality", "OH", "10,000+"),
    "dqtexas.com": ("Dairy Queen Texas", "Hospitality", "TX", ""),
    # ── Retail ────────────────────────────────────────────────────────────────────
    "spartan-nash.com": ("SpartanNash", "Retail", "MI", "17,000+"),
    "pigglywiggly.com": ("Piggly Wiggly", "Retail", "WI", "15,000+"),
    "weis.com": ("Weis Markets", "Retail", "PA", "23,000+"),
    "ingles-markets.com": ("Ingles Markets", "Retail", "NC", "30,000+"),
    "winco.com": ("WinCo Foods", "Retail", "ID", "15,000+"),
    "raisingcanes.com": ("Raising Cane's", "Hospitality", "LA", "45,000+"),
    # ── Construction / Trades ─────────────────────────────────────────────────────
    "skanska.com": ("Skanska USA", "Construction", "NY", "10,000+"),
    "michaels.com": ("Michaels Stores", "Retail", "TX", "40,000+"),
    "henselphelpsconstruction.com": ("Hensel Phelps Construction", "Construction", "CO", "6,000+"),
    "pcl.com": ("PCL Construction", "Construction", "AB", "5,000+"),
    "sundt.com": ("Sundt Construction", "Construction", "AZ", "2,000+"),
    "walbridge.com": ("Walbridge", "Construction", "MI", "2,000+"),
    "aecom.com": ("AECOM", "Construction", "CA", "50,000+"),
    "grainger.com": ("Grainger Industrial", "Manufacturing", "IL", "25,000+"),
    # ── Transportation / Logistics ────────────────────────────────────────────────
    "unisonlogistics.com": ("Unison Logistics", "Logistics", "GA", "500+"),
    "covenant.com": ("Covenant Logistics", "Logistics", "TN", "5,000+"),
    "usxpress.com": ("U.S. Xpress", "Logistics", "TN", "10,000+"),
    "heartlandexpress.com": ("Heartland Express", "Logistics", "IA", "5,000+"),
    "landstaronline.com": ("Landstar System", "Logistics", "FL", "15,000+"),
    "estes-express.com": ("Estes Express Lines", "Logistics", "VA", "13,000+"),
    # ── Staffing / Workforce ──────────────────────────────────────────────────────
    "laborready.com": ("Labor Ready (TrueBlue)", "Staffing", "WA", "5,000+"),
    "trueblue.com": ("TrueBlue Inc.", "Staffing", "WA", "5,000+"),
    "remx.com": ("RemX Specialty Staffing", "Staffing", "TX", "1,000+"),
    "apexstaffing.net": ("Apex Staffing", "Staffing", "TX", "500+"),
    "tempforce.com": ("TempForce", "Staffing", "TX", "500+"),
    "resourcemfg.com": ("ResourceMFG", "Staffing", "OH", "10,000+"),
    # ── Security ──────────────────────────────────────────────────────────────────
    "securitas.us": ("Securitas Security USA", "Security", "TX", "100,000+"),
    "guardmarkamerica.com": ("GuardMark America", "Security", "TX", "500+"),
    "usprotect.com": ("US Protect", "Security", "GA", "2,000+"),
    "allieduniversal.com": ("Allied Universal", "Security", "CA", "800,000+"),
    # ── Nonprofit ─────────────────────────────────────────────────────────────────
    "unitedway.org": ("United Way Worldwide", "Nonprofit", "VA", "2,000+"),
    "redcross.org": ("American Red Cross", "Nonprofit", "DC", "35,000+"),
    "salvationarmy.org": ("The Salvation Army", "Nonprofit", "VA", "30,000+"),
    "catholiccharitiesusa.org": ("Catholic Charities USA", "Nonprofit", "VA", "1,000+"),
    "habitatforhumanity.org": ("Habitat for Humanity", "Nonprofit", "GA", "1,000+"),
    "goodwill.org": ("Goodwill Industries", "Nonprofit", "MD", "100,000+"),
    "easterseals.com": ("Easter Seals", "Nonprofit", "IL", "10,000+"),
    "arcoftheusa.org": ("The Arc of the United States", "Nonprofit", "DC", "1,000+"),
    # ── Property Management ───────────────────────────────────────────────────────
    "greystar.com": ("Greystar Real Estate", "Property Management", "SC", "20,000+"),
    "equityapartments.com": ("Equity Residential", "Property Management", "IL", "3,000+"),
    "camden.com": ("Camden Property Trust", "Property Management", "TX", "2,000+"),
    "aimco.com": ("Aimco", "Property Management", "CO", "1,000+"),
    "nationalparkservice.gov": ("National Park Service", "Government", "DC", "20,000+"),
    # ── Government / Military ─────────────────────────────────────────────────────
    "usajobs.gov": ("USAJobs / Federal HR", "Government", "DC", ""),
    "opm.gov": ("U.S. Office of Personnel Management", "Government", "DC", "5,000+"),
    # ── Education ─────────────────────────────────────────────────────────────────
    "ccsd.net": ("Clark County School District", "Education", "NV", "40,000+"),
    "browardschools.com": ("Broward County Schools", "Education", "FL", "30,000+"),
    "schools.nyc.gov": ("NYC Department of Education", "Education", "NY", "140,000+"),
    "lausd.net": ("Los Angeles Unified School District", "Education", "CA", "70,000+"),
    "cps.edu": ("Chicago Public Schools", "Education", "IL", "40,000+"),
    "houstonisd.org": ("Houston ISD", "Education", "TX", "30,000+"),
    "philasd.org": ("Philadelphia School District", "Education", "PA", "15,000+"),
    "miamidade.k12.fl.us": ("Miami-Dade County Public Schools", "Education", "FL", "50,000+"),
    "pgcps.org": ("Prince George's County Public Schools", "Education", "MD", "20,000+"),
    "friscoisd.org": ("Frisco ISD", "Education", "TX", "8,000+"),
    "conroeisd.net": ("Conroe ISD", "Education", "TX", "10,000+"),
    "kleinisd.net": ("Klein ISD", "Education", "TX", "8,000+"),
    "fortbendisd.com": ("Fort Bend ISD", "Education", "TX", "12,000+"),
    "fwisd.org": ("Fort Worth ISD", "Education", "TX", "12,000+"),
    "mesquiteisd.org": ("Mesquite ISD", "Education", "TX", "5,000+"),
    "killeenisd.org": ("Killeen ISD", "Education", "TX", "7,000+"),
    "comalisd.org": ("Comal ISD", "Education", "TX", "4,000+"),
    "neisd.net": ("North East ISD (San Antonio)", "Education", "TX", "10,000+"),
    "northsideisd.net": ("Northside ISD", "Education", "TX", "15,000+"),
    "harlingtoncisd.net": ("Harlingen CISD", "Education", "TX", "5,000+"),
    "pisd.edu": ("Plano ISD", "Education", "TX", "8,000+"),
}

# URL patterns to probe per domain
URL_PATTERNS = [
    "/hr/new-hire-packet",
    "/hr/new-hire-packet.pdf",
    "/human-resources/new-hire-packet",
    "/human-resources/new-hire-packet.pdf",
    "/careers/new-hire-packet",
    "/careers/new-hire-packet.pdf",
    "/new-hire-packet",
    "/new-hire-packet.pdf",
    "/new-hire-forms",
    "/new-hire-forms.pdf",
    "/employee-packet.pdf",
    "/new-employee-packet.pdf",
    "/new_hire_packet.pdf",
    "/new-employee-packet",
    "/employment/new-hire",
    "/jobs/new-hire-packet",
    "/documents/new-hire-packet.pdf",
    "/wp-content/uploads/new-hire-packet.pdf",
    "/sites/default/files/new-hire-packet.pdf",
    "/files/new-hire-packet.pdf",
    "/assets/new-hire-packet.pdf",
    "/hr/employee-paperwork",
    "/new-hire/paperwork",
    "/onboarding",
    "/hr-forms",
    "/hr/forms",
]

# Signal patterns for text analysis
SIGNAL_PATTERNS = [
    (re.compile(r"new.hire\s+packet", re.I), "paper_packets", "new hire packet"),
    (re.compile(r"new.employee\s+packet", re.I), "paper_packets", "new employee packet"),
    (re.compile(r"bring\s+(completed\s+)?paperwork", re.I), "in_person_paperwork", "bring completed paperwork"),
    (re.compile(r"complete\s+(and\s+return|paperwork)\s+before\s+(your\s+)?first\s+day", re.I), "in_person_paperwork", "complete before first day"),
    (re.compile(r"return\s+(completed\s+)?forms?\s+to\s+HR", re.I), "email_forms", "return completed forms to HR"),
    (re.compile(r"fax\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "fax completed forms"),
    (re.compile(r"mail\s+(completed\s+)?forms?\s+to", re.I), "fax_mail", "mail completed forms"),
    (re.compile(r"email\s+completed\s+forms?\s+to", re.I), "email_forms", "email completed forms"),
    (re.compile(r"print\s+and\s+(complete|fill|sign)", re.I), "paper_packets", "print and complete/sign forms"),
    (re.compile(r"paper.based\s+onboarding", re.I), "paper_packets", "paper-based onboarding"),
    (re.compile(r"handwritten\s+fields?", re.I), "paper_packets", "handwritten fields"),
    (re.compile(r"prepare\s+new.hire\s+packets?", re.I), "paper_packets", "prepare new hire packets"),
    (re.compile(r"maintain\s+physical\s+personnel\s+files?", re.I), "physical_files", "physical personnel files"),
    (re.compile(r"scan\s+and\s+file\s+employee", re.I), "physical_files", "scan and file employee documents"),
    (re.compile(r"manually\s+enter.*new\s+hire", re.I), "manual_data_entry", "manually enter new hire data"),
    (re.compile(r"report\s+to\s+HR\s+(on\s+)?first\s+day", re.I), "in_person_paperwork", "report to HR on first day"),
]

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

ALREADY_FOUND = {
    "montefioreeinstein.org", "wou.edu", "mercy.com", "cfocolorado.biz",
    "gavilan.edu", "rcc.edu", "nau.edu", "arizona.edu", "unl.edu",
    "oswego.edu", "seattleu.edu", "oregon.gov", "oregonmetro.gov",
    "hawaii.gov", "wellstar.org", "inova.org", "hratexas.org",
    "fluidmgmt.com", "pallcarenj.org", "lssmn.org", "employerflexible.com",
    "mmyerscpa.com",
}


def fetch(url: str, timeout: int = 10) -> Optional[str]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        if r.status_code not in (200, 206):
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


def probe_domain(domain: str, company_name: str) -> Optional[dict]:
    """Try multiple URL patterns on the domain for new hire packet evidence."""
    for pattern in URL_PATTERNS:
        url = f"https://www.{domain}{pattern}"
        text = fetch(url)
        if not text or len(text) < 50:
            continue
        for sig_pat, sig_type, sig_label in SIGNAL_PATTERNS:
            m = sig_pat.search(text)
            if m:
                quote = extract_quote(text, m)
                # Skip if generic vendor content
                if any(v in quote.lower() for v in ["bamboohr", "gusto", "rippling", "workday", "our software", "our platform"]):
                    continue
                return {
                    "signal_type": sig_type,
                    "signal": sig_label,
                    "quote": quote,
                    "source_url": url,
                    "is_pdf": url.lower().endswith(".pdf"),
                }
        time.sleep(0.3)
    return None


def main():
    output_file = "/Users/tanishqmac/lead-intel/scripts/direct_probe_leads.csv"
    leads = []
    seen = ALREADY_FOUND.copy()

    print("Direct Domain Prober — Known High-Manual-Onboarding Companies")
    print(f"Targets: {len(TARGETS)} companies")
    print("=" * 70)

    for i, (domain, (company_name, industry, state, headcount)) in enumerate(TARGETS.items(), 1):
        if domain in seen:
            print(f"  [skip] {domain} (already found)")
            continue

        print(f"[{i}/{len(TARGETS)}] Probing {domain} ({company_name})...")
        result = probe_domain(domain, company_name)

        if result:
            st = result["signal_type"]
            confidence = "High" if result["is_pdf"] else "Medium"
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
                "Evidence Source Title": f"{company_name} — {result['source_url'].split('/')[-1]}",
                "Verified Evidence Link": result["source_url"],
                "Evidence Date": "",
                "Confidence Level": confidence,
                "Recommended Outreach Angle": OUTREACH_ANGLES.get(st, ""),
            }
            leads.append(row)
            seen.add(domain)
            print(f"  ✓ {company_name} [{st}] [{confidence}] — {result['source_url'][:60]}")
        else:
            print(f"  — no signal found")

        time.sleep(0.5)

    print(f"\n{'='*70}")
    print(f"Direct probe leads: {len(leads)}")
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(leads)
    print(f"Saved → {output_file}")
    for r in leads:
        print(f"  • {r['Company Name']} ({r['Verified Company Domain']}) [{r['Signal Type']}] [{r['Confidence Level']}]")


if __name__ == "__main__":
    main()
