export type IdentityEvidenceKey =
  | "details"
  | "phone"
  | "photo"
  | "bank"
  | "official_id";

export type IdentityEvidenceItem = {
  key: IdentityEvidenceKey;
  label: string;
  done: boolean;
  ready: boolean;
  weight: number;
};

export type IdentityEvidenceCompletionInput = {
  detailsDone?: boolean;
  phoneDone?: boolean;
  photoRecorded?: boolean;
  photoReady?: boolean;
  photoVerified?: boolean;
  photoNeedsMore?: boolean;
  photoRejected?: boolean;
  bankRecorded?: boolean;
  officialIdRecorded?: boolean;
  countReadyAsProgress?: boolean;
};

export type IdentityEvidenceCompletion = {
  score: number;
  degrees: number;
  label: string;
  items: IdentityEvidenceItem[];
  next: string;
  primaryMissingKey: IdentityEvidenceKey | "review" | "";
  status: "not_started" | "light" | "medium" | "strong" | "high";
};

const IDENTITY_EVENT_TYPES = {
  phoneRegistered: "identity.phone_registered",
  phoneVerified: "identity.phone_verified",
  bankRecorded: "identity.bank_destination_recorded",
  licenceRecorded: "identity.drivers_licence_recorded",
  officialIdRecorded: "identity.official_id_recorded",
  photoRecorded: "identity.photo_evidence_recorded",
  photoVerified: "identity.photo_evidence_verified",
  photoVerifiedReversed: "identity.photo_evidence_verified_reversed",
  photoRejected: "identity.photo_evidence_rejected",
  photoNeedsMore: "identity.photo_evidence_needs_more",
  photoReviewCorrected: "identity.photo_evidence_review_corrected",
} as const;

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function eventTypeOf(row: any): string {
  return cleanText(row?.event_type || row?.kind || row?.type).toLowerCase();
}

function hasEvent(rows: any[], eventType: string): boolean {
  return rows.some((row) => eventTypeOf(row) === eventType);
}

function countEvents(rows: any[], eventType: string): number {
  return rows.filter((row) => eventTypeOf(row) === eventType).length;
}

export function buildIdentityEvidenceCompletion(
  input: IdentityEvidenceCompletionInput
): IdentityEvidenceCompletion {
  const countReady = Boolean(input.countReadyAsProgress);
  const phoneDone = Boolean(input.phoneDone);
  const detailsDone = Boolean(input.detailsDone || phoneDone);
  const photoRecorded = Boolean(input.photoRecorded || input.photoVerified);
  const photoReady = Boolean(input.photoReady && !photoRecorded);
  const photoNeedsRepair = Boolean(input.photoRejected || input.photoNeedsMore);

  const items: IdentityEvidenceItem[] = [
    {
      key: "details",
      label: "Name, country, phone, email",
      done: detailsDone,
      ready: false,
      weight: 15,
    },
    {
      key: "phone",
      label: "Phone evidence",
      done: phoneDone,
      ready: false,
      weight: 20,
    },
    {
      key: "photo",
      label: "Photo/selfie",
      done: photoRecorded,
      ready: photoReady,
      weight: 20,
    },
    {
      key: "bank",
      label: "Bank or wallet",
      done: Boolean(input.bankRecorded),
      ready: false,
      weight: 25,
    },
    {
      key: "official_id",
      label: "Official ID",
      done: Boolean(input.officialIdRecorded),
      ready: false,
      weight: 20,
    },
  ];

  const score = Math.min(
    100,
    items.reduce(
      (total, item) =>
        total + (item.done || (countReady && item.ready) ? item.weight : 0),
      0
    )
  );
  const degrees = Math.round(score * 3.6);
  const status: IdentityEvidenceCompletion["status"] =
    score >= 80
      ? "high"
      : score >= 55
        ? "strong"
        : score >= 35
          ? "medium"
          : score >= 15
            ? "light"
            : "not_started";
  const label =
    status === "high"
      ? "High evidence"
      : status === "strong"
        ? "Strong evidence"
        : status === "medium"
          ? "Medium evidence"
          : status === "light"
            ? "Light evidence"
            : "Not started";

  let primaryMissingKey: IdentityEvidenceCompletion["primaryMissingKey"] = "";
  let next = "Founder evidence is broad. Keep evidence fresh when records change.";

  if (photoNeedsRepair) {
    primaryMissingKey = "review";
    next = input.photoRejected
      ? "Photo/selfie evidence was rejected. Add clearer identity proof before relying on this record for serious trust decisions."
      : "Photo/selfie evidence needs a clearer follow-up. Add a better face photo or official ID evidence when available.";
  } else if (photoReady) {
    primaryMissingKey = "photo";
    next =
      "Photo is ready on this phone. Record it now so a real Trust Event can be written.";
  } else if (!photoRecorded) {
    primaryMissingKey = "photo";
    next =
      "Add a clear photo/selfie so Trust Passport and TrustSlip can keep the founder face consistent.";
  } else if (!input.bankRecorded) {
    primaryMissingKey = "bank";
    next =
      "Add bank or wallet evidence to connect this founder to real-world financial records where available.";
  } else if (!input.officialIdRecorded) {
    primaryMissingKey = "official_id";
    next =
      "Add licence, passport, NIN, or other official ID evidence to strengthen identity confidence.";
  }

  return {
    score,
    degrees,
    label,
    items,
    next,
    primaryMissingKey,
    status,
  };
}

export function buildIdentityEvidenceCompletionFromTrustEvents(
  rawEvents: any,
  me?: any | null
): IdentityEvidenceCompletion {
  const rows = Array.isArray(rawEvents?.items)
    ? rawEvents.items
    : Array.isArray(rawEvents)
      ? rawEvents
      : [];
  const photoVerified =
    Math.max(
      0,
      countEvents(rows, IDENTITY_EVENT_TYPES.photoVerified) -
        countEvents(rows, IDENTITY_EVENT_TYPES.photoVerifiedReversed)
    ) > 0;
  const photoReviewCorrected = hasEvent(
    rows,
    IDENTITY_EVENT_TYPES.photoReviewCorrected
  );
  const photoRepairStillActive = !photoVerified && !photoReviewCorrected;

  return buildIdentityEvidenceCompletion({
    detailsDone: Boolean(
      cleanText(me?.display_name || me?.name || me?.email || me?.gmfn_id)
    ),
    phoneDone:
      hasEvent(rows, IDENTITY_EVENT_TYPES.phoneRegistered) ||
      hasEvent(rows, IDENTITY_EVENT_TYPES.phoneVerified),
    photoRecorded:
      hasEvent(rows, IDENTITY_EVENT_TYPES.photoRecorded) || photoVerified,
    photoVerified,
    photoNeedsMore:
      photoRepairStillActive &&
      hasEvent(rows, IDENTITY_EVENT_TYPES.photoNeedsMore),
    photoRejected:
      photoRepairStillActive &&
      hasEvent(rows, IDENTITY_EVENT_TYPES.photoRejected),
    bankRecorded: hasEvent(rows, IDENTITY_EVENT_TYPES.bankRecorded),
    officialIdRecorded:
      hasEvent(rows, IDENTITY_EVENT_TYPES.licenceRecorded) ||
      hasEvent(rows, IDENTITY_EVENT_TYPES.officialIdRecorded),
    countReadyAsProgress: false,
  });
}
