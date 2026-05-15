import { COST_FIELDS } from "./config.js";
import {
  formatFixedPercent,
  formatInputNumber,
  formatMoney,
  formatPercent,
  parseNumber
} from "./format.js";
import { applyTranslations, t } from "./i18n.js";
import {
  getAdvancedDefault,
  getAdvancedValue,
  getCostValue,
  getDisplayValue
} from "./state.js";

export function bindControls(elements, getState, setState, recalculate, refreshDisplay) {
  elements.form.addEventListener("input", (event) => {
    const input = event.target;
    const state = getState();

    if (input.dataset.basicField) {
      setState(state.actions.setBasicValue(input.dataset.basicField, input.value));
      recalculate();
      return;
    }

    if (input.dataset.advancedField) {
      setState(state.actions.setAdvancedValue(input.dataset.advancedField, input.value));
      recalculate();
      return;
    }

    const dualField = input.closest("[data-dual-field]");
    if (dualField) {
      const field = dualField.dataset.dualField;
      setState(state.actions.setAdvancedValue(field, input.value));
      recalculate();
    }
  });

  elements.form.addEventListener(
    "blur",
    (event) => {
      if (event.target.matches("input[type='number']")) {
        const parsed = parseNumber(event.target.value);
        if (Number.isFinite(parsed)) {
          event.target.value = formatInputNumber(parsed);
        }
        if (event.target.value.trim() === "" && isAdvancedValueInput(event.target)) {
          recalculate();
        }
      }
    },
    true
  );

  elements.form.addEventListener("focusin", (event) => {
    const input = event.target;
    if (!input.matches("input[type='number']") || !isAdvancedValueInput(input)) {
      return;
    }
    requestAnimationFrame(() => {
      if (document.activeElement === input) {
        input.select();
      }
    });
  });

  elements.form.addEventListener("click", (event) => {
    const buildingButton = event.target.closest("[data-building-type]");
    if (buildingButton) {
      const state = getState();
      setState(state.actions.setBuildingType(buildingButton.dataset.buildingType));
      recalculate();
      return;
    }

    const dualSide = event.target.closest("[data-dual-side]");
    if (dualSide) {
      const wrapper = dualSide.closest("[data-dual-field]");
      const field = wrapper.dataset.dualField;
      const side = dualSide.dataset.dualSide;
      const state = getState();
      if (getState().advanced.modes[field] !== side) {
        setState(state.actions.setCostMode(field, side));
        recalculate();
      }
    }
  });

  elements.advancedToggle.addEventListener("click", () => {
    const state = getState();
    if (!state.advancedExpanded) {
      setState({ ...state, advancedExpanded: true });
      recalculate();
      return;
    }

    if (globalThis.confirm(t(state.language, "resetConfirmation"))) {
      setState(state.actions.resetAdvanced());
      recalculate();
    }
  });

  elements.uncertainReturns.addEventListener("change", () => {
    const state = getState();
    setState({ ...state, uncertainReturns: elements.uncertainReturns.checked });
    recalculate();
  });

  elements.languageSelect.addEventListener("change", () => {
    const state = getState();
    setState(state.actions.setLanguage(elements.languageSelect.value));
    refreshDisplay();
  });

  elements.viewModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const state = getState();
      setState({ ...state, viewMode: button.dataset.viewMode });
      refreshDisplay();
    });
  });
}

export function syncControls(elements, state) {
  applyTranslations(document, state.language);
  elements.languageSelect.value = state.language;

  elements.basicInputs.forEach((input) => {
    updateInputValue(input, state.basic[input.dataset.basicField]);
  });

  elements.buildingButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.buildingType === state.basic.buildingType);
    button.setAttribute("aria-pressed", String(button.dataset.buildingType === state.basic.buildingType));
  });

  elements.viewModeButtons.forEach((button) => {
    button.classList.toggle("selected", button.dataset.viewMode === state.viewMode);
    button.setAttribute("aria-pressed", String(button.dataset.viewMode === state.viewMode));
  });

  elements.advancedRegion.hidden = !state.advancedExpanded;
  elements.uncertainControls.hidden = !state.advancedExpanded;
  elements.advancedToggle.textContent = state.advancedExpanded
    ? t(state.language, "resetAdvancedOptions")
    : t(state.language, "advancedOptions");
  elements.uncertainReturns.checked = state.uncertainReturns;
  elements.stdDevField.hidden = !state.uncertainReturns;
  elements.monteCarloFields.hidden = !state.uncertainReturns;

  elements.advancedInputs.forEach((input) => {
    const field = input.dataset.advancedField;
    const shouldRestoreDefault = !state.advanced.manual[field]
      && input.value.trim() === ""
      && document.activeElement !== input;
    updateInputValue(input, getDisplayValue(state, field), shouldRestoreDefault);
    input.classList.toggle("default-value", !state.advanced.manual[field]);
  });

  for (const field of Object.keys(COST_FIELDS)) {
    const wrapper = elements.form.querySelector(`[data-dual-field="${field}"]`);
    const value = getCostValue(state, field);
    const sides = wrapper.querySelectorAll("[data-dual-side]");

    sides.forEach((side) => {
      const mode = side.dataset.dualSide;
      const input = side.querySelector("input");
      const active = value.mode === mode;
      side.classList.toggle("inactive", !active);
      input.readOnly = !active;
      input.tabIndex = active ? 0 : -1;
      input.classList.toggle("default-value", !value.manual);
      const display = mode === "amount" ? value.amount : value.percent;
      const shouldRestoreDefault = !value.manual
        && input.value.trim() === ""
        && document.activeElement !== input;
      updateInputValue(input, formatInputNumber(display), shouldRestoreDefault);
    });
  }
}

export function renderSummary(container, projection, state, uncertain) {
  if (!projection.ready) {
    container.replaceChildren(summaryItem(t(state.language, "status"), t(state.language, "waitingInputs")));
    return;
  }

  const display = t(state.language, state.viewMode === "real" ? "realLower" : "nominalLower");
  const percentileSummary = getPercentileSummary(projection, state, uncertain);
  const finalBuyer = percentileSummary?.buyer
    ?? applyDisplayMode(projection.points.at(-1), projection.summary.buyerFinal, projection, state);
  const finalRenter = percentileSummary?.renter
    ?? applyDisplayMode(projection.points.at(-1), projection.summary.renterFinal, projection, state);
  const decision = percentileSummary?.decision
    ?? (projection.summary.buyerFinal >= projection.summary.renterFinal
      ? t(state.language, "buying")
      : t(state.language, "renting"));

  container.replaceChildren(
    summaryItem(t(state.language, "monthlyMortgage"), formatMoney(projection.summary.monthlyPayment, state.language)),
    summaryItem(
      t(state.language, percentileSummary ? "buyerPercentileNetWorth" : "buyerNetWorth", { mode: display }),
      formatMoney(finalBuyer, state.language)
    ),
    summaryItem(
      t(state.language, percentileSummary ? "renterPercentileNetWorth" : "renterNetWorth", { mode: display }),
      formatMoney(finalRenter, state.language)
    ),
    summaryItem(t(state.language, "higherFinalValue"), decision)
  );
}

export function describeCurrentInputs(projection, state) {
  if (!projection.ready) {
    return "";
  }
  return [
    `${t(state.language, "mortgageAmountSummary")}: ${formatMoney(projection.inputs.mortgagePrincipal, state.language)}`,
    `${t(state.language, "downPayment")}: ${formatMoney(projection.inputs.downPayment, state.language)}`,
    `${t(state.language, "mortgageShare")}: ${formatPercent(projection.inputs.mortgagePercent, state.language)}`
  ].join(". ");
}

function applyDisplayMode(point, value, projection, state) {
  if (state.viewMode !== "real") {
    return value;
  }
  return value / Math.pow(1 + projection.inputs.generalInflation / 100, point.month / 12);
}

function summaryItem(label, value) {
  const item = document.createElement("div");
  item.className = "summary-item";
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("strong");
  valueElement.textContent = value;
  item.append(labelElement, valueElement);
  return item;
}

function getPercentileSummary(projection, state, uncertain) {
  const comparison = uncertain?.pairComparison;
  if (!state.uncertainReturns || !comparison) {
    return null;
  }

  const option = comparison.winner === "buy"
    ? t(state.language, "buying")
    : comparison.winner === "rent"
      ? t(state.language, "renting")
      : t(state.language, "tie");

  const lastBuy = uncertain.buy.p50.at(-1);
  const lastRent = uncertain.rent.p50.at(-1);

  return {
    buyer: applyDisplayMode(lastBuy, lastBuy.value, projection, state),
    renter: applyDisplayMode(lastRent, lastRent.value, projection, state),
    decision: t(state.language, "confidenceDecision", {
      option,
      confidence: formatFixedPercent(comparison.confidence, state.language)
    })
  };
}

function updateInputValue(input, value, force = false) {
  if (!force && document.activeElement === input) {
    return;
  }
  input.value = value ?? "";
}

function isAdvancedValueInput(input) {
  const dualField = input.closest("[data-dual-field]");
  return Boolean(input.dataset.advancedField || dualField);
}
