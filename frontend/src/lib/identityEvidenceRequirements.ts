export type RegionalEvidenceRequirement = {
  country: string;
  code: string;
  officialIdLabel: string;
  officialIdPlaceholder: string;
  officialIdHelp: string;
  bankLabel: string;
  currency: string;
};

const DEFAULT_REQUIREMENT: RegionalEvidenceRequirement = {
  country: "Other",
  code: "OTHER",
  officialIdLabel: "National ID / passport",
  officialIdPlaceholder: "Enter ID or passport reference",
  officialIdHelp:
    "Record the strongest official ID used in this country. Provider checks can come later.",
  bankLabel: "Bank or wallet",
  currency: "USD",
};

export const REGIONAL_EVIDENCE_REQUIREMENTS: RegionalEvidenceRequirement[] = [
  {
    country: "Nigeria",
    code: "NG",
    officialIdLabel: "National Identification Number (NIN)",
    officialIdPlaceholder: "Enter NIN",
    officialIdHelp:
      "For Nigeria, NIN is stronger identity evidence than a driving licence for this pilot.",
    bankLabel: "Bank, wallet, or mobile money",
    currency: "NGN",
  },
  {
    country: "United Kingdom",
    code: "GB",
    officialIdLabel: "Passport or driving licence",
    officialIdPlaceholder: "Enter passport or licence reference",
    officialIdHelp:
      "For the UK, record passport or driving licence evidence without running provider checks during pilot.",
    bankLabel: "Bank or wallet",
    currency: "GBP",
  },
  {
    country: "Ghana",
    code: "GH",
    officialIdLabel: "Ghana Card / passport",
    officialIdPlaceholder: "Enter Ghana Card or passport reference",
    officialIdHelp:
      "For Ghana, Ghana Card or passport evidence is the strongest starter official ID.",
    bankLabel: "Bank or mobile money",
    currency: "GHS",
  },
  {
    country: "Kenya",
    code: "KE",
    officialIdLabel: "National ID / Huduma-style ID",
    officialIdPlaceholder: "Enter national ID reference",
    officialIdHelp:
      "For Kenya, record the national ID reference used locally. Provider checks can come later.",
    bankLabel: "Bank or mobile money",
    currency: "KES",
  },
  {
    country: "India",
    code: "IN",
    officialIdLabel: "Aadhaar-style ID / PAN / passport",
    officialIdPlaceholder: "Enter official ID reference",
    officialIdHelp:
      "For India, record the strongest official ID reference available without claiming live verification.",
    bankLabel: "Bank or UPI",
    currency: "INR",
  },
  {
    country: "United States",
    code: "US",
    officialIdLabel: "State ID / passport",
    officialIdPlaceholder: "Enter state ID or passport reference",
    officialIdHelp:
      "For the US, record state ID or passport evidence for later review.",
    bankLabel: "Bank or wallet",
    currency: "USD",
  },
  {
    country: "Ireland",
    code: "IE",
    officialIdLabel: "Passport / public services identity",
    officialIdPlaceholder: "Enter passport or ID reference",
    officialIdHelp:
      "For Ireland, record passport or local official ID evidence for later review.",
    bankLabel: "Bank or wallet",
    currency: "EUR",
  },
  {
    country: "South Africa",
    code: "ZA",
    officialIdLabel: "South African ID / passport",
    officialIdPlaceholder: "Enter ID or passport reference",
    officialIdHelp:
      "For South Africa, record national ID or passport evidence for later review.",
    bankLabel: "Bank or wallet",
    currency: "ZAR",
  },
  {
    country: "Uganda",
    code: "UG",
    officialIdLabel: "National ID / passport",
    officialIdPlaceholder: "Enter national ID or passport reference",
    officialIdHelp:
      "For Uganda, record national ID or passport evidence for later review.",
    bankLabel: "Bank or mobile money",
    currency: "UGX",
  },
  {
    country: "Tanzania",
    code: "TZ",
    officialIdLabel: "NIDA / passport",
    officialIdPlaceholder: "Enter NIDA or passport reference",
    officialIdHelp:
      "For Tanzania, record NIDA or passport evidence for later review.",
    bankLabel: "Bank or mobile money",
    currency: "TZS",
  },
  {
    country: "Rwanda",
    code: "RW",
    officialIdLabel: "National ID / passport",
    officialIdPlaceholder: "Enter national ID or passport reference",
    officialIdHelp:
      "For Rwanda, record national ID or passport evidence for later review.",
    bankLabel: "Bank or mobile money",
    currency: "RWF",
  },
];

function clean(value: unknown): string {
  return String(value || "").trim();
}

export function countryOptions(): string[] {
  return REGIONAL_EVIDENCE_REQUIREMENTS.map((item) => item.country).concat("Other");
}

export function evidenceRequirementForCountry(
  country: string | null | undefined
): RegionalEvidenceRequirement {
  const raw = clean(country).toLowerCase();
  return (
    REGIONAL_EVIDENCE_REQUIREMENTS.find(
      (item) => item.country.toLowerCase() === raw || item.code.toLowerCase() === raw
    ) || DEFAULT_REQUIREMENT
  );
}

export function countryFromPhone(phone: string | null | undefined): string {
  const value = clean(phone);
  if (value.startsWith("+234")) return "Nigeria";
  if (value.startsWith("+233")) return "Ghana";
  if (value.startsWith("+254")) return "Kenya";
  if (value.startsWith("+256")) return "Uganda";
  if (value.startsWith("+255")) return "Tanzania";
  if (value.startsWith("+27")) return "South Africa";
  if (value.startsWith("+44")) return "United Kingdom";
  if (value.startsWith("+353")) return "Ireland";
  if (value.startsWith("+91")) return "India";
  if (value.startsWith("+1")) return "United States";
  return "";
}
