# Implementation Plan: Limit Smelting Optimization to 15 Blast Furnaces

## Phase 1: UI Implementation
- [ ] Task: Add the "Limiter à 15 Hauts Fourneaux" checkbox in `index.html`.
- [ ] Task: Update `styles.css` for proper checkbox alignment in the smelting section.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: UI Implementation' (Protocol in workflow.md)

## Phase 2: Logic Implementation
- [ ] Task: Create a failing test for `calcSmelt` with the 15-furnace limit active.
- [ ] Task: Update `calcSmelt` in `app.js` to handle the new limit state.
- [ ] Task: Implement the logic to cap total stacks at 15 and optimize material mix.
- [ ] Task: Verify all tests pass and coverage is >80%.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Logic Implementation' (Protocol in workflow.md)