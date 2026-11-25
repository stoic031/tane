// Plugin settings (data.json). Spec: docs/data-model.md § Settings. Pure so calculations can take it.
import type { Currency } from './types';

export type Language = 'auto' | 'en' | 'vi' | 'ja';

export interface TaneSettings {
	rootFolder: string;
	/** Pay-cycle start day, 1..28. */
	periodStartDay: number;
	baseCurrency: string;
	secondCurrency: string;
	currencies: Currency[];
	/** Overall budget per period in the base currency; undefined = sum of category budgets. */
	totalBudget?: number;
	budgetWarnPct: number;
	defaultRemindDays: number;
	/** Wallet name preselected when there is no last entry. */
	defaultWallet?: string;
	/** Category used for transfer fees. */
	feeCategory?: string;
	language: Language;
	openOnStartup: boolean;
	/** 'none' = manual rates only; 'currency-api' = daily fetch (D-013). */
	fxProvider: 'none' | 'currency-api';
	schemaVersion: number;
	lastCatchUp?: string;
	lastFxFetch?: string;
}

export const DEFAULT_SETTINGS: TaneSettings = {
	rootFolder: 'Tane',
	periodStartDay: 1,
	baseCurrency: 'JPY',
	secondCurrency: 'VND',
	currencies: [
		{ code: 'JPY', symbol: '¥', decimals: 0 },
		{ code: 'VND', symbol: '₫', decimals: 0 },
	],
	budgetWarnPct: 80,
	defaultRemindDays: 3,
	language: 'auto',
	openOnStartup: false,
	fxProvider: 'none',
	schemaVersion: 1,
};

export function currencyOf(settings: Pick<TaneSettings, 'currencies'>, code: string): Currency {
	return settings.currencies.find((c) => c.code === code) ?? { code, symbol: code, decimals: 0 };
}
