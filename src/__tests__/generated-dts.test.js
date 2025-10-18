const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

describe('generated d.ts content', () => {
    jest.setTimeout(120000);

    test('server index.d.ts uses concise result aliases', () => {
        // run build (which also runs the generator via package.json build script)
        const res = spawnSync('npm', ['run', 'build'], { cwd: root, shell: true, stdio: 'inherit' });
        expect(res.status).toBe(0);

        const dtsPath = path.join(root, 'dist', 'esm', 'server', 'index.d.ts');
        expect(fs.existsSync(dtsPath)).toBe(true);
        const txt = fs.readFileSync(dtsPath, 'utf8');

        // look for concise aliases instead of large inline zod types
        expect(txt).toMatch(/ping\(\):\s*Promise<EmptyResult>/);
        expect(txt).toMatch(/createMessage\([^\)]*\):\s*Promise<CreateMessageResult>/);
        expect(txt).toMatch(/listRoots\([^\)]*\):\s*Promise<ListRootsResult>/);
    });
});
