// Fails when src/ uses patterns that Obsidian's plugin review rejects or that
// break Tane's layer rules (docs/architecture.md, docs/obsidian-rules.md).
// Runs as part of `npm run check`. Checks .ts and .svelte files.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ALL = [
	{ re: /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(/, why: 'Never build DOM from HTML strings (XSS). Use Svelte markup or createEl.' },
	{ re: /\{@html\b/, why: 'No {@html} in Svelte: transaction text comes from user-editable files.' },
	// Fixed inline styles are rejected by review. Computed values (a drag offset) are fine:
	// el.style.transform = `translateY(${y}px)` or style:transform={...} in Svelte.
	{ re: /\.style\.[a-zA-Z]+\s*=\s*(['"][^'"]+['"]|`[^`$]+`)|\.style\.cssText\s*=|\.setAttribute\(\s*['"]style['"]/, why: 'No fixed inline styles from JS. Put them in a <style> block or styles.css.' },
	{ re: /\sstyle="[^"{]*"/, why: 'No fixed style="..." attributes in markup. Use a class.' },
	{ re: /\bfetch\s*\(|axios/, why: 'Use requestUrl from obsidian, not fetch/axios (mobile and CORS).' },
	{ re: /require\(\s*['"](fs|path|electron|child_process|os)['"]\s*\)|from\s+['"](node:)?(fs|path|electron|child_process|os)['"]/, why: 'No Node/Electron modules: the plugin must run on iPhone.' },
	{ re: /\(\?<[=!]/, why: 'No regex lookbehind: breaks on older iOS.' },
	{ re: /\bvault\.delete\s*\(/, why: 'Use app.fileManager.trashFile so deletions go to the trash.' },
	{ re: /\bconsole\.log\s*\(/, why: 'No console.log in shipped code. Use the logger in src/data/log.ts.' },
];

// src/core must stay pure so it is trivially testable.
const CORE = [
	{ re: /from\s+['"]obsidian['"]/, why: 'src/core must not import obsidian.' },
	{ re: /from\s+['"]svelte/, why: 'src/core must not import svelte.' },
	{ re: /\bnew Date\(\s*\)|Date\.now\(\)/, why: 'src/core must not read the clock. Take today as a YYYY-MM-DD string.' },
];

// src/ui talks to the vault only through src/data.
const UI = [
	{ re: /\.vault\.(create|modify|process|append|rename)\b|fileManager\.(processFrontMatter|trashFile|renameFile)/, why: 'UI must not write files directly. Call a function in src/data/writer.ts.' },
];

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const p = path.join(dir, name);
		if (statSync(p).isDirectory()) return walk(p);
		return p.endsWith('.ts') || p.endsWith('.svelte') ? [p] : [];
	});
}

let failures = 0;
for (const file of walk('src')) {
	const rules = [...ALL];
	if (file.startsWith(path.join('src', 'core'))) rules.push(...CORE);
	if (file.startsWith(path.join('src', 'ui'))) rules.push(...UI);
	const lines = readFileSync(file, 'utf8').split('\n');
	lines.forEach((line, i) => {
		if (/^\s*(\/\/|\*|<!--)/.test(line)) return; // skip comment lines
		for (const r of rules) {
			if (r.re.test(line)) {
				console.error(`${file}:${i + 1}: ${r.why}\n    ${line.trim()}`);
				failures++;
			}
		}
	});
}

if (failures > 0) {
	console.error(`\ncheck-forbidden: ${failures} problem(s).`);
	process.exit(1);
}
console.log('check-forbidden: ok');
