import { PERCENTILE_LEVELS } from "./config.js";
import { parseNumber } from "./format.js";
import {
  getAdvancedValue,
  getCostValue,
  hasRequiredBasicValues
} from "./state.js";

export function effectiveAnnualRateToMonthlyRate(annualPercent) {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
}

export function annualPercentToMonthlyGrowth(annualPercent) {
  return Math.pow(1 + annualPercent / 100, 1 / 12);
}

export function annualLogPercentToMonthlyGrowth(annualLogPercent) {
  return Math.exp(annualLogPercent / 100 / 12);
}

export function computeFrenchPayment(principal, annualTaePercent, years) {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = effectiveAnnualRateToMonthlyRate(annualTaePercent);

  if (Math.abs(monthlyRate) < 1e-12) {
    return {
      monthlyRate,
      months,
      payment: principal / months
    };
  }

  const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  return { monthlyRate, months, payment };
}

export function computeProjection(state) {
  if (!hasRequiredBasicValues(state)) {
    return { ready: false, points: [], months: [], summary: null };
  }

  const inputs = buildInputs(state);
  const mortgage = computeFrenchPayment(
    inputs.mortgagePrincipal,
    inputs.mortgageRate,
    inputs.mortgageYears
  );

  const monthlyHomeGrowth = annualPercentToMonthlyGrowth(inputs.homeInflation);
  const monthlyRentGrowth = annualPercentToMonthlyGrowth(inputs.rentInflation);
  const monthlyGeneralGrowth = annualPercentToMonthlyGrowth(inputs.generalInflation);
  const monthlyInvestmentGrowth = annualLogPercentToMonthlyGrowth(inputs.investmentReturn);

  let homeValue = inputs.homePrice;
  let rent = inputs.monthlyRent;
  let maintenance = inputs.maintenanceAnnual / 12;
  let propertyTax = inputs.propertyTaxAnnual / 12;
  let insurance = inputs.insuranceAnnual / 12;
  let remainingMortgage = inputs.mortgagePrincipal;
  let buyerPortfolio = 0;
  let renterPortfolio = Math.max(0, inputs.initialBuyerCash - inputs.rentDeposit);

  const months = [];
  const points = [
    createPoint({
      month: 0,
      homeValue,
      remainingMortgage,
      buyerPortfolio,
      renterPortfolio,
      rentDeposit: inputs.rentDeposit
    })
  ];

  for (let month = 1; month <= mortgage.months; month += 1) {
    const ownerCost = mortgage.payment + maintenance + propertyTax + insurance;
    const renterCost = rent;
    const buyerContribution = ownerCost < renterCost ? renterCost - ownerCost : 0;
    const renterContribution = renterCost < ownerCost ? ownerCost - renterCost : 0;

    buyerPortfolio += buyerContribution;
    renterPortfolio += renterContribution;
    buyerPortfolio *= monthlyInvestmentGrowth;
    renterPortfolio *= monthlyInvestmentGrowth;

    const interest = remainingMortgage * mortgage.monthlyRate;
    const principalPaid = Math.min(Math.max(mortgage.payment - interest, 0), remainingMortgage);
    remainingMortgage = Math.max(0, remainingMortgage - principalPaid);

    homeValue *= monthlyHomeGrowth;
    rent *= monthlyRentGrowth;
    maintenance *= monthlyGeneralGrowth;
    propertyTax *= monthlyGeneralGrowth;
    insurance *= monthlyGeneralGrowth;

    const monthData = {
      month,
      year: month / 12,
      homeValue,
      remainingMortgage,
      rentDeposit: inputs.rentDeposit,
      buyerContribution,
      renterContribution,
      buyerPortfolio,
      renterPortfolio,
      buy: homeValue - remainingMortgage + buyerPortfolio,
      rent: renterPortfolio + inputs.rentDeposit
    };
    months.push(monthData);

    if (month % 12 === 0 || month === mortgage.months) {
      points.push(createPoint(monthData));
    }
  }

  const last = points.at(-1);
  return {
    ready: true,
    inputs,
    mortgage,
    points,
    months,
    summary: {
      monthlyPayment: mortgage.payment,
      buyerFinal: last.buy,
      renterFinal: last.rent,
      betterOption: last.buy >= last.rent ? "Buying" : "Renting"
    }
  };
}

function createPoint(data) {
  return {
    month: data.month,
    year: data.month / 12,
    homeValue: data.homeValue,
    remainingMortgage: data.remainingMortgage,
    rentDeposit: data.rentDeposit,
    buyerPortfolio: data.buyerPortfolio,
    renterPortfolio: data.renterPortfolio,
    buy: data.homeValue - data.remainingMortgage + data.buyerPortfolio,
    rent: data.renterPortfolio + data.rentDeposit
  };
}

function buildInputs(state) {
  const homePrice = parseNumber(state.basic.homePrice);
  const mortgageRate = parseNumber(state.basic.mortgageRate);
  const mortgageYears = parseNumber(state.basic.mortgageYears);
  const monthlyRent = parseNumber(state.basic.monthlyRent);
  const investmentReturn = parseNumber(state.basic.investmentReturn);
  const mortgagePercent = getAdvancedValue(state, "mortgagePercent");
  const mortgagePrincipal = (homePrice * mortgagePercent) / 100;
  const downPayment = Math.max(0, homePrice - mortgagePrincipal);
  const taxes = (homePrice * getAdvancedValue(state, "taxes")) / 100;
  const acquisitionCost = getCostValue(state, "acquisitionCosts").amount;

  return {
    homePrice,
    mortgageRate,
    mortgageYears,
    monthlyRent,
    investmentReturn,
    generalInflation: getAdvancedValue(state, "generalInflation"),
    homeInflation: getAdvancedValue(state, "homeInflation"),
    mortgagePercent,
    mortgagePrincipal,
    downPayment,
    taxes,
    acquisitionCost,
    initialBuyerCash: downPayment + taxes + acquisitionCost,
    maintenanceAnnual: getCostValue(state, "maintenance").amount,
    propertyTaxAnnual: getCostValue(state, "propertyTax").amount,
    insuranceAnnual: getCostValue(state, "insurance").amount,
    rentInflation: getAdvancedValue(state, "rentInflation"),
    rentDeposit: getAdvancedValue(state, "rentDeposit"),
    returnsStdDev: getAdvancedValue(state, "returnsStdDev")
  };
}

export async function computeUncertainProjection(projection, state, options = {}) {
  if (!projection.ready) {
    return null;
  }

  const signal = options.signal;
  const simulationCount = clampInteger(
    options.simulationCount ?? getAdvancedValue(state, "monteCarloSimulations"),
    50,
    10000
  );
  const seed = normalizeSeed(options.seed ?? getAdvancedValue(state, "monteCarloSeed"));
  const recordPointByMonth = new Map(projection.points.map((point, index) => [point.month, index]));
  const buySamples = projection.points.map(() => []);
  const rentSamples = projection.points.map(() => []);
  const rng = mulberry32(seed);
  const annualMean = parseNumber(state.basic.investmentReturn) / 100;
  const annualSigma = getAdvancedValue(state, "returnsStdDev") / 100;
  const monthlyMean = annualMean / 12;
  const monthlySigma = annualSigma / Math.sqrt(12);

  for (let simulation = 0; simulation < simulationCount; simulation += 1) {
    if (signal?.cancelled) {
      return null;
    }

    let buyerPortfolio = 0;
    let renterPortfolio = Math.max(
      0,
      projection.inputs.initialBuyerCash - projection.inputs.rentDeposit
    );

    buySamples[0].push(projection.points[0].buy);
    rentSamples[0].push(projection.points[0].rent);

    for (const month of projection.months) {
      buyerPortfolio += month.buyerContribution;
      renterPortfolio += month.renterContribution;

      const sampledMonthlyGrowth = Math.exp(monthlyMean + monthlySigma * normalSample(rng));
      buyerPortfolio *= sampledMonthlyGrowth;
      renterPortfolio *= sampledMonthlyGrowth;

      const pointIndex = recordPointByMonth.get(month.month);
      if (pointIndex !== undefined) {
        buySamples[pointIndex].push(month.homeValue - month.remainingMortgage + buyerPortfolio);
        rentSamples[pointIndex].push(renterPortfolio + projection.inputs.rentDeposit);
      }
    }

    if (simulation % 32 === 31) {
      options.onProgress?.((simulation + 1) / simulationCount);
      await waitForFrame();
    }
  }

  return {
    simulationCount,
    seed,
    pairComparison: comparePairedOutcomes(buySamples.at(-1), rentSamples.at(-1)),
    buy: samplesToSeries(projection.points, buySamples),
    rent: samplesToSeries(projection.points, rentSamples)
  };
}

export function comparePairedOutcomes(buyValues, rentValues) {
  const sortedBuy = buyValues.filter(Number.isFinite).slice().sort((a, b) => a - b);
  const sortedRent = rentValues.filter(Number.isFinite).slice().sort((a, b) => a - b);
  const total = Math.min(sortedBuy.length, sortedRent.length);
  let buyerWins = 0;
  let renterWins = 0;
  let ties = 0;

  for (let index = 0; index < total; index += 1) {
    if (sortedBuy[index] > sortedRent[index]) {
      buyerWins += 1;
    } else if (sortedRent[index] > sortedBuy[index]) {
      renterWins += 1;
    } else {
      ties += 1;
    }
  }

  const winningCount = Math.max(buyerWins, renterWins);
  return {
    total,
    buyerWins,
    renterWins,
    ties,
    winner: buyerWins > renterWins ? "buy" : renterWins > buyerWins ? "rent" : "tie",
    confidence: total > 0 ? (winningCount / total) * 100 : 0
  };
}

function clampInteger(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeSeed(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.trunc(parsed) >>> 0;
}

function samplesToSeries(points, samples) {
  const series = {
    p01: [],
    p10: [],
    p50: [],
    p90: [],
    p99: []
  };

  points.forEach((point, index) => {
    const values = samples[index].slice().sort((a, b) => a - b);
    for (const [key, percentile] of Object.entries(PERCENTILE_LEVELS)) {
      series[key].push({
        month: point.month,
        year: point.year,
        value: quantile(values, percentile)
      });
    }
  });

  return series;
}

export function quantile(sortedValues, percentile) {
  if (sortedValues.length === 0) {
    return NaN;
  }
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }
  const index = (sortedValues.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function normalSample(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = rng();
  }
  while (v === 0) {
    v = rng();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function waitForFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}
