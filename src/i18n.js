const translations = {
  en: {
    documentTitle: "Rent vs Buy Mortgage Calculator",
    chartEyebrow: "Rent vs buy",
    chartTitle: "Net worth projection",
    amountTypeAria: "Amount type",
    nominal: "Nominal",
    real: "Real",
    nominalLower: "nominal",
    realLower: "real",
    chartDescription: "Line chart comparing buyer and renter net worth over time.",
    emptyState: "Enter the basic options to compute the projection.",
    loadingReturns: "Computing returns distribution simulation",
    controlsEyebrow: "Inputs",
    controlsTitle: "Mortgage decision",
    language: "Language",
    homePrice: "Home price",
    mortgageTae: "Mortgage TAE interest rate",
    mortgageYears: "Mortgage years",
    yearsUnit: "years",
    monthlyRent: "Monthly rent",
    investmentReturns: "Investment returns",
    uncertainReturns: "Switch to uncertain portfolio returns",
    returnsStdDev: "Returns standard deviation",
    buildingType: "New building or resale",
    newBuilding: "New building",
    resale: "Resale",
    advancedOptions: "Advanced options",
    resetAdvancedOptions: "Return to default advanced options",
    resetConfirmation:
      "Return advanced options to their defaults? This will wipe out manually specified advanced data.",
    generalInflation: "General inflation",
    homeInflation: "Home price inflation percentage",
    mortgageAmount: "Amount of the mortgage",
    taxesHome: "Taxes over home price",
    acquisitionCostsHome: "Other acquisition costs over home price",
    maintenanceHome: "Maintenance yearly expenses over home price",
    propertyTaxHome: "Property yearly taxes over home price",
    insuranceHome: "Insurance and other yearly costs over home price",
    rentInflation: "Rent inflation percentage",
    rentDeposit: "Rent deposit",
    monteCarloSimulation: "Monte Carlo simulation",
    simulations: "Simulations",
    runsUnit: "runs",
    randomSeed: "Random seed",
    seedUnit: "seed",
    status: "Status",
    waitingInputs: "Waiting for required inputs",
    monthlyMortgage: "Monthly mortgage",
    buyerNetWorth: "{mode} buyer net worth",
    renterNetWorth: "{mode} renter net worth",
    higherFinalValue: "Higher final value",
    buying: "Buying",
    renting: "Renting",
    mortgageAmountSummary: "Mortgage amount",
    downPayment: "Down payment",
    mortgageShare: "Mortgage share",
    yearShort: "y",
    year: "Year {year}",
    tooltipValues: "{mode} values",
    tooltipValuesWithSimulations: "{mode} values, {count} simulations",
    percentile: "{value} percentile"
  },
  es: {
    documentTitle: "Calculadora de alquilar o comprar con hipoteca",
    chartEyebrow: "Alquilar vs comprar",
    chartTitle: "Proyecci\u00f3n de patrimonio neto",
    amountTypeAria: "Tipo de importe",
    nominal: "Nominal",
    real: "Real",
    nominalLower: "nominal",
    realLower: "real",
    chartDescription:
      "Gr\u00e1fica de l\u00edneas que compara el patrimonio neto al comprar y al alquilar a lo largo del tiempo.",
    emptyState: "Introduce las opciones b\u00e1sicas para calcular la proyecci\u00f3n.",
    loadingReturns: "Calculando la simulaci\u00f3n de la distribuci\u00f3n de rentabilidades",
    controlsEyebrow: "Datos",
    controlsTitle: "Decisi\u00f3n hipotecaria",
    language: "Idioma",
    homePrice: "Precio de la vivienda",
    mortgageTae: "Tipo de inter\u00e9s TAE de la hipoteca",
    mortgageYears: "A\u00f1os de hipoteca",
    yearsUnit: "a\u00f1os",
    monthlyRent: "Alquiler mensual",
    investmentReturns: "Rentabilidad de la inversi\u00f3n",
    uncertainReturns: "Cambiar a rentabilidades de inversión inciertas",
    returnsStdDev: "Desviaci\u00f3n t\u00edpica de rentabilidades",
    buildingType: "Obra nueva o segunda mano",
    newBuilding: "Obra nueva",
    resale: "Segunda mano",
    advancedOptions: "Opciones avanzadas",
    resetAdvancedOptions: "Restaurar opciones avanzadas por defecto",
    resetConfirmation:
      "\u00bfRestaurar las opciones avanzadas a sus valores por defecto? Esto borrar\u00e1 los datos avanzados especificados manualmente.",
    generalInflation: "Inflaci\u00f3n general",
    homeInflation: "Porcentaje de inflaci\u00f3n del precio de la vivienda",
    mortgageAmount: "Importe de la hipoteca",
    taxesHome: "Impuestos sobre el precio de la vivienda",
    acquisitionCostsHome:
      "Otros costes de adquisici\u00f3n sobre el precio de la vivienda",
    maintenanceHome:
      "Gastos anuales de mantenimiento sobre el precio de la vivienda",
    propertyTaxHome:
      "Impuestos anuales de propiedad sobre el precio de la vivienda",
    insuranceHome:
      "Seguro y otros costes anuales sobre el precio de la vivienda",
    rentInflation: "Porcentaje de inflaci\u00f3n del alquiler",
    rentDeposit: "Fianza del alquiler",
    monteCarloSimulation: "Simulaci\u00f3n de Monte Carlo",
    simulations: "Simulaciones",
    runsUnit: "sim.",
    randomSeed: "Semilla aleatoria",
    seedUnit: "semilla",
    status: "Estado",
    waitingInputs: "Esperando los datos obligatorios",
    monthlyMortgage: "Hipoteca mensual",
    buyerNetWorth: "Patrimonio del comprador {mode}",
    renterNetWorth: "Patrimonio del inquilino {mode}",
    higherFinalValue: "Mayor valor final",
    buying: "Comprar",
    renting: "Alquilar",
    mortgageAmountSummary: "Importe de la hipoteca",
    downPayment: "Entrada",
    mortgageShare: "Porcentaje hipotecado",
    yearShort: "a",
    year: "A\u00f1o {year}",
    tooltipValues: "valores {mode}",
    tooltipValuesWithSimulations: "valores {mode}, {count} simulaciones",
    percentile: "percentil {value}"
  }
};

export function normalizeLanguage(language) {
  return language === "es" ? "es" : "en";
}

export function t(language, key, replacements = {}) {
  const normalized = normalizeLanguage(language);
  const template = translations[normalized][key] ?? translations.en[key] ?? key;
  return Object.entries(replacements).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}

export function localeForLanguage(language) {
  return normalizeLanguage(language) === "es" ? "es-ES" : "en-US";
}

export function percentileLabel(language, value) {
  const displayValue = new Intl.NumberFormat(localeForLanguage(language), {
    maximumFractionDigits: 1
  }).format(value);
  return t(language, "percentile", { value: displayValue });
}

export function applyTranslations(root, language) {
  document.documentElement.lang = normalizeLanguage(language);
  document.title = t(language, "documentTitle");

  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(language, element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(language, element.dataset.i18nAriaLabel));
  });
}
