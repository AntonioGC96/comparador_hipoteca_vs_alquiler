import { formatCompactMoney, formatMoney, formatNumber } from "./format.js";
import { percentileLabel, t } from "./i18n.js";

const svgNamespace = "http://www.w3.org/2000/svg";
const colors = {
  buy: {
    line: "#1f7a65",
    inner: "rgba(31, 122, 101, 0.16)",
    outer: "rgba(31, 122, 101, 0.08)"
  },
  rent: {
    line: "#bd5a35",
    inner: "rgba(189, 90, 53, 0.16)",
    outer: "rgba(189, 90, 53, 0.08)"
  }
};

export function renderChart(svg, projection, state, uncertain, tooltip) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", "0 0 920 560");
  hideTooltip(tooltip);

  if (!projection.ready) {
    return;
  }

  const width = 920;
  const height = 560;
  const margin = { top: 44, right: 26, bottom: 58, left: 82 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxYear = Math.max(1, projection.points.at(-1).year);
  const valueAccessor = createDisplayValueAccessor(projection, state);
  const values = collectValues(projection, uncertain, state, valueAccessor);
  const extent = paddedExtent(values);
  const x = (year) => margin.left + (year / maxYear) * plotWidth;
  const y = (value) => margin.top + (1 - (value - extent.min) / (extent.max - extent.min)) * plotHeight;

  drawGrid(svg, { width, height, margin, plotWidth, plotHeight, x, y, extent, maxYear }, state.language);

  if (state.uncertainReturns && uncertain) {
    drawUncertainSeries(svg, "buy", uncertain.buy, x, y, valueAccessor);
    drawUncertainSeries(svg, "rent", uncertain.rent, x, y, valueAccessor);
  } else {
    drawLine(svg, projection.points, "buy", x, y, (point) => valueAccessor(point, point.buy));
    drawLine(svg, projection.points, "rent", x, y, (point) => valueAccessor(point, point.rent));
  }

  drawLegend(svg, state.language);
  drawHoverLayer(svg, tooltip, projection, state, uncertain, {
    width,
    height,
    margin,
    plotWidth,
    plotHeight,
    maxYear,
    x,
    y,
    valueAccessor
  });
}

function createDisplayValueAccessor(projection, state) {
  const generalInflation = projection.inputs.generalInflation / 100;
  return (point, value) => {
    if (state.viewMode !== "real") {
      return value;
    }
    return value / Math.pow(1 + generalInflation, point.month / 12);
  };
}

function collectValues(projection, uncertain, state, valueAccessor) {
  if (state.uncertainReturns && uncertain) {
    return ["buy", "rent"].flatMap((key) =>
      ["p024", "p159", "p50", "p841", "p976"].flatMap((band) =>
        uncertain[key][band].map((point) => valueAccessor(point, point.value))
      )
    );
  }
  return projection.points.flatMap((point) => [
    valueAccessor(point, point.buy),
    valueAccessor(point, point.rent)
  ]);
}

export function paddedExtent(values) {
  const finiteValues = values.filter(Number.isFinite);
  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(1, ...finiteValues);
  const safeMin = Number.isFinite(minValue) ? minValue : 0;
  const yMin = Math.min(0, safeMin);
  const range = Math.max(1, maxValue - yMin);
  return {
    min: yMin,
    max: maxValue + range * 0.12
  };
}

function drawGrid(svg, scale, language) {
  const grid = createElement("g", { class: "grid" });
  const axis = createElement("g", { class: "axis" });
  const yTicks = 5;
  const xTicks = Math.min(8, Math.max(2, Math.round(scale.maxYear)));

  for (let index = 0; index <= yTicks; index += 1) {
    const ratio = index / yTicks;
    const value = scale.extent.min + (scale.extent.max - scale.extent.min) * ratio;
    const yPosition = scale.y(value);
    grid.append(
      createElement("line", {
        x1: scale.margin.left,
        x2: scale.width - scale.margin.right,
        y1: yPosition,
        y2: yPosition
      })
    );
    const label = createElement("text", {
      x: scale.margin.left - 12,
      y: yPosition + 4,
      "text-anchor": "end"
    });
    label.textContent = formatCompactMoney(value, language);
    axis.append(label);
  }

  for (let index = 0; index <= xTicks; index += 1) {
    const year = (scale.maxYear / xTicks) * index;
    const xPosition = scale.x(year);
    grid.append(
      createElement("line", {
        x1: xPosition,
        x2: xPosition,
        y1: scale.margin.top,
        y2: scale.height - scale.margin.bottom
      })
    );
    const label = createElement("text", {
      x: xPosition,
      y: scale.height - scale.margin.bottom + 32,
      "text-anchor": "middle"
    });
    label.textContent = `${Math.round(year)}${t(language, "yearShort")}`;
    axis.append(label);
  }

  axis.append(
    createElement("line", {
      class: "domain",
      x1: scale.margin.left,
      x2: scale.width - scale.margin.right,
      y1: scale.height - scale.margin.bottom,
      y2: scale.height - scale.margin.bottom
    })
  );
  axis.append(
    createElement("line", {
      class: "domain",
      x1: scale.margin.left,
      x2: scale.margin.left,
      y1: scale.margin.top,
      y2: scale.height - scale.margin.bottom
    })
  );

  svg.append(grid, axis);
}

function drawUncertainSeries(svg, key, series, x, y, valueAccessor) {
  drawArea(svg, series.p024, series.p976, colors[key].outer, x, y, valueAccessor);
  drawArea(svg, series.p159, series.p841, colors[key].inner, x, y, valueAccessor);
  for (const band of ["p024", "p159", "p841", "p976"]) {
    drawLine(svg, series[band], key, x, y, (point) => valueAccessor(point, point.value), true);
  }
  drawLine(svg, series.p50, key, x, y, (point) => valueAccessor(point, point.value));
}

function drawArea(svg, lower, upper, fill, x, y, valueAccessor) {
  const upperPath = upper.map((point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command}${x(point.year)},${y(valueAccessor(point, point.value))}`;
  });
  const lowerPath = lower
    .slice()
    .reverse()
    .map((point) => `L${x(point.year)},${y(valueAccessor(point, point.value))}`);
  const path = createElement("path", {
    d: `${upperPath.join(" ")} ${lowerPath.join(" ")} Z`,
    fill,
    stroke: "none"
  });
  svg.append(path);
}

function drawLine(svg, points, key, x, y, accessor, secondary = false) {
  const pathData = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${x(point.year)},${y(accessor(point))}`;
    })
    .join(" ");
  const path = createElement("path", {
    class: `chart-line${secondary ? " secondary" : ""}`,
    d: pathData,
    stroke: colors[key].line
  });
  svg.append(path);

  if (!secondary) {
    for (const point of points) {
      svg.append(
        createElement("circle", {
          class: "marker",
          cx: x(point.year),
          cy: y(accessor(point)),
          r: 4,
          fill: colors[key].line
        })
      );
    }
  }
}

function drawLegend(svg, language) {
  const legend = createElement("g", { class: "legend", transform: "translate(82 22)" });
  const entries = [
    ["buy", t(language, "buying")],
    ["rent", t(language, "renting")]
  ];
  entries.forEach(([key, label], index) => {
    const group = createElement("g", { transform: `translate(${index * 110} 0)` });
    group.append(
      createElement("line", {
        x1: 0,
        x2: 26,
        y1: 0,
        y2: 0,
        stroke: colors[key].line,
        "stroke-width": 4,
        "stroke-linecap": "round"
      })
    );
    const text = createElement("text", { x: 34, y: 4 });
    text.textContent = label;
    group.append(text);
    legend.append(group);
  });
  svg.append(legend);
}

function drawHoverLayer(svg, tooltip, projection, state, uncertain, scale) {
  if (!tooltip) {
    return;
  }

  const hoverLayer = createElement("g", { class: "hover-layer" });
  const guide = createElement("line", {
    class: "hover-guide",
    y1: scale.margin.top,
    y2: scale.height - scale.margin.bottom
  });
  const markerLayer = createElement("g", { class: "hover-markers" });
  const overlay = createElement("rect", {
    class: "hover-overlay",
    x: scale.margin.left,
    y: scale.margin.top,
    width: scale.plotWidth,
    height: scale.plotHeight,
    fill: "transparent"
  });

  guide.hidden = true;
  hoverLayer.append(guide, markerLayer, overlay);
  svg.append(hoverLayer);

  overlay.addEventListener("pointermove", (event) => {
    const svgPoint = clientToSvgPoint(svg, event, scale.width, scale.height);
    const index = nearestPointIndex(svgPoint.x, projection.points, scale.x);
    const point = projection.points[index];
    const xPosition = scale.x(point.year);
    const rows = tooltipRows(index, projection, state, uncertain, scale.valueAccessor);

    guide.hidden = false;
    guide.setAttribute("x1", xPosition);
    guide.setAttribute("x2", xPosition);
    markerLayer.replaceChildren(
      ...rows.map((row) =>
        createElement("circle", {
          class: "hover-marker",
          cx: xPosition,
          cy: scale.y(row.value),
          r: row.primary ? 4.5 : 3,
          fill: row.color
        })
      )
    );

    renderTooltip(tooltip, point, rows, state, uncertain);
    positionTooltip(tooltip, event);
  });

  overlay.addEventListener("pointerleave", () => {
    guide.hidden = true;
    markerLayer.replaceChildren();
    hideTooltip(tooltip);
  });
}

function tooltipRows(index, projection, state, uncertain, valueAccessor) {
  if (state.uncertainReturns && uncertain) {
    const bands = [
      ["p976", percentileLabel(state.language, 97.6), false],
      ["p841", percentileLabel(state.language, 84.1), false],
      ["p50", percentileLabel(state.language, 50), true],
      ["p159", percentileLabel(state.language, 15.9), false],
      ["p024", percentileLabel(state.language, 2.4), false]
    ];
    return [
      ...bands.map(([band, label, primary]) =>
        tooltipBandRow(t(state.language, "buying"), "buy", label, primary, uncertain.buy[band][index], valueAccessor)
      ),
      ...bands.map(([band, label, primary]) =>
        tooltipBandRow(t(state.language, "renting"), "rent", label, primary, uncertain.rent[band][index], valueAccessor)
      )
    ];
  }

  const point = projection.points[index];
  return [
    {
      label: t(state.language, "buying"),
      value: valueAccessor(point, point.buy),
      color: colors.buy.line,
      primary: true
    },
    {
      label: t(state.language, "renting"),
      value: valueAccessor(point, point.rent),
      color: colors.rent.line,
      primary: true
    }
  ];
}

function tooltipBandRow(optionLabel, key, bandLabel, primary, point, valueAccessor) {
  return {
    label: `${optionLabel} ${bandLabel}`,
    value: valueAccessor(point, point.value),
    color: colors[key].line,
    primary
  };
}

function renderTooltip(tooltip, point, rows, state, uncertain) {
  const title = document.createElement("div");
  title.className = "tooltip-title";
  title.textContent = t(state.language, "year", {
    year: formatNumber(point.year, 2, state.language)
  });

  const mode = document.createElement("div");
  mode.className = "tooltip-subtitle";
  const amountMode = t(state.language, state.viewMode === "real" ? "realLower" : "nominalLower");
  mode.textContent = state.uncertainReturns && uncertain
    ? t(state.language, "tooltipValuesWithSimulations", {
        mode: amountMode,
        count: formatNumber(uncertain.simulationCount, 0, state.language)
      })
    : t(state.language, "tooltipValues", { mode: amountMode });

  const list = document.createElement("div");
  list.className = "tooltip-list";
  rows.forEach((row) => {
    const line = document.createElement("div");
    line.className = `tooltip-row${row.primary ? " primary" : ""}`;
    const label = document.createElement("span");
    label.className = "tooltip-label";
    const swatch = document.createElement("span");
    swatch.className = "tooltip-swatch";
    swatch.style.backgroundColor = row.color;
    label.append(swatch, document.createTextNode(row.label));
    const value = document.createElement("strong");
    value.textContent = formatMoney(row.value, state.language);
    line.append(label, value);
    list.append(line);
  });

  tooltip.replaceChildren(title, mode, list);
  tooltip.hidden = false;
}

function positionTooltip(tooltip, event) {
  const frame = tooltip.parentElement;
  const frameRect = frame.getBoundingClientRect();
  const x = event.clientX - frameRect.left;
  const y = event.clientY - frameRect.top;

  const left = Math.min(
    Math.max(8, x + 14),
    Math.max(8, frameRect.width - tooltip.offsetWidth - 8)
  );
  const top = Math.min(
    Math.max(8, y + 14),
    Math.max(8, frameRect.height - tooltip.offsetHeight - 8)
  );

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function clientToSvgPoint(svg, event, width, height) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM();

  if (matrix) {
    return point.matrixTransform(matrix.inverse());
  }

  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * width,
    y: ((event.clientY - rect.top) / rect.height) * height
  };
}

function nearestPointIndex(svgX, points, x) {
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.abs(x(point.year) - svgX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function hideTooltip(tooltip) {
  if (tooltip) {
    tooltip.hidden = true;
  }
}

function createElement(name, attributes = {}) {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}
