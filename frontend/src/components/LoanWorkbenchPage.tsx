import React, { useState } from "react";
import LoanDecisionPanel from "../components/LoanDecisionPanel";
import LoanSuggestionsPanel from "../components/LoanSuggestionsPanel";
import { PrimaryButton } from "./StableButton";

type Suggestion = {
  user_id: number;
  email?: string | null;
  gmfn_id?: string | null;
  risk_level: string;
  cci_score: string;
  cci_band: string;
  trust_graph_reliability: string;
  repayment_velocity: string;
  cross_clan_diversity: string;
  current_locked_guarantees: string;
  available_guarantee_capacity: string;
  suggested_pledge: string;
  suitability_score: string;
  reasons: string[];
};

type LoanSuggestionResponse = {
  loan_id: number;
  clan_id: number;
  borrower_user_id: number;
  loan_amount: string;
  target_guarantee_amount: string;
  suggested_total: string;
  remaining_gap_after_suggestions: string;
  suggestions: Suggestion[];
  viewer_user_id?: number;
  viewer_role?: string;
  borrower_can_view?: boolean;
};

type DecisionResponse = {
  loan_id: number;
  loan: {
    clan_id: number;
    borrower_user_id: number;
    amount: string;
    currency: string;
    status: string;
  };
  decision: {
    recommendation: string;
    confidence_score: string;
    reasons: string[];
  };
  coverage: {
    target_guarantee_amount: string;
    suggested_total: string;
    remaining_gap_after_suggestions: string;
    candidate_count: number;
  };
  clan_context: {
    member_count: number;
    total_available_guarantee_capacity: string;
    clan_exposure_ratio: string;
    average_cci_score: string;
    risk_flags: string[];
    risk_counts: {
      low: number;
      medium: number;
      high: number;
    };
  };
};

function getToken(): string {
  return localStorage.getItem("access_token") || "";
}

export default function LoanWorkbenchPage() {
  const [loanId, setLoanId] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<LoanSuggestionResponse | null>(null);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);

  async function fetchJson(path: string) {
    const token = getToken();
    const res = await fetch(path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const [suggestionsJson, decisionJson] = await Promise.all([
        fetchJson(`/api/loans/${encodeURIComponent(loanId)}/guarantor-suggestions?limit=5`),
        fetchJson(`/api/loans/${encodeURIComponent(loanId)}/decision-intelligence`),
      ]);

      setSuggestions(suggestionsJson as LoanSuggestionResponse);
      setDecision(decisionJson as DecisionResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loan workspace");
      setSuggestions(null);
      setDecision(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-xl font-bold">Loan Intelligence Workspace</div>
        <div className="mb-4 text-sm text-slate-600">
          One place to inspect guarantor suggestions and proceed/caution/block intelligence for a loan.
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:max-w-xs">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Loan ID
            </label>
            <input
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none"
              placeholder="Enter loan id"
            />
          </div>

          <PrimaryButton
            onClick={loadWorkspace}
            busy={loading}
            busyLabel="Loading..."
            stableHeight={52}
            debugId="loan-workbench-legacy.load"
            style={{
              borderRadius: 12,
              background: "#0F172A",
              color: "#FFFFFF",
              padding: "8px 16px",
            }}
          >
            Load Workspace
          </PrimaryButton>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <LoanDecisionPanel data={decision} />
      <LoanSuggestionsPanel data={suggestions} />
    </div>
  );
}
