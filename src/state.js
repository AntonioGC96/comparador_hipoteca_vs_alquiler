import { ADVANCED_DEFAULTS, BASIC_FIELDS, COST_FIELDS, STORAGE_KEY } from "./config.js";
import { formatInputNumber, parseNumber } from "./format.js";
import { normalizeLanguage } from "./i18n.js";

const advancedFieldNames = [
  "generalInflation",
  "homeInflation",
  "mortgagePercent",
  "taxes",
  "acquisitionCosts",
  "maintenance",
  "propertyTax",
  "insurance",
  "rentInflation",
  "rentDeposit",
  "returnsStdDev",
  "monteCarloSimulations",
  "monteCarloSeed"
];

export function createInitialState() {
  const manual = Object.fromEntries(advancedFieldNames.map((field) => [field, false]));
  const values = Object.fromEntries(advancedFieldNames.map((field) => [field, ""]));
  const modes = Object.fromEntries(Object.keys(COST_FIELDS).map((field) => [field, "percent"]));

  return {
    version: 1,
    basic: {
      homePrice: "",
      mortgageRate: "",
      mortgageYears: "",
      monthlyRent: "",
      investmentReturn: "",
      buildingType: "new"
    },
    advancedExpanded: false,
    uncertainReturns: false,
    language: "en",
    viewMode: "nominal",
    advanced: {
      manual,
      values,
      modes
    }
  };
}

export function loadState(storage = globalThis.localStorage) {
  const fallback = createInitialState();
  if (!storage) {
    return fallback;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    return mergeState(fallback, JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mergeState(base, loaded) {
  const state = createInitialState();
  state.version = base.version;
  state.basic = { ...state.basic, ...safeObject(loaded.basic) };
  state.advancedExpanded = Boolean(loaded.advancedExpanded);
  state.uncertainReturns = Boolean(loaded.uncertainReturns);
  state.language = normalizeLanguage(loaded.language);
  state.viewMode = loaded.viewMode === "real" ? "real" : "nominal";
  state.advanced.manual = {
    ...state.advanced.manual,
    ...safeObject(loaded.advanced?.manual)
  };
  state.advanced.values = {
    ...state.advanced.values,
    ...safeObject(loaded.advanced?.values)
  };
  state.advanced.modes = {
    ...state.advanced.modes,
    ...safeObject(loaded.advanced?.modes)
  };
  if (state.basic.buildingType !== "resale") {
    state.basic.buildingType = "new";
  }
  return state;
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function resetAdvanced(state) {
  const next = structuredClone(state);
  next.advancedExpanded = false;
  next.uncertainReturns = false;
  next.advanced.manual = Object.fromEntries(advancedFieldNames.map((field) => [field, false]));
  next.advanced.values = Object.fromEntries(advancedFieldNames.map((field) => [field, ""]));
  next.advanced.modes = Object.fromEntries(Object.keys(COST_FIELDS).map((field) => [field, "percent"]));
  return next;
}

export function hasRequiredBasicValues(state) {
  return BASIC_FIELDS.every((field) => {
    const value = parseNumber(state.basic[field]);
    if (field === "investmentReturn") {
      return Number.isFinite(value);
    }
    if (field === "mortgageRate" || field === "monthlyRent") {
      return Number.isFinite(value) && value >= 0;
    }
    return Number.isFinite(value) && value > 0;
  });
}

export function getAdvancedDefault(state, field) {
  if (field === "taxes") {
    return state.basic.buildingType === "resale" ? 8 : 10;
  }
  if (field === "rentDeposit") {
    const monthlyRent = parseNumber(state.basic.monthlyRent);
    return Number.isFinite(monthlyRent) ? monthlyRent : 0;
  }
  if (Object.prototype.hasOwnProperty.call(ADVANCED_DEFAULTS, field)) {
    return ADVANCED_DEFAULTS[field];
  }
  return 0;
}

export function getAdvancedValue(state, field) {
  if (!state.advanced.manual[field]) {
    return getAdvancedDefault(state, field);
  }
  const value = parseNumber(state.advanced.values[field]);
  return Number.isFinite(value) ? value : getAdvancedDefault(state, field);
}

export function setAdvancedValue(state, field, rawValue) {
  const next = structuredClone(state);
  next.advanced.values[field] = rawValue;
  next.advanced.manual[field] = String(rawValue).trim() !== "";
  return next;
}

export function setBasicValue(state, field, rawValue) {
  const next = structuredClone(state);
  next.basic[field] = rawValue;
  return next;
}

export function setBuildingType(state, buildingType) {
  const next = structuredClone(state);
  next.basic.buildingType = buildingType === "resale" ? "resale" : "new";
  return next;
}

export function setLanguage(state, language) {
  const next = structuredClone(state);
  next.language = normalizeLanguage(language);
  return next;
}

export function setCostMode(state, field, mode) {
  const next = structuredClone(state);
  const current = getCostValue(state, field);
  next.advanced.modes[field] = mode === "amount" ? "amount" : "percent";
  if (next.advanced.manual[field]) {
    next.advanced.values[field] = formatInputNumber(
      next.advanced.modes[field] === "amount" ? current.amount : current.percent
    );
  }
  return next;
}

export function getCostValue(state, field) {
  const base = Math.max(0, parseNumber(state.basic.homePrice) || 0);
  const mode = state.advanced.modes[field] === "amount" ? "amount" : "percent";
  const defaultPercent = COST_FIELDS[field]?.defaultPercent ?? 0;

  if (!state.advanced.manual[field]) {
    return {
      mode,
      percent: defaultPercent,
      amount: (base * defaultPercent) / 100,
      manual: false
    };
  }

  const raw = parseNumber(state.advanced.values[field]);
  const value = Number.isFinite(raw) ? raw : 0;
  if (mode === "amount") {
    return {
      mode,
      amount: value,
      percent: base > 0 ? (value / base) * 100 : 0,
      manual: true
    };
  }

  return {
    mode,
    percent: value,
    amount: (base * value) / 100,
    manual: true
  };
}

export function getDisplayValue(state, field) {
  return state.advanced.manual[field]
    ? state.advanced.values[field]
    : formatInputNumber(getAdvancedDefault(state, field));
}
