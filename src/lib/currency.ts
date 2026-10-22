export type CurrencyCode =
  | 'RUB'
  | 'USD'
  | 'EUR'
  | 'AZN'
  | 'TRY'
  | 'GBP'
  | 'AED'
  | 'KZT'
  | 'CNY'
  | 'GEL';

export type CurrencyInfo = {
  code: CurrencyCode;
  title: string;
  symbol: string;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'RUB', title: 'Российский рубль', symbol: '₽' },
  { code: 'USD', title: 'Доллар США', symbol: '$' },
  { code: 'EUR', title: 'Евро', symbol: '€' },
  { code: 'AZN', title: 'Азербайджанский манат', symbol: '₼' },
  { code: 'TRY', title: 'Турецкая лира', symbol: '₺' },
  { code: 'GBP', title: 'Фунт стерлингов', symbol: '£' },
  { code: 'AED', title: 'Дирхам ОАЭ', symbol: 'د.إ' },
  { code: 'KZT', title: 'Тенге', symbol: '₸' },
  { code: 'CNY', title: 'Юань', symbol: '¥' },
  { code: 'GEL', title: 'Лари', symbol: '₾' },
];

export const DEFAULT_BASE_CURRENCY: CurrencyCode = 'RUB';

/** 1 USD = X units of currency (fallback if сеть недоступна) */
export const FALLBACK_USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.89,
  GBP: 0.75,
  RUB: 82,
  AZN: 1.7,
  TRY: 49.6,
  AED: 3.67,
  KZT: 449,
  CNY: 7.1,
  GEL: 2.7,
};

export type FxRates = {
  /** pivot: rates mean 1 USD = rate[code] */
  rates: Record<string, number>;
  updatedAt: string;
};

export function currencyInfo(code: string): CurrencyInfo {
  return (
    CURRENCIES.find((c) => c.code === code) ?? {
      code: code as CurrencyCode,
      title: code,
      symbol: code,
    }
  );
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> = FALLBACK_USD_RATES,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return Math.round(amount * 100) / 100;
  const fromRate = rates[from] ?? FALLBACK_USD_RATES[from as CurrencyCode];
  const toRate = rates[to] ?? FALLBACK_USD_RATES[to as CurrencyCode];
  if (!fromRate || !toRate) return Math.round(amount * 100) / 100;
  const inUsd = amount / fromRate;
  return Math.round(inUsd * toRate * 100) / 100;
}

export function formatMoneyAmount(
  amount: number,
  currency: string = DEFAULT_BASE_CURRENCY,
  opts?: { maximumFractionDigits?: number },
): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: opts?.maximumFractionDigits ?? 2,
    }).format(amount);
  } catch {
    const info = currencyInfo(currency);
    return `${amount.toLocaleString('ru-RU')} ${info.symbol}`;
  }
}

export async function fetchUsdRates(): Promise<FxRates> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
  const json = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  if (json.result !== 'success' || !json.rates) {
    throw new Error('FX payload invalid');
  }
  const rates: Record<string, number> = { ...FALLBACK_USD_RATES };
  for (const c of CURRENCIES) {
    if (typeof json.rates[c.code] === 'number') {
      rates[c.code] = json.rates[c.code];
    }
  }
  rates.USD = 1;
  return { rates, updatedAt: new Date().toISOString() };
}
