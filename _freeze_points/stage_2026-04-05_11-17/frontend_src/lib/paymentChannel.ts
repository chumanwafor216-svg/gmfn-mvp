// src/lib/paymentChannel.ts
export type TrustSlipPayload = {
  user_id: number;
  lifetime_trust: string;
  standing_score: string;
  recency_factor: string;
  trust_slip_limit: string;
  level_label: string;
  explanation: string;
  limits: {
    base_limit: string;
    historical_avg_repaid_loan: string | null;
    historical_cap: string;
    starter_cap_used: boolean;
  };
  disclaimer: string;
  version: string;
};

export type LoansListResponse = {
  items: Array<{
    id: number;
    borrower_user_id: number;
    clan_id: number;
    amount: string;
    currency: string;
    status: string;
    remaining_amount?: string;
    paid_total?: string;
    created_at?: string;
  }>;
  total: number;
};

export type PaymentInstructionPayload = {
  loan_id: number;
  user_id: number;
  reference: string;
  bank_details: {
    account_name: string;
    account_number: string;
    sort_code: string;
    bank_name: string;
    currency: string;
  };
  instructions: string;
  disclaimer: string;
  created_at: string;
  mode: string;
};

export type TrustTimelineItem = {
  event_type: string;
  label: string;
  delta: string; // Decimal as string
  reason?: string | null;
  note?: string | null;
  payment_reference?: string | null;

  loan_id?: number | null;
  clan_id?: number | null;
  guarantor_id?: number | null;

  actor_user_id?: number | null;
  subject_user_id?: number | null;

  created_at?: string | null;
};

export type TrustTimelineResponse = {
  user_id: number;
  items: TrustTimelineItem[];
  total: number;
};

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.detail || j?.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

/**
 * Same-origin fetch (works with Vite proxy).
 * Uses Bearer token from localStorage.
 */
async function authedGet<T>(path: string): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("You are logged out. Please log in again.");

  const res = await fetch(path, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export async function getMyTrustSlip(): Promise<TrustSlipPayload> {
  return authedGet<TrustSlipPayload>("/trust-slips/me");
}

export async function listMyLoans(): Promise<LoansListResponse> {
  return authedGet<LoansListResponse>("/loans");
}

export async function getPaymentInstructions(loanId: number): Promise<PaymentInstructionPayload> {
  return authedGet<PaymentInstructionPayload>(`/payment/loans/${loanId}/instructions`);
}

export async function getMyTrustTimeline(limit: number = 10): Promise<any> {
  return authedGet<any>(`/trust-events/me?limit=${encodeURIComponent(String(limit))}`);
} 