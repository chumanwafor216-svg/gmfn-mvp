/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected entry-flow polish pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

function assertEntryActionButtonsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern = /<EntryActionButton\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 900);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "EntryActionButton controls must have debugId so pre-Dashboard phone taps can be traced.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

const entryPages = [
  "src/pages/CoverPage.tsx",
  "src/pages/WelcomePage.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/CreateEntryPage.tsx",
  "src/pages/JoinEntryPage.tsx",
  "src/pages/JoinRequestPendingPage.tsx",
  "src/pages/JoinApprovalPage.tsx",
  "src/pages/MemberActivationPage.tsx",
];

assertContains(
  "src/App.tsx",
  /<Route\s+path="\/cover"[\s\S]*?<PublicEntryGuard>[\s\S]*?<CoverPage \/>[\s\S]*?<\/PublicEntryGuard>[\s\S]*?<Route\s+path="\/welcome"[\s\S]*?<PublicEntryGuard>[\s\S]*?<WelcomePage \/>[\s\S]*?<\/PublicEntryGuard>/,
  "Cover and Welcome must stay public-entry guarded and outside the authenticated app shell."
);

[
  ['<Route path="/login" element={<LoginPage />} />', "Sign In"],
  ['<Route path="/create" element={<CreateEntryPage />} />', "Create Community"],
  ['<Route path="/join" element={<JoinEntryPage />} />', "Join Community"],
  [
    '<Route path="/pending-approval" element={<JoinRequestPendingPage />} />',
    "Pending Approval",
  ],
  [
    '<Route path="/join-approval/:requestId" element={<JoinApprovalPage />} />',
    "Join Approval",
  ],
  [
    '<Route path="/activate-membership" element={<MemberActivationPage />} />',
    "Member Activation",
  ],
].forEach(([routeLine, label]) => {
  assertContains(
    "src/App.tsx",
    new RegExp(routeLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${label} must remain a distinct pre-Dashboard route.`
  );
});

assertContains(
  "src/App.tsx",
  /<Route\s+path="\/app"[\s\S]*?<RequireAuth>[\s\S]*?<AppLayout \/>[\s\S]*?<\/RequireAuth>/,
  "The authenticated app shell and bottom-navigation surface must remain behind /app RequireAuth."
);

assertContains(
  "src/App.tsx",
  /<Route path="\/start\/create" element=\{<RedirectToCover entry="create" \/>\} \/>/,
  "Start-create aliases must continue through the create entry intent."
);

assertContains(
  "src/App.tsx",
  /path="\/start\/join\/:code"[\s\S]*?element=\{<JoinEntryPage \/>\}/,
  "Start-join aliases must continue through the join entry page."
);

entryPages.forEach((file) => {
  assertEntryActionButtonsHaveDebugIds(file);

  assertNotContains(
    file,
    /<AppLayout|OwnerOnlySurfaceNav|bottomNavigation|bottom-nav|mobileBottomNav|app-layout\.bottom/i,
    "Pre-Dashboard entry pages must not render the authenticated app shell or bottom navigation."
  );
});

[
  ["src/pages/WelcomePage.tsx", /<EntryBackLink to="\/cover" \/>/],
  ["src/pages/LoginPage.tsx", /<EntryBackLink to="\/welcome" \/>/],
  ["src/pages/CreateEntryPage.tsx", /<EntryBackLink to="\/welcome" \/>/],
  ["src/pages/JoinEntryPage.tsx", /<EntryBackLink to="\/welcome" \/>/],
  ["src/pages/JoinApprovalPage.tsx", /debugId="join-approval\.back"[\s\S]*?debugId=\{welcomeCta\.debugId\}/],
  ["src/pages/MemberActivationPage.tsx", /debugId="member-activation\.back"[\s\S]*?aria-label="Back to welcome"/],
].forEach(([file, pattern]) => {
  assertContains(
    file,
    pattern,
    "Pre-Dashboard deep entry screens must provide an in-page return path, not only browser back."
  );
});

assertContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /debugId="join-pending\.review-details\.toggle"[\s\S]*?debugId=\{welcomeCta\.debugId\}/,
  "Pending approval must provide both detail review and a route back to Welcome."
);

assertContains(
  "src/components/EntryControls.tsx",
  /export function EntryBackLink[\s\S]*?<StableCtaLink[\s\S]*?debugId="entry-controls\.back"[\s\S]*?minHeight: 44[\s\S]*?minWidth: 44/,
  "Shared entry back control must stay stable and traceable."
);

if (findings.length > 0) {
  console.error("Entry flow polish audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Entry flow polish audit passed.");
