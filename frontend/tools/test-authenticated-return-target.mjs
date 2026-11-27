/* global console, process, URL */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const toolDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(toolDir, "..", "src", "lib", "nav.ts"), "utf8");
const contract = source.match(
  /export function isSafeInternalPath[\s\S]*?(?=\r?\nexport function originState)/
)?.[0];

assert.ok(contract, "Authenticated return-target implementation must remain executable by this contract test.");

const executable = `${contract.replace(/^export /gm, "")}\nglobalThis.__safeAuthenticatedReturnTarget = safeAuthenticatedReturnTarget;`;
const output = ts.transpileModule(executable, {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = vm.createContext({ URL });
new vm.Script(output).runInContext(context);
const safeTarget = context.__safeAuthenticatedReturnTarget;

const accepted = new Map([
  ["/app", "/app"],
  ["/app/dashboard?clan_id=1#today", "/app/dashboard?clan_id=1#today"],
  [
    "/shop/GSN-U-ACCEPTSELLER?product_id=141&clan_id=1&gsn_purchase=buy_now&gsn_source=shop",
    "/shop/GSN-U-ACCEPTSELLER?product_id=141&clan_id=1&gsn_purchase=buy_now&gsn_source=shop",
  ],
  [" /shop/seller_1-uk/?product_id=9 ", "/shop/seller_1-uk/?product_id=9"],
]);

for (const [input, expected] of accepted) {
  assert.equal(safeTarget(input), expected, `Expected safe target to survive: ${input}`);
}

for (const input of [
  "",
  "https://attacker.example/shop/seller",
  "//attacker.example/shop/seller",
  "javascript:alert(1)",
  "/shop",
  "/shop/seller/products",
  "/shop/seller%2Fproducts",
  "/shop/seller\\products",
  "shop/seller",
]) {
  assert.equal(safeTarget(input), "", `Expected unsafe or unsupported target to be rejected: ${input}`);
}

console.log("Authenticated return-target contract passed.");