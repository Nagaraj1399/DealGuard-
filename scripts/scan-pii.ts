import fs from 'fs';
import path from 'path';

// PII & Secret Scanner script
const ROOT_DIR = process.cwd();
const ALLOWLIST_FILES = ['.git', '.aistudio', 'node_modules', 'dist', '.env.example', 'dev.db.json'];

const REAL_PHONE_REGEX = /(?<!\d)(?:\+?1[-. ]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})(?!\d)/g;
const SECRET_REGEX = /(AIza[0-9A-Za-z-_]{35}|ghp_[0-9a-zA-Z]{36}|gsk_[0-9a-zA-Z]{40,}|sk-[0-9a-zA-Z]{32,})/g;

let violations: string[] = [];

function scanDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (ALLOWLIST_FILES.includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');

      const secretMatches = content.match(SECRET_REGEX);
      if (secretMatches) {
        violations.push(`Secret pattern detected in ${fullPath}: ${secretMatches.join(', ')}`);
      }

      // Flag real US phone numbers while permitting synthetic 555-01xx fixture numbers
      const phoneMatches = [...content.matchAll(REAL_PHONE_REGEX)].filter(
        (m) => !(m[2] === '555' && m[3].startsWith('01'))
      );
      if (phoneMatches.length > 0 && !fullPath.includes('scan-pii')) {
        violations.push(`Potential real phone number detected in ${fullPath}`);
      }
    }
  }
}

scanDirectory(ROOT_DIR);

if (violations.length > 0) {
  console.error('❌ PII / Secret Scan FAILED:');
  violations.forEach((v) => console.error('  - ' + v));
  process.exit(1);
} else {
  console.log('✅ PII & Secret scan PASSED: Zero leaked production secrets or unauthorized PII found.');
}
