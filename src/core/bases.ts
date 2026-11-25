// Ready-made .base files Tane creates once in the root folder (docs/ui.md § Generated bases).
// Bases filter expressions: https://help.obsidian.md/bases/syntax

const COLUMNS = ['date', 'type', 'wallet', 'amount', 'currency', 'category', 'merchant', 'note', 'amount_base'];

function base(folder: string, extra: string[], ledgerRange: 'period' | 'all', tableName: string): string {
	const filters = [`file.inFolder("${folder}")`, ...extra].map((f) => `    - '${f}'`).join('\n');
	return `filters:
  and:
${filters}
views:
  - type: tane-ledger
    name: Ledger
    range: ${ledgerRange}
  - type: table
    name: ${tableName}
    order:
${COLUMNS.map((c) => `      - ${c}`).join('\n')}
    sort:
      - property: date
        direction: DESC
    summaries:
      amount_base: Sum
`;
}

/** File name (without folder) → content. `transactionsFolder` is the vault path of transactions/. */
export function generatedBases(transactionsFolder: string): Record<string, string> {
	return {
		'This period.base': base(transactionsFolder, [], 'period', 'Table'),
		'By wallet.base': base(transactionsFolder, [], 'all', 'By wallet').replace('    sort:', '    groupBy:\n      property: wallet\n      direction: ASC\n    sort:'),
		'To review.base': base(transactionsFolder, ['review == true'], 'all', 'To review'),
	};
}
