import https from "node:https";

const defaultBaseUrl = "https://gmfn-frontend.onrender.com";
const baseUrl = String(process.env.GSN_LIVE_FRONTEND_URL || defaultBaseUrl).replace(/\/+$/, "");

const requiredMarkers = [
  {
    label: "active profile public website label",
    marker: "GSN public website",
    assetPattern: /MyGMFNAndIPage/i,
  },
  {
    label: "active profile GSN handle label",
    marker: "Your GSN handle",
    assetPattern: /MyGMFNAndIPage/i,
  },
  {
    label: "active profile public website open action",
    marker: "my-gmfn.public-website.open",
    assetPattern: /MyGMFNAndIPage/i,
  },
  {
    label: "active profile GSN handle copy action",
    marker: "my-gmfn.gsn-handle.copy",
    assetPattern: /MyGMFNAndIPage/i,
  },
  {
    label: "DemandBox phone-free handle control",
    marker: "Contact by GSN handle",
    assetPattern: /DemandBoxPage/i,
  },
  {
    label: "Command Centre public site action",
    marker: "Open public GSN site",
    assetPattern: /TrustCommandCentrePage/i,
  },
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`${url} returned HTTP ${response.statusCode || "unknown"}`));
            return;
          }
          resolve(body);
        });
      }
    );

    request.setTimeout(30_000, () => {
      request.destroy(new Error(`${url} timed out`));
    });
    request.on("error", reject);
  });
}

function unique(values) {
  return [...new Set(values)];
}

function jsAssetsFrom(text) {
  return unique([...text.matchAll(/assets\/[^"']+?\.js/g)].map((match) => match[0]));
}

function fail(messages) {
  console.error("Live profile/public-link verification failed:");
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
}

const cacheToken = `verify-live-profile-${Date.now()}`;
const indexHtml = await fetchText(`${baseUrl}/index.html?${cacheToken}`);
const indexAssets = jsAssetsFrom(indexHtml);
const mainAsset = indexAssets.find((asset) => /assets\/index-[^/]+\.js$/i.test(asset));

if (!mainAsset) {
  fail(["Could not find the live Vite index JavaScript asset in index.html."]);
}

const mainBody = await fetchText(`${baseUrl}/${mainAsset}?${cacheToken}`);
const appAssets = unique([...indexAssets, ...jsAssetsFrom(mainBody)]);

const targetAssets = appAssets.filter((asset) =>
  requiredMarkers.some((requirement) => requirement.assetPattern.test(asset))
);

if (targetAssets.length === 0) {
  fail([
    `Found ${appAssets.length} JavaScript assets, but none matched the expected route chunks.`,
    `Live index asset was ${mainAsset}.`,
  ]);
}

const assetBodies = new Map();
for (const asset of targetAssets) {
  assetBodies.set(asset, await fetchText(`${baseUrl}/${asset}?${cacheToken}`));
}

const missing = [];
const found = [];

for (const requirement of requiredMarkers) {
  const matchingAssets = targetAssets.filter((asset) => requirement.assetPattern.test(asset));
  const matchedAsset = matchingAssets.find((asset) =>
    String(assetBodies.get(asset) || "").includes(requirement.marker)
  );

  if (matchedAsset) {
    found.push(`${requirement.label}: ${matchedAsset}`);
  } else {
    missing.push(`${requirement.label} (${requirement.marker})`);
  }
}

if (missing.length > 0) {
  fail([
    `Live URL: ${baseUrl}`,
    `Live index asset: ${mainAsset}`,
    `Scanned route assets: ${targetAssets.join(", ")}`,
    ...missing.map((item) => `Missing ${item}`),
  ]);
}

console.log("Live profile/public-link verification passed.");
console.log(`Live URL: ${baseUrl}`);
console.log(`Live index asset: ${mainAsset}`);
for (const line of found) console.log(`- ${line}`);