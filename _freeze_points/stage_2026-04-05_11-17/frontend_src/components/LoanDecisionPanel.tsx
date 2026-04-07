import React from "react";

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

function humanize(value: string): string {
  return value.split("_").join(" ");
}

function recommendationClass(value?: string): string {
  switch ((value || "").toLowerCase()) {
    case "proceed":
      return "bg-emerald-100 text-emerald-800";
    case "caution":
      return "bg-yellow-100 text-yellow-800";
    case "block":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function LoanDecisionPanel({
  data,
}: {
  data: DecisionResponse | null;
}) {
  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">No decision intelligence loaded yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 text-lg font-bold">Decision Intelligence</div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Loan Amount</div>
          <div className="font-bold">
            {data.loan.amount} {data.loan.currency}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Recommendation</div>
          <div className="mt-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${recommendationClass(
                data.decision.recommendation
              )}`}
            >
              {data.decision.recommendation}
            </span>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Confidence</div>
          <div className="font-bold">{data.decision.confidence_score}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Remaining Gap</div>
          <div className="font-bold">{data.coverage.remaining_gap_after_suggestions}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">Reasons</div>
          <div className="flex flex-wrap gap-2">
            {(data.decision.reasons || []).map((r) => (
              <span
                key={r}
                className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
              >
                {humanize(r)}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">Coverage</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>Target Guarantee</span>
              <span className="font-bold">{data.coverage.target_guarantee_amount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>Suggested Total</span>
              <span className="font-bold">{data.coverage.suggested_total}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span>Candidate Count</span>
              <span className="font-bold">{data.coverage.candidate_count}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Clan Context</div>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500">Members</div>
            <div className="font-bold">{data.clan_context.member_count}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500">Available Capacity</div>
            <div className="font-bold">{data.clan_context.total_available_guarantee_capacity}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500">Exposure Ratio</div>
            <div className="font-bold">{data.clan_context.clan_exposure_ratio}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-slate-500">Average CCI</div>
            <div className="font-bold">{data.clan_context.average_cci_score}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(data.clan_context.risk_flags || []).length ? (
            data.clan_context.risk_flags.map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
              >
                {flag}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">No clan risk flags</span>
          )}
        </div>
      </div>
    </div>
  );
}