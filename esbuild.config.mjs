import esbuild from 'esbuild';
import esbuildSvelte from 'esbuild-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import process from 'process';
import { builtinModules } from 'node:module';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Build src/main.ts → main.js (bundled, CommonJS, as Obsidian expects).
// `npm run dev`   = watch mode with inline sourcemaps.
// `npm run build` = one production build, minified, then exit.
//
// If TANE_VAULT is set (put it in .envrc.local, see README), every build also
// copies main.js, manifest.json and styles.css into
// $TANE_VAULT/.obsidian/plugins/tane/ so the dev vault always has the latest
// build. Use a TEST vault with fake data, never the real finance vault.

const prod = process.argv[2] === 'production';
const vault = process.env.TANE_VAULT;
const PLUGIN_ID = 'tane';

const copyToVault = {
	name: 'copy-to-vault',
	setup(build) {
		build.onEnd(async (result) => {
			if (!vault || result.errors.length > 0) return;
			const dest = path.join(vault, '.obsidian', 'plugins', PLUGIN_ID);
			await mkdir(dest, { recursive: true });
			for (const f of ['main.js', 'manifest.json', 'styles.css']) {
				if (existsSync(f)) await copyFile(f, path.join(dest, f));
			}
			console.log(`[tane] copied build to ${dest}`);
		});
	},
};

const context = await esbuild.context({
	banner: {
		js: '/* Tane: bundled by esbuild. Source: src/ */',
	},
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtinModules,
	],
	format: 'cjs',
	// es2018 keeps the bundle readable by older iOS WebKit; raise only on purpose.
	target: 'es2018',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: 'main.js',
	minify: prod,
	plugins: [
		esbuildSvelte({
			// As in Obsidian's guide "Use Svelte in your plugin": component styles are injected at runtime.
			compilerOptions: { css: 'injected' },
			preprocess: sveltePreprocess(),
		}),
		copyToVault,
	],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
