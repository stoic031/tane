// Minimal runtime stand-in for the `obsidian` package in unit tests.
// The real package ships only types. Add a fake here only when a test of
// src/data or src/ui needs it; keep business logic in src/core/ so it needs none.

export class Plugin {}
export class ItemView {}
export class PluginSettingTab {}
export class Setting {}
export class Notice {
	constructor(public message: string) {}
}
export class TFile {
	path = '';
	basename = '';
	extension = 'md';
}
export function normalizePath(p: string): string {
	return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}
