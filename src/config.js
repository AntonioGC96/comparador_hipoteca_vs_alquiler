export const STORAGE_KEY = "rent-vs-buy-calculator-state-v1";

export const BASIC_FIELDS = [
  "homePrice",
  "mortgageRate",
  "mortgageYears",
  "monthlyRent",
  "investmentReturn"
];

export const ADVANCED_DEFAULTS = {
  generalInflation: 3,
  homeInflation: 3,
  mortgagePercent: 80,
  acquisitionCosts: 3,
  maintenance: 2,
  propertyTax: 1,
  insurance: 0.5,
  rentInflation: 3,
  returnsStdDev: 17.5,
  monteCarloSimulations: 1000,
  monteCarloSeed: 12345
};

export const COST_FIELDS = {
  acquisitionCosts: {
    label: "Other acquisition costs",
    defaultPercent: 3,
    yearly: false
  },
  maintenance: {
    label: "Maintenance yearly expenses",
    defaultPercent: 2,
    yearly: true
  },
  propertyTax: {
    label: "Property yearly taxes",
    defaultPercent: 1,
    yearly: true
  },
  insurance: {
    label: "Insurance and other yearly costs",
    defaultPercent: 0.5,
    yearly: true
  }
};

export const PERCENTILE_LEVELS = {
  p024: 0.024,
  p159: 0.159,
  p50: 0.5,
  p841: 0.841,
  p976: 0.976
};
