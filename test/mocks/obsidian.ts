// Minimal runtime stand-in for the `obsidian` package in unit tests.
// The real package ships only types. Data-layer tests use test/data/fake-app.ts on top of this.

type Handler = (...args: unknown[]) => unknown;

export class Events {
	private handlers = new Map<string, Set<Handler>>();
	on(name: string, cb: Handler) {
		if (!this.handlers.has(name)) this.handlers.set(name, new Set());
		this.handlers.get(name)!.add(cb);
		return { name, cb, source: this };
	}
	offref(ref: { name: string; cb: Handler }) {
		this.handlers.get(ref.name)?.delete(ref.cb);
	}
	trigger(name: string, ...args: unknown[]) {
		for (const cb of this.handlers.get(name) ?? []) cb(...args);
	}
}

export class Component {
	private cleanups: (() => void)[] = [];
	registerEvent(ref: { name: string; cb: Handler; source: Events }) {
		this.cleanups.push(() => ref.source.offref(ref));
	}
	register(cb: () => void) {
		this.cleanups.push(cb);
	}
	unload() {
		for (const c of this.cleanups.splice(0)) c();
	}
}

export class Plugin extends Component {}
export class ItemView extends Component {}
export class Modal {}
export class FuzzySuggestModal {}
export class PluginSettingTab {}
export class Setting {}
export class MarkdownRenderChild extends Component {}

export const notices: string[] = [];
export class Notice {
	constructor(public message: string) {
		notices.push(message);
	}
}

export class TAbstractFile {
	constructor(public path: string) {}
	get name() {
		return this.path.split('/').pop() ?? '';
	}
}
export class TFile extends TAbstractFile {
	stat = { mtime: 0, ctime: 0, size: 0 };
	get basename() {
		return this.name.replace(/\.[^.]+$/, '');
	}
	get extension() {
		return this.name.includes('.') ? this.name.split('.').pop()! : '';
	}
}
export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
}

export function normalizePath(p: string): string {
	return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

/** Tests run debounced work immediately. */
export function debounce<T extends unknown[]>(cb: (...a: T) => unknown) {
	const f = (...a: T) => void cb(...a);
	f.cancel = () => f;
	f.run = () => undefined;
	return f;
}

export async function requestUrl(_: unknown): Promise<unknown> {
	throw new Error('requestUrl is not available in tests; inject a fetcher');
}
