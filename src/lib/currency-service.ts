export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  country: string;
  defaultRateToIdr: number;
}

export const TOP_10_CURRENCIES: CurrencyInfo[] = [
  {
    code: "IDR",
    name: "Rupiah Indonesia",
    symbol: "Rp",
    country: "Indonesia",
    defaultRateToIdr: 1,
  },
  {
    code: "USD",
    name: "United States Dollar",
    symbol: "$",
    country: "Amerika Serikat",
    defaultRateToIdr: 16250,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    country: "Uni Eropa",
    defaultRateToIdr: 17500,
  },
  {
    code: "GBP",
    name: "British Pound Sterling",
    symbol: "£",
    country: "Britania Raya",
    defaultRateToIdr: 20800,
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    country: "Jepang",
    defaultRateToIdr: 105,
  },
  {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    country: "Singapura",
    defaultRateToIdr: 12200,
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    country: "Australia",
    defaultRateToIdr: 10500,
  },
  {
    code: "CNY",
    name: "Chinese Yuan Renminbi",
    symbol: "¥",
    country: "Tiongkok",
    defaultRateToIdr: 2250,
  },
  {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    country: "Swiss",
    defaultRateToIdr: 18200,
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    country: "Kanada",
    defaultRateToIdr: 11600,
  },
];

const FUNCTIONAL_CURRENCY_STORAGE_KEY = "altcycles_functional_currency";
const EXCHANGE_RATES_STORAGE_KEY = "altcycles_exchange_rates_to_idr";

export function getFunctionalCurrency(): string {
  try {
    if (typeof window !== "undefined") {
      return localStorage.getItem(FUNCTIONAL_CURRENCY_STORAGE_KEY) || "IDR";
    }
  } catch {
    // Abaikan error SSR / storage
  }
  return "IDR";
}

export function setFunctionalCurrency(code: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(FUNCTIONAL_CURRENCY_STORAGE_KEY, code.toUpperCase());
    }
  } catch {
    // Abaikan error
  }
}

export function getExchangeRatesToIdr(): Record<string, number> {
  const initial: Record<string, number> = {};
  for (const c of TOP_10_CURRENCIES) {
    initial[c.code] = c.defaultRateToIdr;
  }
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(EXCHANGE_RATES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, number>;
        return { ...initial, ...parsed, IDR: 1 };
      }
    }
  } catch {
    // Fallback initial
  }
  return initial;
}

export function saveExchangeRatesToIdr(rates: Record<string, number>): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        EXCHANGE_RATES_STORAGE_KEY,
        JSON.stringify({ ...rates, IDR: 1 }),
      );
    }
  } catch {
    // Abaikan error
  }
}
