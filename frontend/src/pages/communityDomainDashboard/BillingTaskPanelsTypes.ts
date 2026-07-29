import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import type { PaymentProofExpectedPayment } from "../../components/PaymentProofSubmissionPanel";

export type BillingTaskKey = "payment_code" | "account" | "steps" | "readiness";
export type BillingAccountTaskKey = "summary" | "setup";
export type BillingPaymentTaskKey =
  | "reference"
  | "generate"
  | "credit_link"
  | "pay_account"
  | "proof";
export type BillingPaymentGroupKey = "code" | "settlement" | "proof";
export type DomainFeaturePolicyMode =
  | "off"
  | "admin_only"
  | "delegated_admins"
  | "members_submit_admin_approves"
  | "members_direct"
  | "paid_or_quota";

export type BillingTaskOption<K extends string = string> = {
  key: K;
  label: string;
  note: string;
};

export type BillingPaymentGroupOption = BillingTaskOption<BillingPaymentGroupKey> & {
  defaultTask: BillingPaymentTaskKey;
  taskKeys: BillingPaymentTaskKey[];
};

export type SettlementCountryOption = {
  value: string;
  label: string;
  currency: string;
  hint: string;
};

export type CommunityDomainPayInDraft = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  routingNumber: string;
  iban: string;
  swiftBic: string;
  country: string;
  currency: string;
  note: string;
};

export type CommunityLinkClanRow = {
  id: number;
  name: string;
  communityCode?: string;
};

export type BillingSequenceStep = {
  step: string;
  title: string;
  detail: string;
  status: string;
  active: boolean;
};

type UnknownRecord = Record<string, unknown>;

export type BillingQuoteSurface = UnknownRecord & {
  package_name?: unknown;
  renewal_policy?: { status?: unknown } | null;
  pricing_status?: unknown;
  quote_status?: unknown;
};

export type DomainPaymentIntentSurface = UnknownRecord & {
  payer_gmfn_id?: unknown;
  community_name?: unknown;
  domain_display_name?: unknown;
  expected_payment_id?: unknown;
};

export type DomainPaymentSettlementSurface = UnknownRecord & {
  country?: unknown;
  country_label?: unknown;
  support_note?: unknown;
};

export type DomainPaymentSurface = PaymentProofExpectedPayment &
  UnknownRecord & {
  id?: unknown;
  amount?: unknown;
  currency?: unknown;
  reference_display?: unknown;
  reference_normalized?: unknown;
  status?: unknown;
  meta?: UnknownRecord | null;
  meta_json?: UnknownRecord | null;
  payment_intent?: DomainPaymentIntentSurface | null;
  settlement?: DomainPaymentSettlementSurface | null;
};

export type CommunityDomainDashboardSurface = UnknownRecord & {
  community_domain?: (UnknownRecord & { display_name?: unknown }) | null;
};

export type CommunityDomainSurface = UnknownRecord & {
  display_name?: unknown;
};

export type CommunityDomainStatusSurface = UnknownRecord & {
  billing_status?: unknown;
};

export type CommunityDomainLaneSurface = UnknownRecord & {
  status?: unknown;
};

export type BillingTaskPanelsData = {
  activeBillingAccountTask: BillingAccountTaskKey;
  activeBillingAccountTaskOption: BillingTaskOption<BillingAccountTaskKey>;
  activeBillingPaymentGroup: BillingPaymentGroupKey;
  activeBillingPaymentGroupOption: BillingPaymentGroupOption;
  activeBillingPaymentGroupTasks: BillingTaskOption<BillingPaymentTaskKey>[];
  activeBillingPaymentTask: BillingPaymentTaskKey;
  activeBillingPaymentTaskOption: BillingTaskOption<BillingPaymentTaskKey>;
  activeBillingTask: BillingTaskKey;
  activeBillingTaskOption: BillingTaskOption<BillingTaskKey>;
  activeLane: string;
  billingAccountTaskChooserOpen: boolean;
  billingInputStyle: () => CSSProperties;
  billingIsActive: boolean;
  billingPaymentGroupChooserOpen: boolean;
  billingPaymentStepChooserOpen: boolean;
  billingSequenceSteps: BillingSequenceStep[];
  billingSettlementCountry: string;
  billingStepCard: (
    step: string,
    title: string,
    detail: string,
    status: string,
    active?: boolean
  ) => ReactNode;
  billingTaskChooserOpen: boolean;
  BILLING_ACCOUNT_TASK_OPTIONS: BillingTaskOption<BillingAccountTaskKey>[];
  BILLING_PAYMENT_GROUP_OPTIONS: BillingPaymentGroupOption[];
  BILLING_TASK_OPTIONS: BillingTaskOption<BillingTaskKey>[];
  busyDomainPayment: boolean;
  busyQuote: boolean;
  canEditPayInAccount: boolean;
  cleanText: (value: unknown, fallback?: string) => string;
  communityLinkClanRows: CommunityLinkClanRow[];
  communityPayInCountryLabel: string;
  communityPayInDraft: CommunityDomainPayInDraft;
  communityPayInIsReady: boolean;
  communityPayInLoading: boolean;
  communityPayInRows: Array<[string, string]>;
  communityPayInSaving: boolean;
  compactStatus: (status: unknown) => string;
  createDedicatedDomainMarketplace: () => void | Promise<void>;
  creatingDomainMarketplace: boolean;
  dashboard: CommunityDomainDashboardSurface | null;
  domain: CommunityDomainSurface | null;
  domainPayment: DomainPaymentSurface | null;
  domainPaymentBankMatchLabel: string;
  domainPaymentIntent: DomainPaymentIntentSurface;
  domainPaymentProofLabel: string;
  domainPaymentReference: string;
  domainPaymentSettlement: DomainPaymentSettlementSurface | null;
  domainPaymentSettlementLabel: string;
  domainPaymentSettlementReady: boolean;
  domainPaymentSettlementRows: Array<[string, string]>;
  domainPaymentStatusLabel: string;
  emptyCommunityDomainPayInDraft: (
    country?: string,
    currency?: string
  ) => CommunityDomainPayInDraft;
  featurePolicyModeLabel: (mode: DomainFeaturePolicyMode) => string;
  generateDomainPaymentInstruction: () => void | Promise<void>;
  helperText: () => CSSProperties;
  iconFrame: (size?: number) => CSSProperties;
  iconHeaderStyle: () => CSSProperties;
  isAdmin: boolean;
  linkedDomainClanId: number;
  linkedDomainClanRow: CommunityLinkClanRow | null;
  normalizeSettlementCountryCode: (value: unknown) => string;
  packageReviewActionLabel: string;
  paymentClanIdDraft: string;
  paymentClanRow: CommunityLinkClanRow | null;
  paymentsContributionsOff: boolean;
  paymentsContributionsPolicyMode: DomainFeaturePolicyMode;
  quote: BillingQuoteSurface | null;
  quoteAmount: string;
  quoteCurrency: string;
  quoteNote: string;
  refreshQuote: () => void | Promise<void>;
  saveCommunityDomainPayInAccount: () => void | Promise<void>;
  sectionLabel: () => CSSProperties;
  selectedDomainClanId: number;
  selectedLane: CommunityDomainLaneSurface | null;
  setActiveBillingAccountTask: Dispatch<SetStateAction<BillingAccountTaskKey>>;
  setActiveBillingPaymentTask: Dispatch<SetStateAction<BillingPaymentTaskKey>>;
  setActiveBillingTask: Dispatch<SetStateAction<BillingTaskKey>>;
  setBillingAccountTaskChooserOpen: Dispatch<SetStateAction<boolean>>;
  setBillingPaymentGroupChooserOpen: Dispatch<SetStateAction<boolean>>;
  setBillingPaymentStepChooserOpen: Dispatch<SetStateAction<boolean>>;
  setBillingSettlementCountry: Dispatch<SetStateAction<string>>;
  setBillingTaskChooserOpen: Dispatch<SetStateAction<boolean>>;
  setCommunityPayInDraft: Dispatch<SetStateAction<CommunityDomainPayInDraft>>;
  setDomainPayment: Dispatch<SetStateAction<DomainPaymentSurface | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setPaymentClanIdDraft: Dispatch<SetStateAction<string>>;
  setQuoteAmount: Dispatch<SetStateAction<string>>;
  setQuoteCurrency: Dispatch<SetStateAction<string>>;
  setQuoteNote: Dispatch<SetStateAction<string>>;
  SETTLEMENT_COUNTRY_OPTIONS: SettlementCountryOption[];
  settlementCurrencyForCountry: (value: unknown) => string;
  softCard: (bg?: string) => CSSProperties;
  status: CommunityDomainStatusSurface;
  statusBadge: (status: unknown) => CSSProperties;
  subscriptionStatusMode: boolean;
  updateCommunityPayInDraft: (
    field: keyof CommunityDomainPayInDraft,
    value: string
  ) => void;
};