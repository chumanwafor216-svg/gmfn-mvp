import { readStorage, writeStorage } from "./entryFlow";

export type CreateEntryStep = "details" | "verify" | "bank" | "community";
export type CreateEntryPanel = "details" | "verification" | "community" | null;

export type CreateEntryDraft = {
  communityName?: string;
  description?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  country?: string;
  dateOfBirth?: string;
  birthCountry?: string;
  birthPlace?: string;
  countryOfOrigin?: string;
  residentialArea?: string;
  createCode?: string;
  step?: CreateEntryStep;
  openPanel?: CreateEntryPanel;
  guideDone?: boolean;
  verificationId?: number;
  phoneVerificationProof?: any;
  bankRecordProof?: any;
  bankVerificationResult?: any;
  licenceVerificationResult?: any;
  identityPhotoResult?: any;
  updatedAt?: number;
};

export type JoinEntryDraft = {
  existingGsnId?: string;
  firstName?: string;
  surname?: string;
  phone?: string;
  country?: string;
  workCategory?: string;
  workDetail?: string;
  note?: string;
  inviteAcknowledged?: boolean;
  formOpen?: boolean;
  updatedAt?: number;
};

const CREATE_ENTRY_DRAFT_VERSION = 1;
const ENTRY_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function createEntryDraftKey(createCode?: string | null): string {
  const code = safeStr(createCode) || "public-create";
  return `gmfn_create_entry_draft:v${CREATE_ENTRY_DRAFT_VERSION}:${code}`;
}

function joinEntryDraftKey(inviteCode?: string | null, communityCode?: string | null): string {
  const invite = safeStr(inviteCode) || "unknown-invite";
  const community = safeStr(communityCode) || "unknown-community";
  return `gmfn_join_draft:${community}:${invite}`;
}

function isFreshDraft(updatedAt: number, key: string): boolean {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    writeStorage(key, null);
    return false;
  }

  if (Date.now() - updatedAt > ENTRY_DRAFT_TTL_MS) {
    writeStorage(key, null);
    return false;
  }

  return true;
}

function isValidStep(value: unknown): value is CreateEntryStep {
  return (
    value === "details" ||
    value === "verify" ||
    value === "bank" ||
    value === "community"
  );
}

function isValidPanel(value: unknown): value is CreateEntryPanel {
  return value === null || value === "details" || value === "verification" || value === "community";
}

function compactTrustEvent(value: any) {
  if (!value || typeof value !== "object") return null;
  return {
    event_type: safeStr(value.event_type),
    status: safeStr(value.status),
    message: safeStr(value.message),
  };
}

function compactPhoneProof(value: any) {
  if (!value || typeof value !== "object") return null;
  return {
    display_name: safeStr(value.display_name),
    phone_e164: safeStr(value.phone_e164),
    verified_at: safeStr(value.verified_at),
    registered_only: Boolean(value.registered_only),
    confirmation_message: safeStr(value.confirmation_message),
    trust_event_response: compactTrustEvent(value.trust_event_response),
  };
}

function compactBankRecordProof(value: any) {
  if (!value || typeof value !== "object") return null;
  return {
    confirmation_message: safeStr(value.confirmation_message),
    verification_status: safeStr(value.verification_status),
    verification_note: safeStr(value.verification_note),
    trust_event_response: compactTrustEvent(value.trust_event_response),
  };
}

function compactVerificationResult(value: any) {
  if (!value || typeof value !== "object") return null;
  const verificationCheckId = Number(value.verification_check_id || 0);
  const confidenceScore = Number(value.confidence_score);
  return {
    verification_check_id:
      Number.isFinite(verificationCheckId) && verificationCheckId > 0
        ? verificationCheckId
        : 0,
    verification_type: safeStr(value.verification_type),
    status: safeStr(value.status),
    region_code: safeStr(value.region_code),
    confidence_score: Number.isFinite(confidenceScore) ? confidenceScore : null,
    explanation: safeStr(value.explanation),
    verified_at: safeStr(value.verified_at),
    evidence_recorded: Boolean(value.evidence_url || value.evidence_recorded),
  };
}

export function readCreateEntryDraft(createCode?: string | null): CreateEntryDraft | null {
  const key = createEntryDraftKey(createCode);
  const raw = readStorage(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    const updatedAt = Number(parsed?.updatedAt || 0);
    const hasLegacyUsefulDraft = Boolean(
      safeStr(parsed?.communityName) ||
        safeStr(parsed?.description) ||
        safeStr(parsed?.displayName) ||
      safeStr(parsed?.phone) ||
      safeStr(parsed?.email) ||
      safeStr(parsed?.country) ||
      safeStr(parsed?.dateOfBirth) ||
      safeStr(parsed?.birthCountry) ||
      safeStr(parsed?.birthPlace) ||
      safeStr(parsed?.countryOfOrigin) ||
      safeStr(parsed?.residentialArea) ||
      Number(parsed?.verificationId || 0) > 0 ||
        parsed?.phoneVerificationProof ||
        parsed?.bankRecordProof ||
        parsed?.bankVerificationResult ||
        parsed?.licenceVerificationResult ||
        parsed?.identityPhotoResult
    );
    if (!hasLegacyUsefulDraft && (!Number.isFinite(updatedAt) || updatedAt <= 0)) return null;
    if (!isFreshDraft(updatedAt, key)) return null;

    const step = isValidStep(parsed?.step) ? parsed.step : undefined;
    const openPanel = isValidPanel(parsed?.openPanel) ? parsed.openPanel : undefined;
    const verificationId = Number(parsed?.verificationId || 0);

    return {
      communityName: safeStr(parsed?.communityName),
      description: safeStr(parsed?.description),
      displayName: safeStr(parsed?.displayName),
      phone: safeStr(parsed?.phone),
      email: safeStr(parsed?.email),
      country: safeStr(parsed?.country),
      dateOfBirth: safeStr(parsed?.dateOfBirth),
      birthCountry: safeStr(parsed?.birthCountry),
      birthPlace: safeStr(parsed?.birthPlace),
      countryOfOrigin: safeStr(parsed?.countryOfOrigin),
      residentialArea: safeStr(parsed?.residentialArea),
      createCode: safeStr(parsed?.createCode),
      step,
      openPanel,
      guideDone: Boolean(parsed?.guideDone),
      verificationId: Number.isFinite(verificationId) && verificationId > 0 ? verificationId : 0,
      phoneVerificationProof: compactPhoneProof(parsed?.phoneVerificationProof),
      bankRecordProof: compactBankRecordProof(parsed?.bankRecordProof),
      bankVerificationResult: compactVerificationResult(parsed?.bankVerificationResult),
      licenceVerificationResult: compactVerificationResult(parsed?.licenceVerificationResult),
      identityPhotoResult: compactVerificationResult(parsed?.identityPhotoResult),
      updatedAt,
    };
  } catch {
    writeStorage(key, null);
    return null;
  }
}

export function saveCreateEntryDraft(
  createCode: string | null | undefined,
  draft: CreateEntryDraft
): void {
  const safeDraft: CreateEntryDraft = {
    communityName: safeStr(draft.communityName),
    description: safeStr(draft.description),
    displayName: safeStr(draft.displayName),
    phone: safeStr(draft.phone),
    email: safeStr(draft.email),
    country: safeStr(draft.country),
    dateOfBirth: safeStr(draft.dateOfBirth),
    birthCountry: safeStr(draft.birthCountry),
    birthPlace: safeStr(draft.birthPlace),
    countryOfOrigin: safeStr(draft.countryOfOrigin),
    residentialArea: safeStr(draft.residentialArea),
    createCode: safeStr(draft.createCode || createCode || ""),
    step: isValidStep(draft.step) ? draft.step : "details",
    openPanel: isValidPanel(draft.openPanel) ? draft.openPanel : null,
    guideDone: Boolean(draft.guideDone),
    verificationId: Number(draft.verificationId || 0),
    phoneVerificationProof: compactPhoneProof(draft.phoneVerificationProof),
    bankRecordProof: compactBankRecordProof(draft.bankRecordProof),
    bankVerificationResult: compactVerificationResult(draft.bankVerificationResult),
    licenceVerificationResult: compactVerificationResult(draft.licenceVerificationResult),
    identityPhotoResult: compactVerificationResult(draft.identityPhotoResult),
    updatedAt: Date.now(),
  };

  const hasUsefulDraft = Boolean(
    safeDraft.communityName ||
      safeDraft.description ||
      safeDraft.displayName ||
      safeDraft.phone ||
      safeDraft.email ||
      safeDraft.country ||
      safeDraft.dateOfBirth ||
      safeDraft.birthCountry ||
      safeDraft.birthPlace ||
      safeDraft.countryOfOrigin ||
      safeDraft.residentialArea ||
      safeDraft.verificationId ||
      safeDraft.phoneVerificationProof ||
      safeDraft.bankRecordProof ||
      safeDraft.bankVerificationResult ||
      safeDraft.licenceVerificationResult ||
      safeDraft.identityPhotoResult
  );

  writeStorage(
    createEntryDraftKey(createCode),
    hasUsefulDraft ? JSON.stringify(safeDraft) : null
  );
}

export function clearCreateEntryDraft(createCode?: string | null): void {
  writeStorage(createEntryDraftKey(createCode), null);
}

export function readJoinEntryDraft(
  inviteCode?: string | null,
  communityCode?: string | null
): JoinEntryDraft | null {
  const key = joinEntryDraftKey(inviteCode, communityCode);
  const raw = readStorage(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, any>;
    let updatedAt = Number(parsed?.updatedAt || 0);
    const hasLegacyUsefulDraft = Boolean(
      safeStr(parsed?.firstName || parsed?.first_name) ||
        safeStr(parsed?.existingGsnId || parsed?.existing_gsn_id) ||
        safeStr(parsed?.surname) ||
        safeStr(parsed?.phone) ||
        safeStr(parsed?.country) ||
        safeStr(parsed?.workCategory || parsed?.work_category) ||
        safeStr(parsed?.workDetail || parsed?.work_detail) ||
        safeStr(parsed?.note)
    );
    if ((!Number.isFinite(updatedAt) || updatedAt <= 0) && hasLegacyUsefulDraft) {
      updatedAt = Date.now();
    }
    if (!isFreshDraft(updatedAt, key)) return null;

    return {
      existingGsnId: safeStr(parsed?.existingGsnId || parsed?.existing_gsn_id),
      firstName: safeStr(parsed?.firstName || parsed?.first_name),
      surname: safeStr(parsed?.surname),
      phone: safeStr(parsed?.phone),
      country: safeStr(parsed?.country),
      workCategory: safeStr(parsed?.workCategory || parsed?.work_category),
      workDetail: safeStr(parsed?.workDetail || parsed?.work_detail),
      note: safeStr(parsed?.note),
      inviteAcknowledged:
        typeof parsed?.inviteAcknowledged === "boolean"
          ? parsed.inviteAcknowledged
          : undefined,
      formOpen: typeof parsed?.formOpen === "boolean" ? parsed.formOpen : undefined,
      updatedAt,
    };
  } catch {
    writeStorage(key, null);
    return null;
  }
}

export function saveJoinEntryDraft(
  inviteCode: string | null | undefined,
  communityCode: string | null | undefined,
  draft: JoinEntryDraft
): void {
  const safeDraft: JoinEntryDraft = {
    existingGsnId: safeStr(draft.existingGsnId),
    firstName: safeStr(draft.firstName),
    surname: safeStr(draft.surname),
    phone: safeStr(draft.phone),
    country: safeStr(draft.country),
    workCategory: safeStr(draft.workCategory),
    workDetail: safeStr(draft.workDetail),
    note: safeStr(draft.note),
    inviteAcknowledged: Boolean(draft.inviteAcknowledged),
    formOpen: Boolean(draft.formOpen),
    updatedAt: Date.now(),
  };

  const hasUsefulDraft = Boolean(
    safeDraft.existingGsnId ||
      safeDraft.firstName ||
      safeDraft.surname ||
      safeDraft.phone ||
      safeDraft.country ||
      safeDraft.workCategory ||
      safeDraft.workDetail ||
      safeDraft.inviteAcknowledged ||
      safeDraft.note
  );

  writeStorage(
    joinEntryDraftKey(inviteCode, communityCode),
    hasUsefulDraft ? JSON.stringify(safeDraft) : null
  );
}

export function clearJoinEntryDraft(
  inviteCode?: string | null,
  communityCode?: string | null
): void {
  writeStorage(joinEntryDraftKey(inviteCode, communityCode), null);
}
