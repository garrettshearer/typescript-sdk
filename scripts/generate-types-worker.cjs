/*
    scripts/generate-types-worker.cjs

    Worker subprocess that is spawned by the main generator. This process:
    - requires a compiled module path (e.g., dist/esm/types.js or dist/esm/client/index.js)
    - inspects its exports to find Zod-like runtime schemas
    - runs zod-to-ts to generate concise alias AST nodes and any extra declarations
    - prints a JSON result to stdout which the main process consumes

    The output is intentionally small JSON with fields:
        { success: true, results: [ { exportName, typeName, alias, extra }, ... ] }

*/
const path = require('path');
const fs = require('fs');
const ts = require('typescript');

function safeRequire(p) {
    try {
        return require(p);
    } catch (e) {
        return { __error: String(e) };
    }
}

try {
    const modPath = process.argv[2];
    if (!modPath) {
        console.error(JSON.stringify({ success: false, error: 'no module path provided' }));
        process.exit(2);
    }
    // require the target module (isolated in this process)
    const mod = safeRequire(path.resolve(modPath));
    if (mod && mod.__error) {
        console.error(JSON.stringify({ success: false, error: mod.__error }));
        process.exit(1);
    }

    let zodToTsMod;
    try {
        zodToTsMod = require('zod-to-ts');
    } catch (e) {
        zodToTsMod = null;
    }

    const results = [];
    const names = Object.keys(mod || {});
    for (const n of names) {
        const v = mod[n];
        if (!v) continue;
        const hasSafeParse = typeof v.safeParse === 'function' || typeof v.parse === 'function';
        const hasDef = Boolean(v && v._def);
        const namedLikeSchema = /schema$/i.test(n) || /Schema$/.test(n);
        const hasSchemaProp = v && v.schema && (typeof v.schema.safeParse === 'function' || Boolean(v.schema._def));
        const looksLikeZod = Boolean(hasSafeParse || hasDef || namedLikeSchema || hasSchemaProp);
        if (!looksLikeZod) continue;
        const typeName = n.endsWith('Schema') ? n.replace(/Schema$/, '') : (n[0] ? n[0].toUpperCase() + n.slice(1) : n);
        try {
            const schemaObj = (v && v.schema && (typeof v.schema.safeParse === 'function' || Boolean(v.schema._def))) ? v.schema : v;
            if (!zodToTsMod) {
                results.push({ exportName: n, typeName, warning: 'zod-to-ts not installed' });
                continue;
            }
            // zod-to-ts exports may be { zodToTs, createTypeAlias, printNode } or expose zodToTs as the default/function
            const zodToTsFunc = (typeof zodToTsMod === 'function') ? zodToTsMod : (zodToTsMod.zodToTs || zodToTsMod.default || null);
            const createTypeAlias = zodToTsMod.createTypeAlias || zodToTsMod.createAlias || null;
            if (!zodToTsFunc) {
                results.push({ exportName: n, typeName, warning: 'zod-to-ts has unexpected shape' });
                continue;
            }
            const res = zodToTsFunc(schemaObj, typeName, { nativeEnums: 'resolve' });
            let extra = '';
            if (res && res.store && typeof res.store === 'object') {
                for (const key of Object.keys(res.store)) {
                    const val = res.store[key];
                    if (Array.isArray(val)) {
                        for (const node of val) {
                            try { extra += (ts ? (ts.createPrinter().printNode(ts.EmitHint.Unspecified, node, ts.createSourceFile('x.ts', '', ts.ScriptTarget.Latest))) : '') + '\n\n'; } catch (e) {}
                        }
                    } else if (val) {
                        try { extra += (ts ? (ts.createPrinter().printNode(ts.EmitHint.Unspecified, val, ts.createSourceFile('x.ts', '', ts.ScriptTarget.Latest))) : '') + '\n\n'; } catch (e) {}
                    }
                }
            }
            // try to print alias via zod-to-ts helper if available
            let alias = '';
            try {
                if (typeof res.node !== 'undefined') {
                    const aliasNode = (createTypeAlias && typeof createTypeAlias === 'function') ? createTypeAlias(res.node, typeName) : res.node;
                    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
                    const resultFile = ts.createSourceFile('tmp.ts', '', ts.ScriptTarget.Latest);
                    alias = printer.printNode(ts.EmitHint.Unspecified, aliasNode, resultFile);
                }
            } catch (e) {}
            results.push({ exportName: n, typeName, alias, extra });
        } catch (err) {
            results.push({ exportName: n, error: String(err && err.stack || err) });
        }
    }
    console.log(JSON.stringify({ success: true, results }));
} catch (err) {
    console.error(JSON.stringify({ success: false, error: String(err && err.stack || err) }));
    process.exit(1);
}
