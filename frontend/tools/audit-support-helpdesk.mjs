/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendRoot, "..");
const findings = [];

function readFrontend(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function report(file, source, index, message, text) {
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text,
  });
}

function assertContains(file, source, needle, message) {
  const index = source.indexOf(needle);
  if (index === -1) {
    report(file, source, -1, message, `Missing expected support helpdesk pattern: ${needle}`);
  }
}

function assertMatches(file, source, pattern, message) {
  const match = source.match(pattern);
  if (!match) {
    report(file, source, -1, message, `Missing expected support helpdesk pattern: ${pattern}`);
  }
}

function assertNotContains(file, source, needle, message) {
  const index = source.indexOf(needle);
  if (index !== -1) {
    report(file, source, index, message, `Forbidden support helpdesk pattern found: ${needle}`);
  }
}

const supportPageFile = "src/pages/SupportPage.tsx";
const supportPage = readFrontend(supportPageFile);
assertContains(supportPageFile, supportPage, "const [threadsOpen, setThreadsOpen] = useState(Boolean(queryCaseId));", "Help Desk must keep previous threads behind an explicit drawer state.");
assertContains(supportPageFile, supportPage, "debugId=\"support-page.threads-toggle\"", "Help Desk must expose one stable toggle for previous support requests.");
assertContains(supportPageFile, supportPage, "data-debug-id=\"support-page.thread-drawer\"", "Help Desk previous requests must live in a named drawer surface.");
assertContains(supportPageFile, supportPage, "setSelectedId((current) => current || queryCaseId || null);", "Help Desk must not auto-open an old case when users arrive to ask for help.");
assertContains(supportPageFile, supportPage, "setThreadsOpen(true);", "Help Desk must open the drawer after creating or selecting a support case.");
assertContains(supportPageFile, supportPage, "data-cta-id=\"support-page.create-attachment\"", "Help Desk create flow must allow picture/PDF evidence.");
assertContains(supportPageFile, supportPage, "data-cta-id=\"support-page.reply-attachment\"", "Help Desk reply flow must allow picture/PDF evidence.");
assertNotContains(supportPageFile, supportPage, "items[0]?.id || null", "Help Desk must not make thread history the default first surface.");

const adminSupportFile = "src/pages/AdminSupportPage.tsx";
const adminSupport = readFrontend(adminSupportFile);
assertContains(adminSupportFile, adminSupport, "uploadSupportCaseAttachment", "Admin Support must use the existing attachment API for admin replies.");
assertContains(adminSupportFile, adminSupport, "const [replyAttachment, setReplyAttachment] = useState<File | null>(null);", "Admin Support must track reply attachments.");
assertContains(adminSupportFile, adminSupport, "data-cta-id=\"admin-support.reply-attachment\"", "Admin Support reply form must expose picture/PDF upload.");
assertContains(adminSupportFile, adminSupport, "Write a reply or attach a picture/PDF first.", "Admin Support must permit attachment-only replies and explain empty submissions.");
assertContains(adminSupportFile, adminSupport, "debugId=\"admin-support.status-toggle\"", "Admin Support status controls must be behind a stable secondary toggle.");
assertContains(adminSupportFile, adminSupport, "const [statusControlsOpen, setStatusControlsOpen] = useState(false);", "Admin Support must keep status controls collapsed by default.");
assertContains(adminSupportFile, adminSupport, "setStatusControlsOpen(false);", "Admin Support must collapse status controls after update.");

const apiFile = "src/lib/api.ts";
const api = readFrontend(apiFile);
assertMatches(apiFile, api, /export async function uploadSupportCaseAttachment[\s\S]*?\/support-cases\/\$\{encodeURIComponent\(String\(caseId\)\)\}\/attachments/, "Shared API must keep support attachment upload available.");

const layoutFile = "src/layout/AppLayout.tsx";
const layout = readFrontend(layoutFile);
assertContains(layoutFile, layout, "to: \"/app/help\"", "Authenticated navigation must expose Help Desk.");
assertContains(layoutFile, layout, "{ label: \"Support Queue\", to: \"/app/command-center/support\" }", "Admin navigation must expose Support Queue.");

const backendFile = "gmfn_backend/app/api/routes/support_cases.py";
const backend = readRepo(backendFile);
assertContains(backendFile, backend, "async def upload_support_case_attachment", "Backend must keep support attachment endpoint.");
assertContains(backendFile, backend, "row = _require_case_visible(db, case_id, current_user)", "Support attachment endpoint must reuse requester/admin visibility checks.");
assertContains(backendFile, backend, "author_role = \"admin\" if _is_admin(current_user) else \"user\"", "Support attachment endpoint must distinguish admin and user authors.");
assertContains(backendFile, backend, "status=\"waiting_user\" if author_role == \"admin\" else \"waiting_admin\"", "Admin attachments must move the case back to the requester.");
assertContains(backendFile, backend, "kind=\"support_case.admin_attachment\"", "Admin attachments must notify the requester.");

if (findings.length) {
  console.error("Support helpdesk audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    console.error(`  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Support helpdesk audit passed.");