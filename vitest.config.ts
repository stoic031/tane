import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The `obsidian` npm package ships types only, no runtime code.
// Tests that import it get the small fake in test/mocks/obsidian.ts.
// Prefer testing src/core/ (pure, no Obsidian imports) so mocks stay tiny.
export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'node',
	},
	resolve: {
		alias: {
			obsidian: fileURLToPath(new URL('./test/mocks/obsidian.ts', import.meta.url)),
		},
	},
});
