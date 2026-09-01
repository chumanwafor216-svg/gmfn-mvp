/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const parentPath = "src/pages/MarketplacePage.tsx";
const parent = readFileSync(join(frontendRoot, parentPath), "utf8");

const lazySections = [
  {
    component: "MarketplaceToolsSection",
    childPath: "src/pages/marketplace/MarketplaceToolsSection.tsx",
    allowsAnyDataForNow: false,
  },
  {
    component: "MarketplaceTradeEvidenceSection",
    childPath: "src/pages/marketplace/MarketplaceTradeEvidenceSection.tsx",
    allowsAnyDataForNow: false,
  },
];

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function extractDataDestructure(text, childPath) {
  const match = /const\s*\{([\s\S]*?)\}\s*=\s*data\s*;/.exec(text);
  if (!match) {
    throw new Error(`${childPath}: expected a top-level data destructure.`);
  }
  return match[1];
}

function namesFromObjectList(block) {
  return [...block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*,?\s*$/gm)]
    .map((match) => match[1])
    .filter((name) => name !== "type");
}

function extractParentDataObject(component) {
  const componentIndex = parent.indexOf(`<${component}`);
  if (componentIndex < 0) {
    throw new Error(`${parentPath}: ${component} usage was not found.`);
  }

  const marker = "data={{";
  const dataIndex = parent.indexOf(marker, componentIndex);
  if (dataIndex < 0) {
    throw new Error(`${parentPath}: ${component} does not receive a data object.`);
  }

  let depth = 1;
  let inString = null;
  let escaped = false;
  const start = dataIndex + marker.length;

  for (let index = start; index < parent.length; index += 1) {
    const char = parent[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return parent.slice(start, index);
      }
    }
  }

  throw new Error(`${parentPath}: ${component} data object did not close.`);
}

const findings = [];

for (const section of lazySections) {
  const child = readFileSync(join(frontendRoot, section.childPath), "utf8");
  const destructured = namesFromObjectList(
    extractDataDestructure(child, section.childPath)
  );
  const provided = namesFromObjectList(extractParentDataObject(section.component));
  const providedSet = new Set(provided);
  const destructuredSet = new Set(destructured);

  for (const name of destructured) {
    if (!providedSet.has(name)) {
      findings.push({
        file: parentPath,
        line: lineOf(parent, parent.indexOf(`<${section.component}`)),
        message: `${section.component} destructures data.${name}, but MarketplacePage does not pass it.`,
      });
    }
  }

  for (const name of provided) {
    if (!destructuredSet.has(name)) {
      findings.push({
        file: parentPath,
        line: lineOf(parent, parent.indexOf(name, parent.indexOf(`<${section.component}`))),
        message: `${section.component} receives unused data.${name}; remove it or use it intentionally.`,
      });
    }
  }

  if (!section.allowsAnyDataForNow && /data\s*:\s*any\b/.test(child)) {
    findings.push({
      file: section.childPath,
      line: lineOf(child, child.search(/data\s*:\s*any\b/)),
      message: `${section.component} must keep its lazy data contract typed, not data: any.`,
    });
  }
}

if (findings.length > 0) {
  console.error("Marketplace lazy data boundary audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
  }
  process.exit(1);
}

console.log(
  "Marketplace lazy data boundary audit passed: Tools and Trade Evidence parent data bundles match child destructures, and both lazy sections stay typed."
);