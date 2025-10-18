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
        // More aggressive heuristics to detect Zod-like schemas:
        // - object with safeParse or parse functions
        // - object with _def
        // - exported property named *Schema
        // - objects with a `.schema` property that is a Zod schema
        // - functions which have a `.schema` property
        const hasSafeParse = typeof v.safeParse === 'function' || typeof v.parse === 'function';
        const hasDef = Boolean(v && v._def);
        const namedLikeSchema = /schema$/i.test(n) || /Schema$/.test(n);
        const hasSchemaProp = v && (v.schema && (typeof v.schema.safeParse === 'function' || Boolean(v.schema._def)));
        const looksLikeZod = Boolean(hasSafeParse || hasDef || namedLikeSchema || hasSchemaProp);
        if (!looksLikeZod) continue;
        const typeName = n.endsWith('Schema') ? n.replace(/Schema$/, '') : (n[0].toUpperCase() + n.slice(1));
        try {
            // prefer passing an actual Zod schema object; if the export is a wrapper with a `.schema` prop, use that
            const schemaObj = (v && v.schema && (typeof v.schema.safeParse === 'function' || Boolean(v.schema._def))) ? v.schema : v;
            const res = zodToTs(schemaObj, typeName, { nativeEnums: 'resolve' });
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
