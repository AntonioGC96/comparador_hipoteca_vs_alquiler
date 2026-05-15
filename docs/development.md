# Development Notes

## Source Instructions

The app follows the requirements in `instructions/functionality.txt`,
`instructions/development.txt`, and `instructions/environment.txt`.

## Architecture

The application is a static web frontend with no runtime dependencies. It is split
into small modules:

- `src/app.js` coordinates state, persistence, chart rendering, and recalculation.
- `src/state.js` owns persisted state, default values, advanced field behavior, and
  dual percent/amount cost inputs.
- `src/finance.js` contains the mortgage, rent, buy, deterministic projection, and
  uncertain return calculations.
- `src/chart.js` renders the net worth chart as SVG.
- `src/ui.js` binds and synchronizes form controls.
- `src/format.js` centralizes numeric formatting and parsing.

## Financial Model

The required basic inputs have no defaults, except for the New building or resale
toggle, which defaults to New building. Computation is skipped until all required
basic inputs are present and valid.

The mortgage payment uses the French fixed monthly payment formula. The mortgage
interest input is treated as an effective annual TAE rate and converted to a
monthly rate with `(1 + annualRate)^(1 / 12) - 1`. The resulting monthly payment
is fixed for the full mortgage term.

The buyer starts with home equity equal to home value minus remaining mortgage.
The renter invests the cash that would have gone to the buyer's initial down
payment, taxes, and acquisition costs, except for the rent deposit. The rent
deposit is included in renter net worth but does not earn returns.

Monthly expenses are computed at the beginning of each month. The lower-costing
option invests the monthly difference immediately, so that month's investment
return applies to the new contribution. Home price, rent, maintenance, property
tax, insurance, and portfolio values grow monthly using the yearly rates defined
in the instructions.

Net worth is computed as:

- Buyer: `home value - remaining mortgage + investment portfolio`
- Renter: `investment portfolio + rent deposit`

## Uncertain Portfolio Returns

When uncertain returns are enabled, investment log returns are sampled from a
normal distribution. The app uses Monte Carlo simulation because the portfolio can
receive recurring monthly contributions, which prevents a simple closed-form
distribution for the full portfolio value. Simulations use the same sampled market
path for both renting and buying in each run. The advanced controls expose the
simulation count and random seed so users can inspect and adjust the Monte Carlo
defaults. Reusing the same seed keeps repeated renders stable.

The chart shows the 1st, 10th, 50th, 90th, and 99th percentiles. The inner
10th-to-90th and outer 1st-to-99th percentile regions are rendered as shaded
areas. Before an option has a portfolio greater than zero, its uncertain line is
identical to its deterministic line.

## User Interface

The desktop layout places the chart on the left and inputs on the right. Narrow
screens switch to a column layout with inputs first and the chart after them. The
chart supports nominal and real values, with real values deflated by general
inflation. Hovering the chart snaps to the nearest year and shows a tooltip with
the values of every visible line at that instant. In uncertain mode, the tooltip
labels the probability percentiles directly instead of using sigma terminology.

All visible interface text is routed through `src/i18n.js`. The language selector
supports English and Spanish, persists with the rest of the website state, and
updates the chart, controls, summary, tooltip, loading text, and document title.

Advanced defaults are shown in grey and turn black when the user explicitly edits
them. Clearing an advanced input restores its current default and grey styling.
The advanced expansion button becomes "Return to default advanced options" after
expansion; pressing it asks for confirmation, collapses the advanced section, and
resets all advanced inputs.

The complete UI state is stored in browser local storage, which provides
user-side persistent storage across reloads and browser restarts.

## Development Environment

The included devcontainer uses `node:22-alpine`, a lightweight Linux base image.
It allows development and testing without installing dependencies on the host
machine. The local server is `server.mjs`, and tests use Node's built-in test
runner.

Run locally:

```sh
npm start
```

Run tests:

```sh
npm test
```
