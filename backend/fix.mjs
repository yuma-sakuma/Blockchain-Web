import fs from 'fs';
import { execSync } from 'child_process';
const pkgPath = './package.json';
const pkgStr = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgStr);
pkg.dependencies['@nestjs/serve-static'] = '^11.0.2';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('package.json updated. Running npm install...');
try {
  const out = execSync('npm install --legacy-peer-deps', { encoding: 'utf8' });
  console.log('Success:', out.substring(0, 1000));
} catch (e) {
  console.error('Error:', e.stdout ? e.stdout.substring(0, 1000) : e.message);
}
