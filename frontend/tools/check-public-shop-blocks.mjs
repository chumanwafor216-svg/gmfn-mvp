#!/usr/bin/env node

/* global console, fetch, process */

const DEFAULT_API_URL = "https://gmfn-api.onrender.com";
const DEFAULT_GMFN_ID = "GMFN-U-63655DE6";
const DEFAULT_EXPECTED_COUNT = 12;

function argValue(name, fallback = "") {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];

  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_API_URL).trim().replace(/\/+$/, "");
}

function cleanText(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function blockNumberForProduct(product) {
  const candidates = [
    product?.public_block_number,
    product?.display_block_number,
    product?.slot_number,
    product?.metadata_block_number,
  ];

  for (const candidate of candidates) {
    const number = toNumber(candidate);
    if (number > 0) return number;
  }

  return 0;
}

function includesNeedle(value, needle) {
  const cleanNeedle = cleanText(needle).toLowerCase();
  if (!cleanNeedle) return false;
  return cleanText(value).toLowerCase().includes(cleanNeedle);
}

function publicShopUrl(apiUrl, gmfnId) {
  const base = normalizeBaseUrl(apiUrl);
  const encodedGmfnId = encodeURIComponent(cleanText(gmfnId) || DEFAULT_GMFN_ID);
  return `${base}/marketplace/public/shop/${encodedGmfnId}?product_limit=300`;
}

function printUsage() {
  console.log(
    [
      "Non-mutating public Shop Gallery block checker.",
      "",
      "Usage:",
      "  npm --prefix frontend run check:public-shop-blocks -- --gmfn-id GMFN-U-63655DE6",
      "",
      "Options:",
      "  --api-url URL              API base URL. Default: https://gmfn-api.onrender.com",
      "  --gmfn-id ID               Shop owner GSN/GMFN ID. Default: GMFN-U-63655DE6",
      "  --expected-count N         Expected public product count. Default: 12",
      "  --block N                  Focus one public block in the summary.",
      "  --expect-title TEXT        Fail unless the title appears in the focus block, or anywhere if --block is omitted.",
      "  --absent-title TEXT        Fail if this old title still appears anywhere in the public product list.",
      "  --json                     Print JSON only.",
      "  --dry-run                  Print the URL and exit without making a network request.",
      "  --help                     Show this help.",
      "",
      "This tool never signs in and never mutates production data.",
    ].join("\n")
  );
}

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { non_json_body_preview: text.slice(0, 200) };
  }

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return body;
}

function summarizeProducts(products, { expectedCount, focusBlock, expectTitle, absentTitle }) {
  const blockRows = products
    .map((product) => ({
      block: blockNumberForProduct(product),
      id: toNumber(product?.id),
      name: cleanText(product?.name),
      public_block_number: product?.public_block_number ?? null,
      display_block_number: product?.display_block_number ?? null,
      metadata_block_number: product?.metadata_block_number ?? null,
      is_active: product?.is_active !== false,
    }))
    .sort((a, b) => (a.block || 999) - (b.block || 999) || b.id - a.id);

  const numberedRows = blockRows.filter((row) => row.block > 0);
  const groups = new Map();
  for (const row of numberedRows) {
    const rows = groups.get(row.block) || [];
    rows.push(row);
    groups.set(row.block, rows);
  }

  const duplicateBlockGroups = [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([block, rows]) => ({
      block,
      count: rows.length,
      ids: rows.map((row) => row.id),
      names: rows.map((row) => row.name),
    }));

  const numberedBlocks = [...groups.keys()].sort((a, b) => a - b);
  const missingBlocks = [];
  for (let block = 1; block <= expectedCount; block += 1) {
    if (!groups.has(block)) missingBlocks.push(block);
  }

  const focusRows = focusBlock > 0 ? blockRows.filter((row) => row.block === focusBlock) : [];
  const expectTitleMatches = expectTitle
    ? (focusBlock > 0 ? focusRows : blockRows).filter((row) =>
        includesNeedle(row.name, expectTitle)
      )
    : [];
  const absentTitleMatches = absentTitle
    ? blockRows.filter((row) => includesNeedle(row.name, absentTitle))
    : [];

  const failures = [];
  if (products.length !== expectedCount) {
    failures.push(`Expected ${expectedCount} public products, found ${products.length}.`);
  }
  if (duplicateBlockGroups.length) {
    failures.push(
      `Duplicate public blocks found: ${duplicateBlockGroups
        .map((group) => `#${group.block} (${group.ids.join(", ")})`)
        .join("; ")}.`
    );
  }
  if (missingBlocks.length) {
    failures.push(`Missing visible blocks: ${missingBlocks.map((block) => `#${block}`).join(", ")}.`);
  }
  if (focusBlock > 0 && !focusRows.length) {
    failures.push(`Focus block #${focusBlock} was not found.`);
  }
  if (expectTitle && !expectTitleMatches.length) {
    failures.push(
      `Expected title "${expectTitle}" was not found${focusBlock > 0 ? ` in block #${focusBlock}` : ""}.`
    );
  }
  if (absentTitle && absentTitleMatches.length) {
    failures.push(
      `Absent title "${absentTitle}" is still visible on product ids ${absentTitleMatches
        .map((row) => row.id)
        .join(", ")}.`
    );
  }

  return {
    product_count: products.length,
    expected_count: expectedCount,
    numbered_blocks: numberedBlocks,
    missing_blocks: missingBlocks,
    duplicate_block_groups: duplicateBlockGroups,
    focus_block: focusBlock || null,
    focus_items: focusRows,
    expect_title: expectTitle || null,
    expect_title_matches: expectTitleMatches,
    absent_title: absentTitle || null,
    absent_title_matches: absentTitleMatches,
    block_items: blockRows,
    pass: failures.length === 0,
    failures,
  };
}

async function main() {
  if (hasFlag("--help")) {
    printUsage();
    return;
  }

  const apiUrl = argValue("--api-url", process.env.GMFN_LIVE_API_URL || DEFAULT_API_URL);
  const gmfnId = argValue("--gmfn-id", process.env.GMFN_PUBLIC_SHOP_GMFN_ID || DEFAULT_GMFN_ID);
  const expectedCount = Math.max(
    1,
    Number(argValue("--expected-count", String(DEFAULT_EXPECTED_COUNT))) || DEFAULT_EXPECTED_COUNT
  );
  const focusBlock = Math.max(0, Number(argValue("--block", "0")) || 0);
  const expectTitle = cleanText(argValue("--expect-title", ""));
  const absentTitle = cleanText(argValue("--absent-title", ""));
  const url = publicShopUrl(apiUrl, gmfnId);

  if (hasFlag("--dry-run")) {
    const dryRunSummary = {
      dry_run: true,
      url,
      gmfn_id: gmfnId,
      expected_count: expectedCount,
      focus_block: focusBlock || null,
      expect_title: expectTitle || null,
      absent_title: absentTitle || null,
    };
    console.log(JSON.stringify(dryRunSummary, null, 2));
    return;
  }

  const payload = await fetchJson(url);
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const summary = {
    ok: Boolean(payload?.ok),
    gmfn_id: payload?.gmfn_id || gmfnId,
    clan_id: payload?.clan_id ?? null,
    url,
    ...summarizeProducts(products, {
      expectedCount,
      focusBlock,
      expectTitle,
      absentTitle,
    }),
  };

  if (hasFlag("--json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Public shop block check for ${summary.gmfn_id}`);
    console.log(`URL: ${url}`);
    console.log(`Products: ${summary.product_count}/${summary.expected_count}`);
    console.log(`Blocks: ${summary.numbered_blocks.join(", ") || "none"}`);
    if (summary.focus_block) {
      console.log(
        `Focus block #${summary.focus_block}: ${
          summary.focus_items.map((item) => `${item.name} (id ${item.id})`).join("; ") || "not found"
        }`
      );
    }
    if (summary.duplicate_block_groups.length) {
      console.log(`Duplicate groups: ${JSON.stringify(summary.duplicate_block_groups)}`);
    }
    if (summary.missing_blocks.length) {
      console.log(`Missing blocks: ${summary.missing_blocks.join(", ")}`);
    }
    if (summary.failures.length) {
      console.error(`FAIL: ${summary.failures.join(" ")}`);
    } else {
      console.log("PASS: public shop blocks are unique and match the expected visible count.");
    }
  }

  if (!summary.pass) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
