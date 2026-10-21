"""
Finalize nano onboarding leads: merge, clean, deduplicate, and produce the master CSV.

Filters out:
- CDN/S3/Wix/Squarespace/Webflow generic hosting domains
- Patient paperwork signals (not employee onboarding)
- Competitor/vendor sites
- Content/blog sites
- Non-US companies
"""
import csv
from pathlib import Path

CSV_FIELDS = [
    "Company Name", "Verified Company Domain", "Official Website", "Country",
    "State or Province", "Industry", "Estimated Employee Count",
    "Exact Manual-Onboarding Signal", "Exact Evidence Quote",
    "Reason This Indicates Manual Onboarding", "Signal Type",
    "Evidence Source Title", "Verified Evidence Link", "Evidence Date",
    "Confidence Level", "Recommended Outreach Angle",
]

# Domains to hard-exclude (CDNs, competitors, content sites, patient-only paperwork)
EXCLUDE_DOMAINS = {
    # CDN / generic hosting
    "cdn.websites.hibu.com", "uploads-ssl.webflow.com", "static1.squarespace.com",
    "core-docs.s3.amazonaws.com", "6398505.fs1.hubspotusercontent-na1.net",
    "asupowc.wixsite.com", "paper.ula.edu.pe", "mn.gov",
    # Competitors / vendors
    "workbright.com", "xemplo.com", "signnow.com", "sourcetable.com",
    "getdianahr.com", "tryharmony.ai", "eddy.com", "joinhomebase.com",
    "vectortechnicalinc.com", "yourohionews.com", "udemy.com", "youtube.com",
    "employersresource.com",  # PEO (vendor, not prospect)
    "hron-call.com",          # HR consulting firm
    "keyhro.com",             # HR outsourcing (vendor)
    "servanthr.com",          # HR outsourcing (vendor)
    "documentation.infinite.com",  # Software docs
    # Content / blog sites
    "barandrestaurant.com", "numerico.com", "twistedsifter.com",
    "carecade.org",  # blog post about digital onboarding
    "creai.mx",      # non-US
    # Patient-only paperwork (not employee onboarding ICP)
    "seafamilyhealth.org", "communityfirsthc.org", "eastpointfootandankle.com",
    "nebraskacitypt.com", "tannanplasticsurgery.com", "thunderbasinortho.com",
    "msproseburg.net",  # psychiatric patient forms
    "dottiemillerpsychotherapy.com",  # patient forms
    # Duplicate roots
    "welcometowellstar.com",  # same org as wellstar.org
    "my.clevelandclinic.org",  # same org as mercy.com
}

# Company name corrections (domain → canonical name)
NAME_CORRECTIONS = {
    "montefioreeinstein.org": "Montefiore Einstein Medical Center",
    "hratexas.org": "Helping Restore Ability (HRA)",
    "employerflexible.com": "Employer Flexible",
    "cfocolorado.biz": "CFO Colorado",
    "gavilan.edu": "Gavilan College",
    "rcc.edu": "Riverside City College",
    "dod.hawaii.gov": "DOD Hawaii National Guard HR",
    "oregonmetro.gov": "Metro Regional Government (Oregon)",
    "oregon.gov": "State of Oregon HR",
    "fluidmgmt.com": "Fluid Management",
    "businesscentral.unl.edu": "University of Nebraska Business Central",
    "pallcarenj.org": "Community Palliative Care Learning Collaborative (NJ)",
    "anthropology.arizona.edu": "University of Arizona — School of Anthropology",
    "in.nau.edu": "Northern Arizona University",
    "ww1.oswego.edu": "SUNY Oswego",
    "law.seattleu.edu": "Seattle University School of Law",
    "mmyerscpa.com": "Michael J. Myers, CPA PC",
    "wellstar.org": "WellStar Health System",
    "mercy.com": "Mercy Medical Center (Cleveland Clinic)",
    "inova.org": "Inova Health System",
    "lssmn.org": "Lutheran Social Service of Minnesota",
}

# Domain corrections (subdomain → canonical company domain)
DOMAIN_CORRECTIONS = {
    "ww1.oswego.edu": "oswego.edu",
    "in.nau.edu": "nau.edu",
    "law.seattleu.edu": "seattleu.edu",
    "anthropology.arizona.edu": "arizona.edu",
    "businesscentral.unl.edu": "unl.edu",
    "dod.hawaii.gov": "hawaii.gov",
}

# Website corrections
WEBSITE_CORRECTIONS = {
    "oswego.edu": "https://www.oswego.edu",
    "nau.edu": "https://www.nau.edu",
    "seattleu.edu": "https://www.seattleu.edu",
    "arizona.edu": "https://www.arizona.edu",
    "unl.edu": "https://www.unl.edu",
    "hawaii.gov": "https://dod.hawaii.gov",
}

# Industry fixes (domain → correct industry)
INDUSTRY_FIXES = {
    "montefioreeinstein.org": "Healthcare",
    "hratexas.org": "Healthcare / Home Care",
    "employerflexible.com": "Staffing / PEO",
    "cfocolorado.biz": "Construction / Field Services",
    "gavilan.edu": "Education",
    "rcc.edu": "Education",
    "dod.hawaii.gov": "Government / Military",
    "oregonmetro.gov": "Government",
    "oregon.gov": "Government",
    "fluidmgmt.com": "Manufacturing",
    "businesscentral.unl.edu": "Education",
    "pallcarenj.org": "Nonprofit / Healthcare",
    "anthropology.arizona.edu": "Education",
    "in.nau.edu": "Education",
    "ww1.oswego.edu": "Education",
    "law.seattleu.edu": "Education",
    "mmyerscpa.com": "Professional Services",
    "wellstar.org": "Healthcare",
    "mercy.com": "Healthcare",
    "inova.org": "Healthcare",
    "lssmn.org": "Nonprofit / Social Services",
    "wou.edu": "Education",
}

# State fixes
STATE_FIXES = {
    "montefioreeinstein.org": "NY",
    "hratexas.org": "TX",
    "employerflexible.com": "TX",
    "cfocolorado.biz": "CO",
    "gavilan.edu": "CA",
    "rcc.edu": "CA",
    "dod.hawaii.gov": "HI",
    "oregonmetro.gov": "OR",
    "oregon.gov": "OR",
    "fluidmgmt.com": "",
    "businesscentral.unl.edu": "NE",
    "pallcarenj.org": "NJ",
    "anthropology.arizona.edu": "AZ",
    "in.nau.edu": "AZ",
    "ww1.oswego.edu": "NY",
    "law.seattleu.edu": "WA",
    "mmyerscpa.com": "PA",
    "wellstar.org": "GA",
    "mercy.com": "OH",
    "inova.org": "VA",
    "lssmn.org": "MN",
    "wou.edu": "OR",
}

# Headcount estimates
HEADCOUNT = {
    "wellstar.org": "20,000–25,000",
    "mercy.com": "2,000–5,000",
    "inova.org": "18,000–20,000",
    "montefioreeinstein.org": "10,000–15,000",
    "lssmn.org": "2,000–4,000",
    "wou.edu": "500–1,000",
    "hratexas.org": "100–500",
    "employerflexible.com": "500–1,000",
    "gavilan.edu": "500–1,000",
    "rcc.edu": "1,000–3,000",
    "pallcarenj.org": "50–200",
    "oregonmetro.gov": "1,000–2,000",
    "oregon.gov": "10,000+",
    "dod.hawaii.gov": "1,000–5,000",
}

files = [
    Path("/Users/tanishqmac/lead-intel/manual_onboarding_leads_clean.csv"),
    Path("/Users/tanishqmac/lead-intel/scripts/nano_onboarding_leads_expanded.csv"),
]

seen_domains: set[str] = set()
merged: list[dict] = []

for f in files:
    if not f.exists():
        print(f"  Skipping (not found): {f}")
        continue
    with open(f, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            raw_domain = row.get("Verified Company Domain", "").strip().lower()
            if not raw_domain:
                continue
            if raw_domain in EXCLUDE_DOMAINS:
                continue

            # Apply domain corrections (subdomain → canonical)
            domain = DOMAIN_CORRECTIONS.get(raw_domain, raw_domain)
            if domain in seen_domains:
                continue
            seen_domains.add(domain)

            # Apply fixes
            company_name = NAME_CORRECTIONS.get(raw_domain, NAME_CORRECTIONS.get(domain, row.get("Company Name", "").strip()))
            industry = INDUSTRY_FIXES.get(raw_domain, INDUSTRY_FIXES.get(domain, row.get("Industry", "")))
            state = STATE_FIXES.get(raw_domain, STATE_FIXES.get(domain, row.get("State or Province", "")))
            website = WEBSITE_CORRECTIONS.get(domain, row.get("Official Website", f"https://www.{domain}"))
            headcount = HEADCOUNT.get(domain, HEADCOUNT.get(raw_domain, row.get("Estimated Employee Count", "")))

            clean_row = {
                "Company Name": company_name,
                "Verified Company Domain": domain,
                "Official Website": website,
                "Country": "US",
                "State or Province": state,
                "Industry": industry,
                "Estimated Employee Count": headcount,
                "Exact Manual-Onboarding Signal": row.get("Exact Manual-Onboarding Signal", ""),
                "Exact Evidence Quote": row.get("Exact Evidence Quote", "").replace("\n", " ").replace("\r", " ").strip(),
                "Reason This Indicates Manual Onboarding": row.get("Reason This Indicates Manual Onboarding", ""),
                "Signal Type": row.get("Signal Type", ""),
                "Evidence Source Title": row.get("Evidence Source Title", ""),
                "Verified Evidence Link": row.get("Verified Evidence Link", ""),
                "Evidence Date": row.get("Evidence Date", ""),
                "Confidence Level": row.get("Confidence Level", ""),
                "Recommended Outreach Angle": row.get("Recommended Outreach Angle", ""),
            }
            merged.append(clean_row)

# Sort: High confidence first, then by signal type, then industry
confidence_order = {"High": 0, "Medium": 1, "Low": 2}
signal_order = {"fax_mail": 0, "in_person_paperwork": 1, "paper_packets": 2,
                "physical_files": 3, "manual_data_entry": 4, "spreadsheet": 5, "email_forms": 6}

merged.sort(key=lambda r: (
    confidence_order.get(r["Confidence Level"], 9),
    signal_order.get(r["Signal Type"], 9),
    r.get("Industry", ""),
))

out = Path("/Users/tanishqmac/nano_onboarding_FINAL.csv")
with open(out, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
    writer.writeheader()
    writer.writerows(merged)

print(f"\nFinal CSV: {len(merged)} verified companies → {out}\n")
print(f"{'#':<3} {'Company Name':<45} {'Domain':<35} {'Signal':<22} {'Industry':<30} {'State':<5} {'Conf'}")
print("-" * 155)
for i, r in enumerate(merged, 1):
    print(f"{i:<3} {r['Company Name'][:44]:<45} {r['Verified Company Domain'][:34]:<35} "
          f"{r['Signal Type']:<22} {r['Industry'][:29]:<30} {r['State or Province']:<5} {r['Confidence Level']}")
