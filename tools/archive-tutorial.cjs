// Takes the report screenshots of the introduction, from a fresh player on a
// running game (phone size, dev build). It plays challenge 1 by the keyboard
// and by taps, then follows the four steps to the first house.
// Usage: node tools/archive-tutorial.cjs <out-dir/> [url]
const { chromium, devices } = require('playwright');
const D = process.argv[2];
const URL = process.argv[3] ?? 'https://dev.skargardsbyn.84.247.143.6.sslip.io/';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const shot = async (n, wait = 700) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${D}${n}.png` }); };
  const next = () => p.getByRole('button', { name: 'Nästa' }).click();

  await p.goto(URL);
  await shot('01-samtycke', 1200);
  await p.getByText('Ja, det går bra').click();
  await shot('02-forsta-draget', 1500);

  // One move by the keyboard, as a player without a touch screen would.
  const m = await p.evaluate(() => window.__match3.findMove());
  await p.locator('.stage').focus();
  for (let i = 0; i < m[0].r; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(60); }
  for (let i = 0; i < m[0].c; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(60); }
  await p.keyboard.press('Enter');
  await p.waitForTimeout(60);
  await p.keyboard.press(m[1].r > m[0].r ? 'ArrowDown' : 'ArrowRight');
  await shot('03-malet', 1500);

  // Play the level out with taps on the first legal move.
  for (let i = 0; i < 40; i++) {
    const info = await p.evaluate(() => { const g = window.__match3; return { m: g.findMove(), rows: g.rows, cols: g.cols, st: g.status() }; });
    if (info.st !== 'playing' || !info.m) break;
    const box = await p.locator('canvas').boundingBox();
    const cell = Math.floor(Math.min((box.width - 32) / info.cols, (box.height - 32) / info.rows));
    const ox = box.x + (box.width - cell * info.cols) / 2, oy = box.y + (box.height - cell * info.rows) / 2;
    const at = (c) => [ox + c.c * cell + cell / 2, oy + c.r * cell + cell / 2];
    await p.mouse.click(...at(info.m[0]));
    await p.mouse.click(...at(info.m[1]));
    await p.waitForTimeout(1100);
  }
  if (await p.getByText('Ge upp').count()) await p.getByText('Ge upp').click();
  await shot('04-till-byn', 900);
  await p.locator('[data-tut="to-village"]').first().click();
  await shot('05-bygg-forsta-huset');
  await p.locator('[data-tut="build-stugan"]').click();
  await shot('06-klart', 1200);
  await b.close();
})();
