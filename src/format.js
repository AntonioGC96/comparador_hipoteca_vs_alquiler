import { localeForLanguage } from "./i18n.js";

export function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function isPresentNumber(value) {
  return Number.isFinite(parseNumber(value));
}

export function formatNumber(value, maximumFractionDigits = 2, language = "en") {
  if (!Number.isFinite(value)) {
    return "";
  }
  return new Intl.NumberFormat(localeForLanguage(language), {
    maximumFractionDigits
  }).format(value);
}

export function formatInputNumber(value) {
  if (!Number.isFinite(value)) {
    return "";
  }
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return String(rounded);
}

export function formatMoney(value, language = "en") {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${formatNumber(value, 2, language)} EUR`;
}

export function formatCompactMoney(value, language = "en") {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${new Intl.NumberFormat(localeForLanguage(language), {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value)} EUR`;
}

export function formatPercent(value, language = "en") {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `${formatNumber(value, 2, language)}%`;
}
