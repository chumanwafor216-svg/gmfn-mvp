/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(file, pattern, message) {
  const text = readRepo(file);

  if (pattern.test(text)) return;

  findings.push({
    file,
    line: 1,
    message,
    text: "Expected Market Wisdom contract pattern was not found.",
  });
}

function assertNotContains(file, pattern, message) {
  const text = readRepo(file);
  let match;

  while ((match = pattern.exec(text))) {
    findings.push({
      file,
      line: lineAt(text, match.index),
      message,
      text: text.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });

    if (!pattern.global) break;
  }
}

assertContains(
  "frontend/src/lib/api.ts",
  /export async function getDailyInsight\(\): Promise<any> \{[\s\S]*?httpJsonPaths\([\s\S]*?"\/public\/daily-insight"[\s\S]*?"\/daily-insight"[\s\S]*?"GET"[\s\S]*?includeAuth: false,[\s\S]*?quiet: true,[\s\S]*?source: "GSN Market Wisdom"/,
  "Frontend daily insight must read the backend public Market Wisdom route before using the local fallback."
);

assertContains(
  "gmfn_backend/app/api/routes/daily_insight.py",
  /@router\.get\("\/public\/daily-insight"\)[\s\S]*?def daily_insight\([\s\S]*?db: Session = Depends\(get_db\)[\s\S]*?return get_daily_market_wisdom\(db\)/,
  "Backend must keep the public daily insight route wired to the Market Wisdom service."
);

assertContains(
  "gmfn_backend/app/api/router.py",
  /from app\.api\.routes\.daily_insight import router as daily_insight_router[\s\S]*?api_router\.include_router\(daily_insight_router\)/,
  "Backend Market Wisdom route must be mounted in the central API router."
);

assertContains(
  "gmfn_backend/app/services/daily_insight_service.py",
  /MARKET_WISDOM_STATUSES[\s\S]*?"review_required"[\s\S]*?MARKET_WISDOM_SOURCE_TYPES[\s\S]*?"named_source"[\s\S]*?"research_field"[\s\S]*?"general_practical_wisdom"[\s\S]*?def get_daily_market_wisdom\(db: Optional\[Session\] = None\) -> Dict\[str, Any\]:[\s\S]*?"date":[\s\S]*?"text":[\s\S]*?"source"/,
  "Backend Market Wisdom service must return compatibility fields while enforcing governed statuses and source types."
);

assertContains(
  "gmfn_backend/app/services/daily_insight_service.py",
  /PILOT_WISDOM_DOMAIN_SEEDS[\s\S]*?PILOT_WISDOM_MOVE_SEEDS[\s\S]*?SEED_WISDOM_ENTRIES\.extend\([\s\S]*?for domain in PILOT_WISDOM_DOMAIN_SEEDS[\s\S]*?for move in PILOT_WISDOM_MOVE_SEEDS/,
  "Backend Market Wisdom must keep the curated pilot library generator instead of shrinking back to the compact seed list."
);

assertContains(
  "gmfn_backend/app/services/daily_insight_service.py",
  /trusted_seed = _safe_str\(payload\.get\("generation_method"\)\) == "seeded_governed_library"[\s\S]*?if similar_entries and suggested_status == "approved" and not trusted_seed/,
  "Curated governed seed entries must still pass exact/prohibited validation while avoiding accidental similarity demotion."
);

assertContains(
  "gmfn_backend/app/services/daily_insight_service.py",
  /existing_public_ids = \{[\s\S]*?missing_seed_payloads = \[[\s\S]*?if not missing_seed_payloads:[\s\S]*?return[\s\S]*?seeded\["generation_reason"\] = "Curated governed Market Wisdom pilot library\."/,
  "Market Wisdom seeding must add missing curated entries by public_id without overwriting existing database rows."
);

assertContains(
  "gmfn_backend/app/db/models.py",
  /class MarketWisdomEntry\(Base\):[\s\S]*?__tablename__ = "market_wisdom_entries"[\s\S]*?originality_hash[\s\S]*?semantic_fingerprint[\s\S]*?class MarketWisdomExposure\(Base\):[\s\S]*?shown_at[\s\S]*?opened_at[\s\S]*?dismissed_at[\s\S]*?acted_on_at[\s\S]*?feedback/,
  "Market Wisdom must have governed entry storage and exposure/feedback storage."
);

assertContains(
  "frontend/src/lib/marketWisdom.ts",
  /const CAPABILITY_WISDOM: MarketWisdomPair\[\] = GMFN_CAPABILITIES\.map[\s\S]*?const LEGACY_WISDOM: MarketWisdomPair\[\][\s\S]*?export function getSmartMarketWisdomPair[\s\S]*?export function marketWisdomPairFromDailyInsight/,
  "Smart Market Wisdom must keep the GSN capability pool as fallback while accepting backend-governed wisdom."
);

assertContains(
  "frontend/src/lib/marketWisdom.ts",
  /function buildPreferredCategories\([\s\S]*?!hasGmfnId[\s\S]*?pendingRequests > 0[\s\S]*?unread > 3[\s\S]*?trustTone === "red" \|\| trustTone === "yellow"[\s\S]*?hasSpotlight[\s\S]*?hour >= 5/,
  "Smart Market Wisdom must stay weighted by identity, support pressure, unread activity, trust pressure, Spotlight, and time of day."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /const backendWisdom = marketWisdomPairFromDailyInsight\(insight\);[\s\S]*?setActiveWisdom\(\(prev\) =>[\s\S]*?backendWisdom \|\|[\s\S]*?getSmartMarketWisdomPair\(\{[\s\S]*?hour,[\s\S]*?unread: notices\.filter\(\(n\) => !n\?\.is_read\)\.length,[\s\S]*?pendingRequests: pendingRequests\.length,[\s\S]*?hasSpotlight: Boolean\(activeSpotlight\),[\s\S]*?hasGmfnId: Boolean\(me\?\.gmfn_id\),[\s\S]*?trustTone: cci\.tone,[\s\S]*?previousId: \(prev as any\)\?\.id/,
  "Dashboard must prefer backend-governed Market Wisdom while keeping smart local fallback."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /const marketWisdomSignals = useMemo\([\s\S]*?key: "market"[\s\S]*?detail: `\$\{activeWisdomCategoryLabel\} context is shaping this reading\.`[\s\S]*?key: "gsn"[\s\S]*?detail: "GSN translates the reading into a safer next decision\."[\s\S]*?key: "guide"[\s\S]*?detail: "The guide connects this reading to one GSN capability\."[\s\S]*?key: "now"[\s\S]*?detail: marketWisdomAttentionState\.detail[\s\S]*?const activeMarketWisdomSignal/,
  "Dashboard Market Wisdom must keep the four-signal presentation with signal-specific context: Market, GSN, Guide, and Now."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /\{activeMarketWisdomSignal\.detail\}/,
  "Dashboard Market Wisdom context detail must follow the active rotating signal instead of always showing the Now-state detail."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /debugId="dashboard\.market-wisdom\.open-focus-commitments"[\s\S]*?openDashboardRoute\([\s\S]*?`\$\{DASHBOARD_TARGETS\.DASHBOARD\}#focus-commitments`[\s\S]*?Open Focus Commitments/,
  "Market Wisdom Commitment Builder action must stay scoped to Dashboard Focus Commitments."
);

assertNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /debugId="dashboard\.market-wisdom\.(?!open-focus-commitments)[^"]+"/g,
  "Frozen Market Wisdom must not gain extra route actions without an intentional audit update."
);

assertNotContains(
  "frontend/src/lib/marketWisdom.ts",
  /proof|guarantee|credit approval|release instruction|automatic approval/i,
  "Market Wisdom copy must not imply proof, guarantees, credit approval, release instruction, or automatic approval."
);

if (findings.length > 0) {
  console.error("Market Wisdom contract audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Market Wisdom contract audit passed: backend source, frontend daily insight, smart weighting, four-signal display, and frozen action scope are caged."
);
