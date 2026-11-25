// Fake vault generator for performance checks (docs/release.md § Test data). FAKE data only.
// Usage: node scripts/gen-vault.mjs <out-dir> [--count 4000] [--seed 42] [--start 2025-12-01]
// Writes <out-dir>/Tane/... in the format of docs/data-model.md. Output is not committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const out = args[0];
if (!out || out.startsWith('--')) {
	console.error('Usage: node scripts/gen-vault.mjs <out-dir> [--count N] [--seed S] [--start YYYY-MM-DD]');
	process.exit(1);
}
const opt = (name, def) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : def;
};
const count = Number(opt('count', 4000));
let seed = Number(opt('seed', 42)) >>> 0;
const start = opt('start', '2025-12-01');

// mulberry32: small, fixed-seed PRNG so output is reproducible.
function rand() {
	seed = (seed + 0x6d2b79f5) >>> 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const id = (prefix) => prefix + '-' + Array.from({ length: 10 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)]).join('');

const root = path.join(out, 'Tane');
function note(rel, props) {
	const p = path.join(root, rel);
	mkdirSync(path.dirname(p), { recursive: true });
	const lines = ['---'];
	for (const [k, v] of Object.entries(props)) {
		if (v === undefined) continue;
		if (Array.isArray(v)) lines.push(`${k}:`, ...v.map((x) => `  - ${JSON.stringify(x)}`));
		else lines.push(`${k}: ${typeof v === 'string' && v.startsWith('[[') ? JSON.stringify(v) : v}`);
	}
	writeFileSync(p, lines.concat('---', '').join('\n'));
}
const L = (n) => `[[${n}]]`;

const wallets = { PayPay: 'JPY', Yucho: 'JPY', Cash: 'JPY', 'VN Bank': 'VND' };
for (const [name, currency] of Object.entries(wallets)) {
	note(`wallets/${name}.md`, { kind: 'basic', currency, opening_balance: currency === 'VND' ? 20000000 : 200000, opening_date: start });
}
const expenseCats = { 'Eating out': [500, 3000], Groceries: [800, 6000], Transport: [170, 1500], Shopping: [1000, 15000], Health: [500, 8000], Fun: [800, 6000] };
for (const name of Object.keys(expenseCats)) note(`categories/${name}.md`, { kind: 'expense', budget: 30000 });
note('categories/Salary.md', { kind: 'income' });
const merchants = ['Lawson', 'FamilyMart', '7-Eleven', 'Aeon', 'Uniqlo', 'JR East', 'Matsuya', 'Starbucks'];

const t0 = Date.parse(start + 'T00:00:00Z');
for (let i = 0; i < count; i++) {
	const date = new Date(t0 + Math.floor((i / count) * 365) * 86400000).toISOString().slice(0, 10);
	const [y, m] = date.split('-');
	const tid = id('TX');
	const salary = i % Math.max(1, Math.floor(count / 12)) === 0;
	const wallet = salary ? 'Yucho' : pick(['PayPay', 'PayPay', 'Cash', 'Yucho']);
	const cat = salary ? 'Salary' : pick(Object.keys(expenseCats));
	const [lo, hi] = expenseCats[cat] ?? [300000, 300000];
	const amount = Math.round(lo + rand() * (hi - lo));
	const created = `${date}T12:${String(i % 60).padStart(2, '0')}:00`;
	note(`transactions/${y}/${m}/${date} ${tid}.md`, {
		id: tid,
		date,
		type: salary ? 'income' : 'expense',
		wallet: L(wallet),
		amount,
		currency: 'JPY',
		category: L(cat),
		merchant: salary ? undefined : pick(merchants),
		fx_rate: 1,
		amount_base: amount,
		created,
		updated: created,
	});
}
mkdirSync(path.join(root, 'system'), { recursive: true });
writeFileSync(path.join(root, 'system', 'fx-rates.csv'), `date,pair,rate,source\n${start},JPYVND,175,manual\n`);
console.log(`Wrote ${count} fake transactions to ${root}`);
