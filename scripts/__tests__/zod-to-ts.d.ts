declare module 'zod-to-ts' {
    import ts from 'typescript';
    import { ZodTypeAny } from 'zod';
    export function zodToTs(schema: ZodTypeAny, id: string, opts?: any): { node: ts.Node, store?: Record<string, any> };
    export function createTypeAlias(node: ts.Node, id: string): ts.Node;
    export function printNode(node: ts.Node): string;
}
