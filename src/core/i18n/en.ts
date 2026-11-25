// English UI strings, the source language (docs/ui.md § Rules). vi and ja follow in M6.
import type { DraftType } from '../draft';

export const en = {
	tane: 'Tane',
	openOverview: 'Open Tane overview',
	addTransaction: 'Add transaction',
	types: { expense: 'Expense', income: 'Income', transfer: 'Transfer' } satisfies Record<DraftType, string>,
	amount: 'Amount',
	wallet: 'Wallet',
	toWallet: 'To wallet',
	category: 'Category',
	date: 'Date',
	merchant: 'Merchant',
	note: 'Note',
	choose: 'Choose',
	save: 'Save',
	pickWallet: 'Choose a wallet',
	pickCategory: 'Choose a category',
	noNotes: (folder: string) => `Nothing here yet: add notes in ${folder}`,
	notSavedYet: (summary: string) => `Not saved yet (M1): ${summary}`,
	period: (key: string) => `Period ${key}`,
	daysLeft: (left: number, days: number) => `${left} of ${days} days left`,
	statusBar: (left: number) => `Tane · ${left} days left`,
	unknownWidget: (name: string) => `Unknown Tane widget: ${name}`,
};
