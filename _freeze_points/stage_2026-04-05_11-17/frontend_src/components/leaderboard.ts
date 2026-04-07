import { apiGet } from "./trust";

export type GuarantorLeaderboardRow = {
  guarantor_user_id: number;
  guarantor_email: string;
  total_requests: number;
  approved: number;
  declined: number;
  expired: number;
  approval_rate: number;
  reliability_score: number;
};

export type GuarantorLeaderboardResponse = {
  clan_id: number;
  items: GuarantorLeaderboardRow[];
  total: number;
};

export function getGuarantorLeaderboard(clanId: number, token: string) {
  return apiGet<GuarantorLeaderboardResponse>(
    `/trust/admin/leaderboard/guarantors?clan_id=${clanId}&limit=20`,
    token
  );
}
