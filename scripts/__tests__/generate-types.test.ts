import { z } from 'zod';
import { zodToTs, createTypeAlias, printNode } from 'zod-to-ts';
import ts from 'typescript';

describe('zod-to-ts safety checks', () => {
    test('resolves native enums and lazy recursive types', () => {
        const ColorEnum = { RED: 'red', GREEN: 'green', BLUE: 'blue' } as const;
        const color = z.nativeEnum(ColorEnum as unknown as any);

        const colorResult = zodToTs(color, 'Color', { nativeEnums: 'resolve' });
        // store should contain enum nodes when nativeEnums are resolved
        expect(colorResult).toBeDefined();
        if (colorResult.store) {
            const entries = Object.values(colorResult.store).flat();
            const printed = entries.map((n: any) => {
                try { return printNode(n); } catch (_) { return ''; }
            }).join('\n');
            expect(printed).toMatch(/enum\s+Color|type\s+Color/);
        }

        // lazy recursive type
        const NodeSchema: any = z.object({ value: z.string(), next: z.lazy(() => NodeSchema).optional() });
        const nodeResult = zodToTs(NodeSchema, 'Node');
        const nodeAlias = createTypeAlias(nodeResult.node, 'Node');
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const resultFile = ts.createSourceFile('tmp.ts', '', ts.ScriptTarget.Latest);
        const printed = printer.printNode(ts.EmitHint.Unspecified, nodeAlias, resultFile);
        expect(printed).toMatch(/type\s+Node/);
        expect(printed).toMatch(/next\??:\s*Node/);
    });
});
