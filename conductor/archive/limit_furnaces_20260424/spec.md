# Track Specification: Limit Smelting Optimization to 15 Blast Furnaces

## Overview
The goal of this track is to enhance the smelting optimization feature by adding a user-controlled limit of 15 blast furnaces. Currently, the optimizer proposes as many furnaces as needed to meet the revenue goal. This change will allow users to restrict the proposal to only 15 blast furnaces (the maximum typically available in their setup) and optimize the material mix within that constraint.

## Requirements
- Add a "Limiter à 15 Hauts Fourneaux" (Limit to 15 Blast Furnaces) checkbox in the "Optimisation Cuisson" section.
- When the checkbox is checked:
  - The optimization algorithm MUST NOT exceed 15 stacks of materials in total.
  - The algorithm should prioritize materials that maximize profit within the 15-stack limit.
  - The "Fours classiques" (Normal Furnaces) result should remain 0 or be hidden if the limit is active.
- When the checkbox is unchecked:
  - The existing behavior (no limit) should be preserved.

## Acceptance Criteria
- UI: Checkbox exists and is labeled correctly.
- Logic: When active, `haut-result` is <= 15 and `four-result` is 0.
- Logic: Profit is maximized within the 15-stack budget.