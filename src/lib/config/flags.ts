/**
 * Build flags. The dev menu (fast mode, test wallet top-up, reset, debug info)
 * is on by default and is switched off for builds that go to playtesters:
 *
 *   VITE_DEV_MENU=false npm run build
 */
export const DEV_MENU: boolean = import.meta.env.VITE_DEV_MENU !== 'false';
