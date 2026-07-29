import type {
  CSSProperties,
  Dispatch,
  RefObject,
  SetStateAction,
  SyntheticEvent,
} from "react";

export type MarketplaceActionKind = "primary" | "secondary" | "soft";

export type MarketplaceDepartmentTone =
  | "trade"
  | "members"
  | "demand"
  | "support"
  | "rosca"
  | "neutral";

export type MarketplaceSectionKey =
  | "board"
  | "money"
  | "rosca"
  | "tools"
  | "members"
  | "trade"
  | "demand"
  | "support";

export type SupportDeskMode = "choices" | "loan";

export type MarketplaceSupportCtaIntent =
  | "loanReadiness"
  | "loanSuggestions"
  | "loanWorkbench"
  | "finance"
  | "loans";

export type MarketplaceSurfaceTouchProps = {
  "data-gmfn-surface-root": string;
  "data-gmfn-debug-id": string;
};

export type MarketplaceFieldTouchProps = {
  "data-gmfn-field-root": string;
  "data-gmfn-debug-id": string;
  onPointerDownCapture: () => void;
  onFocusCapture: () => void;
};

export type SuggestedSupporter = {
  key: string;
  userId?: number;
  gmfnId?: string;
  name: string;
  reason?: string | null;
  recommendedPledge?: string | null;
};

export type LoanDraftSummary = {
  id?: number;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  service_fee?: string | number | null;
  net_disbursed_amount?: string | number | null;
  guarantor_pool?: string | number | null;
  platform_revenue?: string | number | null;
  remaining_amount?: string | number | null;
  guarantors_required?: number | null;
  approved_guarantors?: number | null;
  guarantors_total?: number | null;
  due_at?: string | null;
  decision_at?: string | null;
};

export type LoanSupportItem = {
  id?: number;
  clan_id?: number;
  title?: string | null;
  purpose?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  borrower_name?: string | null;
  guarantor_name?: string | null;
  created_at?: string | null;
  role?: string | null;
};

export type MarketplaceSupportSectionData = {
  isCompact: boolean;
  supportSectionRef: RefObject<HTMLElement | null>;
  pageCard: (bg?: string) => CSSProperties;
  activeLoanCount: number;
  badge: (primary?: boolean) => CSSProperties;
  toggleSectionFromButton: (
    event: SyntheticEvent<HTMLElement> | undefined,
    key: MarketplaceSectionKey
  ) => void;
  marketplaceActionStyle: (
    kind?: MarketplaceActionKind,
    disabled?: boolean
  ) => CSSProperties;
  marketplaceSurfaceTouchProps: (debugId: string) => MarketplaceSurfaceTouchProps;
  marketplaceDepartmentShellStyle: (
    tone: MarketplaceDepartmentTone,
    isCompact: boolean
  ) => CSSProperties;
  activeCommunityName: string;
  activeCommunityId: number;
  currentGmfnId: string;
  hasMoneyOutSupportTask: boolean;
  moneyOutSupportAmountText: string;
  poolCurrency: string;
  moneyOutSupportGapText: string;
  runMarketplaceAction: (
    event: SyntheticEvent<HTMLElement> | undefined,
    action: () => void
  ) => void;
  setSupportDeskMode: Dispatch<SetStateAction<SupportDeskMode>>;
  scheduleMarketplaceSectionScroll: (
    sectionId: string,
    opts?: { force?: boolean }
  ) => void;
  supportLoanDeskOpen: boolean;
  openMarketplaceSection: (
    event: SyntheticEvent<HTMLElement> | undefined,
    key: MarketplaceSectionKey,
    sectionId: string
  ) => void;
  sectionLabel: () => CSSProperties;
  helperText: () => CSSProperties;
  innerCard: (bg?: string) => CSSProperties;
  loanDraftId: number;
  requiredGuarantorCount: number;
  suggestedSupporters: SuggestedSupporter[];
  loanAmount: string;
  setLoanAmount: Dispatch<SetStateAction<string>>;
  supportProcessBusy: boolean;
  inputStyle: () => CSSProperties;
  loanDurationDays: string;
  setLoanDurationDays: Dispatch<SetStateAction<string>>;
  loanRepaymentCadence: string;
  setLoanRepaymentCadence: Dispatch<SetStateAction<string>>;
  loanPurpose: string;
  setLoanPurpose: Dispatch<SetStateAction<string>>;
  textAreaStyle: () => CSSProperties;
  agreementAmount: number;
  agreementServiceFee: string;
  agreementNetAmount: string;
  agreementDueAt: string;
  agreementRepaymentCadence: string;
  softCard: (bg?: string) => CSSProperties;
  marketplaceInlineActionsStyle: (isCompact: boolean) => CSSProperties;
  startingLoanDraft: boolean;
  handleStartLoanDraft: () => Promise<void>;
  marketplaceInlineActionStyle: (
    kind: MarketplaceActionKind,
    disabled: boolean,
    isCompact: boolean
  ) => CSSProperties;
  loadingSuggestions: boolean;
  handleRefreshSuggestions: () => Promise<void>;
  cancellingLoanDraft: boolean;
  handleCancelLoanDraft: () => Promise<void>;
  openMarketplaceCta: (
    event: SyntheticEvent<HTMLElement> | undefined,
    intent: MarketplaceSupportCtaIntent
  ) => void;
  loanDraftSummary: LoanDraftSummary | null;
  safeStr: (value: unknown) => string;
  sentGuarantorCount: number;
  approvedGuarantorCount: number;
  supportProcessMessage: string;
  selectedSupporterKeys: Set<string>;
  toggleSuggestedSupporter: (item: SuggestedSupporter) => void;
  visibleSelectedSupporters: SuggestedSupporter[];
  guarantorRequestsBlocked: boolean;
  showGuarantorRequestBlockedNotice: () => void;
  handleSendGuarantorRequests: () => Promise<void>;
  sendingGuarantorRequests: boolean;
  loanStatusLower: string;
  loans: LoanSupportItem[];
  firstTruthy: (...values: unknown[]) => string;
  getLoanAmountText: (item: LoanSupportItem) => string;
  safeDateTime: (value: unknown) => string;
  marketplaceOsIconStyle: (bg: string, isCompact?: boolean) => CSSProperties;
  marketplaceFieldTouchProps: (debugId: string) => MarketplaceFieldTouchProps;
};