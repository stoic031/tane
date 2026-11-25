import { describe, expect, it } from 'vitest';
import { convert, fxCsvLine, fxRowsFromApi, parseFxCsv, rateOn } from '../../src/core/fx';

const csv = `date,pair,rate,source
2026-11-01,JPYVND,170,manual
2026-11-20,JPYVND,175,api
2026-11-20,JPYUSD,0.0065,api
`;

describe('parseFxCsv', () => {
	it('reads rows and reports bad lines', () => {
		const { rows, problems } = parseFxCsv(csv + 'bad,line\n2026-13-01,JPYVND,1,api\n');
		expect(rows).toHaveLength(3);
		expect(problems).toHaveLength(2);
	});

	it('an empty file has no rows', () => {
		expect(parseFxCsv('').rows).toEqual([]);
	});
});

describe('rateOn', () => {
	const { rows } = parseFxCsv(csv);

	it('latest row not after the date', () => {
		expect(rateOn(rows, 'JPY', 'VND', '2026-11-19')).toBe(170);
		expect(rateOn(rows, 'JPY', 'VND', '2026-11-24')).toBe(175);
	});

	it('before the first row uses the first row', () => {
		expect(rateOn(rows, 'JPY', 'VND', '2026-01-01')).toBe(170);
	});

	it('reverse pair divides', () => {
		expect(rateOn(rows, 'VND', 'JPY', '2026-11-24')).toBeCloseTo(1 / 175, 12);
	});

	it('same currency is 1, unknown pair is undefined', () => {
		expect(rateOn(rows, 'JPY', 'JPY', '2026-11-24')).toBe(1);
		expect(rateOn(rows, 'JPY', 'EUR', '2026-11-24')).toBeUndefined();
	});

	it('a manual row wins over an api row on the same date', () => {
		const { rows: r } = parseFxCsv('date,pair,rate,source\n2026-11-20,JPYVND,180,manual\n2026-11-20,JPYVND,175,api\n');
		expect(rateOn(r, 'JPY', 'VND', '2026-11-20')).toBe(180);
	});
});

describe('convert', () => {
	const { rows } = parseFxCsv(csv);

	it('17,500,000 VND is 100,000 JPY at 175', () => {
		expect(convert(17_500_000, 'VND', 'JPY', '2026-11-24', rows, 'JPY')).toBeCloseTo(100_000, 6);
	});

	it('between two non-base currencies goes through the base', () => {
		expect(convert(1_750_000, 'VND', 'USD', '2026-11-24', rows, 'JPY')).toBeCloseTo(65, 6);
	});

	it('no rate → undefined', () => {
		expect(convert(1, 'EUR', 'JPY', '2026-11-24', rows, 'JPY')).toBeUndefined();
	});
});

describe('fxCsvLine', () => {
	it('round-trips through parseFxCsv', () => {
		const line = fxCsvLine({ date: '2026-11-26', pair: 'JPYVND', rate: 161.9, source: 'api' });
		expect(parseFxCsv('date,pair,rate,source\n' + line).rows[0]).toEqual({ date: '2026-11-26', pair: 'JPYVND', rate: 161.9, source: 'api' });
	});
});

describe('fxRowsFromApi', () => {
	const json = { date: '2026-11-25', jpy: { vnd: 161.89873612, usd: 0.0064, eur: 0.006 } };

	it('one api row per configured currency, skipping dates and pairs already present', () => {
		const existing = [{ date: '2026-11-25', pair: 'JPYUSD', rate: 0.0065, source: 'manual' as const }];
		expect(fxRowsFromApi(json, 'JPY', ['JPY', 'VND', 'USD'], existing)).toEqual([{ date: '2026-11-25', pair: 'JPYVND', rate: 161.89873612, source: 'api' }]);
	});

	it('bad payloads give no rows', () => {
		expect(fxRowsFromApi({}, 'JPY', ['VND'], [])).toEqual([]);
		expect(fxRowsFromApi({ date: 'x', jpy: { vnd: 1 } }, 'JPY', ['VND'], [])).toEqual([]);
	});
});
