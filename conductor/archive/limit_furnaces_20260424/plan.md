# Implementation Plan: Limit Smelting Optimization to 15 Blast Furnaces

## Phase 1: UI Implementation [checkpoint: 873de59]
- [x] Task: Add the "Limiter à 15 Hauts Fourneaux" checkbox in `index.html`.
- [x] Task: Update `styles.css` for proper checkbox alignment in the smelting section.
- [x] Task: Conductor - User Manual Verification 'Phase 1: UI Implementation' (Protocol in workflow.md)

## Phase 2: Logic Implementation [checkpoint: 9524ceb]
- [x] Task: Create a failing test for `calcSmelt` with the 15-furnace limit active. (Skipped)
- [x] Task: Update `calcSmelt` in `app.js` to handle the new limit state.
- [x] Task: Implement the logic to cap total stacks at 15 and optimize material mix.
- [x] Task: Verify all tests pass and coverage is >80%. (Skipped: No test framework)
- [x] Task: Conductor - User Manual Verification 'Phase 2: Logic Implementation' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions 85f3956