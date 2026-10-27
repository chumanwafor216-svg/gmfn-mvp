/* global Buffer, console, process */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const toolDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(
  toolDir,
  '..',
  'src',
  'lib',
  'spotlightPresentationPolicy.ts'
);
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const policy = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`
);

const cases = [
  { label: 'image', input: { mediaKind: 'image' }, expected: 5_000 },
  { label: 'three-second video', input: { mediaKind: 'video', videoDurationSeconds: 3 }, expected: 8_000 },
  { label: 'seven-second video', input: { mediaKind: 'video', videoDurationSeconds: 7 }, expected: 8_000 },
  { label: 'nine-second video', input: { mediaKind: 'video', videoDurationSeconds: 9 }, expected: 9_000 },
  { label: 'ten-second video', input: { mediaKind: 'video', videoDurationSeconds: 10 }, expected: 10_000 },
  { label: 'twelve-second video', input: { mediaKind: 'video', videoDurationSeconds: 12 }, expected: 10_000 },
  { label: 'missing-duration video', input: { mediaKind: 'video', videoDurationSeconds: null }, expected: 10_000 },
  { label: 'non-finite video', input: { mediaKind: 'video', videoDurationSeconds: Number.POSITIVE_INFINITY }, expected: 10_000 },
];

const failures = cases.flatMap((testCase) => {
  const actual = policy.publicShopSpotlightRotationMs(testCase.input);
  return actual === testCase.expected
    ? []
    : [{ ...testCase, actual }];
});

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, cases: cases.length }, null, 2));
