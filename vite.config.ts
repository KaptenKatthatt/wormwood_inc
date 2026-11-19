import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

/**
 * Two apps side by side on Jonas's phone (2026-11-18): the dev build is
 * "Skärgårdsbyn dev", the tester build plain "Skärgårdsbyn" (Jonas chose
 * that, since the testers install it too). The addresses differ, so the
 * phone keeps them apart.
 */
const DEV = process.env.VITE_DEV_MENU !== 'false';
const APP_NAME = DEV ? 'Skärgårdsbyn dev' : 'Skärgårdsbyn';
/** The dev app's icons say DEV (tools/dev-icons.py). */
const ICONS = DEV ? '/icons/dev' : '/icons';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    svelte(),
    { name: 'app-name', transformIndexHtml: (html: string) => html.replace('/icons/apple-touch-icon.png', `${ICONS}/apple-touch-icon.png`).replace('content="Skärgårdsbyn"', `content="${APP_NAME}"`).replace('<title>Skärgårdsbyn</title>', `<title>${APP_NAME}</title>`) },
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // The art and the font are precached too, so the game also works offline.
        globPatterns: ['**/*.{js,css,html,png,jpg,webp,woff2,svg,webmanifest}'],
        // Worlds 2-5 (3 MB of maps and boards) are not precached: an update then
        // only downloads the first world, so it finishes before the player
        // leaves the app. Their art is cached the first time it is shown (sw.ts).
        // The winter village and the Christmas decorations are cached the same way.
        globIgnores: ['**/art/worlds/**', '**/art/village/winter/**', '**/art/village/xmas/**'],
      },
      manifest: {
        id: '/',
        name: APP_NAME,
        short_name: APP_NAME,
        description: 'Lös pussel och bygg en by vid havet.',
        lang: 'sv',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#a9d8ec',
        theme_color: '#a9d8ec',
        icons: [
          { src: `${ICONS}/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${ICONS}/icon-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${ICONS}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: { chunkSizeWarningLimit: 2000 },
});
