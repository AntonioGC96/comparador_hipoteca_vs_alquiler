import { renderChart } from "./chart.js";
import { computeProjection, computeUncertainProjection } from "./finance.js";
import { bindControls, describeCurrentInputs, renderSummary, syncControls } from "./ui.js";
import {
  loadState,
  resetAdvanced,
  saveState,
  setAdvancedValue,
  setBasicValue,
  setBuildingType,
  setCostMode,
  setLanguage
} from "./state.js";

const elements = {
  form: document.querySelector("#calculatorForm"),
  chart: document.querySelector("#netWorthChart"),
  tooltip: document.querySelector("#chartTooltip"),
  emptyState: document.querySelector("#emptyState"),
  loading: document.querySelector("#chartLoading"),
  summary: document.querySelector("#summary"),
  advancedToggle: document.querySelector("#advancedToggle"),
  advancedRegion: document.querySelector("#advancedRegion"),
  uncertainControls: document.querySelector("#uncertainControls"),
  uncertainReturns: document.querySelector("#uncertainReturns"),
  stdDevField: document.querySelector("#stdDevField"),
  monteCarloFields: document.querySelector("#monteCarloFields"),
  languageSelect: document.querySelector("#languageSelect"),
  basicInputs: [...document.querySelectorAll("[data-basic-field]")],
  advancedInputs: [...document.querySelectorAll("[data-advanced-field]")],
  buildingButtons: [...document.querySelectorAll("[data-building-type]")],
  viewModeButtons: [...document.querySelectorAll("[data-view-mode]")]
};

let state = withActions(loadState());
let projection = computeProjection(state);
let uncertain = null;
let uncertaintyTimer = null;
let uncertaintySignal = null;

function withActions(nextState) {
  const plainState = stripActions(nextState);
  return {
    ...plainState,
    actions: {
      setBasicValue: (field, value) => withActions(setBasicValue(plainState, field, value)),
      setAdvancedValue: (field, value) => withActions(setAdvancedValue(plainState, field, value)),
      setBuildingType: (value) => withActions(setBuildingType(plainState, value)),
      setCostMode: (field, mode) => withActions(setCostMode(plainState, field, mode)),
      setLanguage: (language) => withActions(setLanguage(plainState, language)),
      resetAdvanced: () => withActions(resetAdvanced(plainState))
    }
  };
}

function setState(nextState) {
  state = withActions(stripActions(nextState));
  saveState(stripActions(state));
}

function stripActions(value) {
  const { actions, ...plain } = value;
  return plain;
}

function recalculate() {
  projection = computeProjection(state);
  uncertain = null;
  syncControls(elements, state);
  renderSummary(elements.summary, projection, state);
  render();
  scheduleUncertainProjection();
}

function render() {
  elements.emptyState.hidden = projection.ready;
  renderChart(elements.chart, projection, state, uncertain, elements.tooltip);
  elements.chart.setAttribute("aria-label", describeCurrentInputs(projection, state));
}

function scheduleUncertainProjection() {
  clearTimeout(uncertaintyTimer);
  if (uncertaintySignal) {
    uncertaintySignal.cancelled = true;
  }

  if (!projection.ready || !state.uncertainReturns) {
    elements.loading.hidden = true;
    return;
  }

  elements.loading.hidden = false;
  uncertaintySignal = { cancelled: false };
  const activeSignal = uncertaintySignal;

  uncertaintyTimer = setTimeout(async () => {
    const result = await computeUncertainProjection(projection, state, {
      signal: activeSignal
    });
    if (!result || activeSignal.cancelled) {
      return;
    }
    uncertain = result;
    elements.loading.hidden = true;
    render();
  }, 120);
}

bindControls(elements, () => state, setState, recalculate);
recalculate();
