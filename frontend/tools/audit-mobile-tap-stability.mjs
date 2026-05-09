import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const sourceRoot = join(frontendRoot, "src");
const allowedExtensions = new Set([".css", ".ts", ".tsx"]);

const forbiddenPatterns = [
  {
    label: "GPU tap promotion can cause mobile button hit-box drift",
    pattern: /translateZ\(0\)/,
  },
  {
    label: "Smooth post-action scroll can move the tapped control under the finger",
    pattern: /behavior\s*:\s*["']smooth["']/,
  },
  {
    label: "Immediate propagation stop can block shared routing/copy handlers",
    pattern: /stopImmediatePropagation/,
  },
  {
    label: "Touch handlers can double-fire beside pointer/click handlers",
    pattern: /onTouch(?:Start|StartCapture|End|Move)\b/,
  },
  {
    label: "CSS active states can introduce tap-time layout movement",
    pattern: /:active\b/,
  },
  {
    label: "Transform will-change can keep tappable controls on unstable layers",
    pattern: /willChange\s*:\s*["']transform["']|will-change\s*:\s*transform/,
  },
];

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return allowedExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
}

const findings = [];

for (const filePath of listSourceFiles(sourceRoot)) {
  const relativePath = relative(frontendRoot, filePath);
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(line)) {
        findings.push({
          file: relativePath,
          line: index + 1,
          label: forbidden.label,
          text: line.trim(),
        });
      }
    }
  });
}

if (findings.length > 0) {
  console.error("Mobile tap stability audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.label}\n  ${finding.text}`,
    );
  }
  process.exit(1);
}

console.log("Mobile tap stability audit passed.");
