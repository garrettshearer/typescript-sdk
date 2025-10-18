/*
  scripts/generate-types-worker.ts

  Human-readable TypeScript worker subprocess.

  Purpose
  -------
  - Spawned by the main generator to require a compiled module in `dist/` and
    inspect its exports for Zod-like runtime schemas.
  - For each detected schema, run zod-to-ts to produce a concise TypeScript
    type alias and any extra supporting declarations.
  - Emit a compact JSON result on stdout for the main generator to consume.

  Heuristics for detection
  ------------------------
  - Exported value has `.safeParse` or `.parse` functions
  - Exported value has a `_def` property
  - Export name ends with `Schema`
  - Exported wrapper objects with a `.schema` property

  Output
  ------
  JSON printed to stdout:
    { success: true, results: [ { exportName, typeName, alias, extra }, ... ] }

*/

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const require = createRequire(import.meta.url);

async function main() {
  try {
    const modPath = process.argv[2];
    if (!modPath) {
      console.error(JSON.stringify({ success: false, error: 'no module path provided' }));
      process.exit(2);
    }

    // require the target module (isolated in this process)
    const mod = require(modPath);
    const { zodToTs, createTypeAlias, printNode } = require('zod-to-ts');

    const results: Array<any> = [];
    const names = Object.keys(mod || {});
    for (const n of names) {
      const v = mod[n];
      if (!v) continue;
      // heuristics to detect zod-like schemas
      const hasSafeParse = typeof v?.safeParse === 'function' || typeof v?.parse === 'function';
      const hasDef = Boolean(v && v._def);
      const namedLikeSchema = /schema$/i.test(n) || /Schema$/.test(n);
      const hasSchemaProp = Boolean(v && v.schema && (typeof v.schema.safeParse === 'function' || Boolean((v.schema as any)._def)));
      const looksLikeZod = Boolean(hasSafeParse || hasDef || namedLikeSchema || hasSchemaProp);
      if (!looksLikeZod) continue;

      const typeName = n.endsWith('Schema') ? n.replace(/Schema$/, '') : (n[0].toUpperCase() + n.slice(1));
      try {
        const schemaObj = (v && (v as any).schema && (typeof (v as any).schema.safeParse === 'function' || Boolean((v as any).schema._def))) ? (v as any).schema : v;
        const res = zodToTs(schemaObj, typeName, { nativeEnums: 'resolve' });
        let extra = '';
        if (res.store && typeof res.store === 'object') {
          for (const key of Object.keys(res.store)) {
            const val = (res.store as any)[key];
            if (Array.isArray(val)) {
              for (const node of val) {
                try { extra += printNode(node) + '\n\n'; } catch (e) {}
              }
            } else if (val) {
              try { extra += printNode(val) + '\n\n'; } catch (e) {}
            }
          }
        }

        const aliasNode = createTypeAlias(res.node, typeName);
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const resultFile = ts.createSourceFile('tmp.ts', '', ts.ScriptTarget.Latest);
        const alias = printer.printNode(ts.EmitHint.Unspecified, aliasNode, resultFile);
        results.push({ exportName: n, typeName, alias, extra });
      } catch (err) {
        results.push({ exportName: n, error: String((err as Error)?.stack || err) });
      }
    }

    console.log(JSON.stringify({ success: true, results }));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: String((err as Error)?.stack || err) }));
    process.exit(1);
  }
}

if (process.argv[1].endsWith('generate-types-worker.ts') || process.argv[1].endsWith('generate-types-worker')) {
  main();
}

export default main;
