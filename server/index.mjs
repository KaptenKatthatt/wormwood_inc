// @ts-check
import webpush from 'web-push';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';
const app = await createApp({
  distDir: process.env.DIST_DIR ?? new URL('../dist', import.meta.url).pathname,
  testDistDir: process.env.TEST_DIST_DIR ?? new URL('../dist-test', import.meta.url).pathname,
  dataDir: process.env.DATA_DIR ?? new URL('../data', import.meta.url).pathname,
  webpush,
  contact: process.env.VAPID_CONTACT,
  adminKey: process.env.ADMIN_KEY,
  // Testarnas kontor sends mail through AgentMail (server/outreach.mjs).
  mail: { apiKey: process.env.AGENTMAIL_API_KEY ?? process.env.AGENTMAIL, inbox: process.env.AGENTMAIL_INBOX ?? 'jonas-exjobb@agentmail.to' },
});

setInterval(() => { app.flushDue().catch((e) => console.error('flushDue', e)); }, 10_000);
app.server.listen(port, host, () => console.log(`wormwood på http://${host}:${port}`));
