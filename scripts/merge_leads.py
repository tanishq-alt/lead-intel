"""
Merge existing clean leads with newly discovered leads, deduplicate by domain.
Output: nano_onboarding_FINAL.csv
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

NOISE_DOMAINS = {
    "mn.gov", "yourohionews.com", "dottiemillerpsychotherapy.com",
    "thunderbasinortho.com", "udemy.com", "paper.ula.edu.pe", "eddy.com",
    "youtube.com", "joinhomebase.com", "vectortechnicalinc.com",
}

NOISE_NAMES = {"free printable", "home based business", "hire packet", "mn"}

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
            domain = row.get("Verified Company Domain", "").strip().lower()
            name = row.get("Company Name", "").strip().lower()
            if not domain or domain in seen_domains:
                continue
            if domain in NOISE_DOMAINS:
                continue
            if any(n in name for n in NOISE_NAMES):
                continue
            seen_domains.add(domain)
            # Fill missing fields
            for f_ in CSV_FIELDS:
                if f_ not in row:
                    row[f_] = ""
            merged.append({k: row.get(k, "") for k in CSV_FIELDS})

# Sort: High confidence first, then by signal type
confidence_order = {"High": 0, "Medium": 1, "Low": 2}
merged.sort(key=lambda r: (confidence_order.get(r["Confidence Level"], 9), r["Signal Type"]))

out = Path("/Users/tanishqmac/nano_onboarding_FINAL.csv")
with open(out, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
    writer.writeheader()
    writer.writerows(merged)

print(f"Merged {len(merged)} unique companies → {out}")
for r in merged:
    print(f"  {r['Company Name']} | {r['Verified Company Domain']} | {r['Signal Type']} | {r['Confidence Level']}")
