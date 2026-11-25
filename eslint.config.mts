import obsidianmd from 'eslint-plugin-obsidianmd';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'scripts',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'vitest.config.ts',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
		'test',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json', '.svelte'],
			},
		},
	},
	// Obsidian's review rules for all TypeScript sources.
	...obsidianmd.configs.recommended,
	// Svelte components: Svelte's recommended rules, TypeScript inside <script lang="ts">.
	...svelte.configs.recommended.map((c) => ({ ...c, files: c.files ?? ['**/*.svelte', '**/*.svelte.ts'] })),
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
				projectService: true,
				extraFileExtensions: ['.svelte'],
			},
		},
		rules: {
			// Never render HTML strings: transaction text comes from user-editable files.
			'svelte/no-at-html-tags': 'error',
		},
	},
);
