/**
 * Build flags. The dev menu (fast mode, test wallet top-up, reset, debug info)
 * is on by default and is switched off for builds that go to playtesters:
 *
 *   VITE_DEV_MENU=false npm run build
 */
export const DEV_MENU: boolean = import.meta.env.VITE_DEV_MENU !== 'false';

/**
 * The expansion (Jonas, 2026-11-17): 200 challenges in five worlds, the week
 * staircase (steps 6-9) and neighbouring villages. On by default; the pilot on
 * 21-22/11 runs without it (VITE_EXPANSION=false for the tester build).
 */
export const EXPANSION: boolean = import.meta.env.VITE_EXPANSION !== 'false';
