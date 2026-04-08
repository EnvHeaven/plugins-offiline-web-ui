import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version ?? '0.0.0';

const out = join(root, 'src', 'web', 'environments', 'environment.ts');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `export const environment = {\n  uiVersion: '${version}',\n};\n`,
  'utf8',
);
console.log(`[gen-environment] uiVersion=${version} → ${out}`);
