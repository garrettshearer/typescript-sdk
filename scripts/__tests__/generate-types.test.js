const { z } = require('zod');
const { zodToTs, createTypeAlias, printNode } = require('zod-to-ts');
const ts = require('typescript');

test('zod-to-ts resolves native enums and lazy recursive types', () => {
    const ColorEnum = { RED: 'red', GREEN: 'green', BLUE: 'blue' };
    const color = z.nativeEnum(ColorEnum);

    const colorResult = zodToTs(color, 'Color', { nativeEnums: 'resolve' });
    expect(colorResult).toBeDefined();
    // print the main alias node as a fallback; some zod-to-ts versions inline enums as unions
    const colorAlias = createTypeAlias(colorResult.node, 'Color');
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const resultFile = ts.createSourceFile('tmp.ts', '', ts.ScriptTarget.Latest);
    const printedAlias = printer.printNode(ts.EmitHint.Unspecified, colorAlias, resultFile);
    expect(printedAlias).toBeTruthy();
    // safety: ensure the generated alias is reasonably small and doesn't embed Zod internals
    expect(printedAlias.length).toBeLessThan(2000);
    expect(printedAlias).toMatch(/type\s+Color/);
    expect(printedAlias).not.toMatch(/Zod|z\./);

    const NodeSchema = z.object({ value: z.string(), next: z.lazy(() => NodeSchema).optional() });
    const nodeResult = zodToTs(NodeSchema, 'Node');
    const nodeAlias = createTypeAlias(nodeResult.node, 'Node');
    const printed = printer.printNode(ts.EmitHint.Unspecified, nodeAlias, resultFile);
    expect(printed).toMatch(/type\s+Node/);
    expect(printed).toMatch(/next\??:\s*Node/);
});
