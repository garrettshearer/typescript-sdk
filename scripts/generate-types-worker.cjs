#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const ts = require('typescript');
try {
    const modPath = process.argv[2];
    if (!modPath) {
        console.error(JSON.stringify({ success: false, error: 'no module path provided' }));
        process.exit(2);
    }
    // require the target module (isolated in this process)
    const mod = require(modPath);
    const { zodToTs, createTypeAlias, printNode } = require('zod-to-ts');

    const results = [];
    const names = Object.keys(mod || {});
    for (const n of names) {
        const v = mod[n];
        if (!v) continue;
        const looksLikeZod = typeof v === 'object' && (typeof v.safeParse === 'function' || Boolean(v._def));
        if (!looksLikeZod) continue;
        const typeName = n.endsWith('Schema') ? n.replace(/Schema$/, '') : (n[0].toUpperCase() + n.slice(1));
        try {
            const res = zodToTs(v, typeName, { nativeEnums: 'resolve' });
            let extra = '';
            if (res.store && typeof res.store === 'object') {
                for (const key of Object.keys(res.store)) {
                    const val = res.store[key];
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
            // send back the error per-export so the main process can decide
            results.push({ exportName: n, error: String(err && err.stack || err) });
        }
    }
    console.log(JSON.stringify({ success: true, results }));
} catch (err) {
    console.error(JSON.stringify({ success: false, error: String(err && err.stack || err) }));
    process.exit(1);
}
