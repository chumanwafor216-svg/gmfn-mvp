import React from "react";

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

function humanize(value: string): string {
  return value
    .split("_")
    .join(" ")
    .replace(/Guarantors/g, "Supporters")
    .replace(/Guarantor/g, "Supporter")
    .replace(/guarantors/g, "supporters")
    .replace(/guarantor/g, "supporter")
    .replace(/guarantees/g, "support commitments")
    .replace(/guarantee/g, "support");
}

function riskPillClass(level?: string): string {
  switch ((level || "").toLowerCase()) {
    case "low":
      return "bg-emerald-100 text-emerald-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function bandPillClass(band?: string): string {
  switch ((band || "").toUpperCase()) {
    case "A":
      return "bg-green-100 text-green-800";
    case "B":
      return "bg-emerald-100 text-emerald-800";
    case "C":
      return "bg-yellow-100 text-yellow-800";
    case "D":
      return "bg-orange-100 text-orange-800";
    case "E":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function LoanSuggestionsPanel({
  data,
}: {
  data: LoanSuggestionResponse | null;
}) {
  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">No supporter suggestions loaded yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 text-lg font-bold">Supporter Suggestions</div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Loan ID</div>
          <div className="font-bold">{data.loan_id}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Target Support</div>
          <div className="font-bold">{data.target_guarantee_amount}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Suggested Total</div>
          <div className="font-bold">{data.suggested_total}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-slate-500">Remaining Gap</div>
          <div className="font-bold">{data.remaining_gap_after_suggestions}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Band</th>
              <th className="px-3 py-2">CCI</th>
              <th className="px-3 py-2">Reliability</th>
              <th className="px-3 py-2">Capacity</th>
              <th className="px-3 py-2">Support</th>
              <th className="px-3 py-2">Suitability</th>
              <th className="px-3 py-2">Risk</th>
            </tr>
          </thead>
          <tbody>
            {(data.suggestions || []).map((s) => (
              <tr key={s.user_id} className="border-b align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{s.email || `User ${s.user_id}`}</div>
                  <div className="text-xs text-slate-500">{s.gmfn_id || "-"}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(s.reasons || []).map((r) => (
                      <span
                        key={`${s.user_id}-${r}`}
                        className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {humanize(r)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${bandPillClass(s.cci_band)}`}>
                    {s.cci_band}
                  </span>
                </td>
                <td className="px-3 py-2">{s.cci_score}</td>
                <td className="px-3 py-2">{s.trust_graph_reliability}</td>
                <td className="px-3 py-2">{s.available_guarantee_capacity}</td>
                <td className="px-3 py-2 font-semibold">{s.suggested_pledge}</td>
                <td className="px-3 py-2">{s.suitability_score}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${riskPillClass(s.risk_level)}`}>
                    {s.risk_level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
