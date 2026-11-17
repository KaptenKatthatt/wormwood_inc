// Takes the report screenshot set from a running game (phone size, dev build).
// Usage: node tools/archive-screenshots.cjs <out-dir/> [url]
const { chromium, devices } = require('playwright');
const D = process.argv[2];
const URL = process.argv[3] ?? 'https://wormwood.84.247.143.6.sslip.io/';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const shot = async (n, wait = 600) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${D}${n}.png` }); };
  const dialog = () => p.getByRole('dialog');
  // Letters from the advisor can pop up at any point; read and close them.
  const closeLetters = async () => { while (await p.getByRole('button', { name: 'Tack', exact: true }).count()) { await p.getByRole('button', { name: 'Tack', exact: true }).first().click(); await p.waitForTimeout(200); } };
  const clickIf = async (loc) => { if (await loc.count()) { await loc.first().click(); return true; } return false; };

  /** Plays one legal move found by the engine (exposed in dev builds only). */
  async function move() {
    const box = await p.locator('canvas').boundingBox();
    const info = await p.evaluate(() => { const g = window.__match3; return { m: g.findMove(), rows: g.rows, cols: g.cols, status: g.status() }; });
    if (info.status !== 'playing' || !info.m) return false;
    const cell = Math.floor(Math.min((box.width - 16) / info.cols, (box.height - 16) / info.rows));
    const ox = box.x + (box.width - cell * info.cols) / 2;
    const oy = box.y + (box.height - cell * info.rows) / 2;
    const at = (c) => [ox + c.c * cell + cell / 2, oy + c.r * cell + cell / 2];
    await p.mouse.click(...at(info.m[0]));
    await p.mouse.click(...at(info.m[1]));
    await p.waitForTimeout(1200);
    return true;
  }
  async function playLevel(n, midShot) {
    await p.getByRole('button', { name: 'Banor' }).click();
    await p.getByRole('button', { name: 'Spela' }).nth(n).click();
    await p.waitForTimeout(700);
    for (let i = 0; i < 40; i++) {
      await closeLetters();
      if (await dialog().count()) break;
      if (i === 4 && midShot) await shot(midShot, 0);
      await move();
    }
  }
  async function leaveDialog() {
    await closeLetters();
    await clickIf(dialog().getByText('Till byn'));
    await clickIf(dialog().getByText('Ge upp'));
    await p.waitForTimeout(300);
    (await clickIf(dialog().getByText('Till byn'))) || (await clickIf(dialog().getByText('Till banorna')));
    await p.waitForTimeout(300);
  }

  await p.goto(URL);
  await shot('01-samtycke', 1200);
  await p.getByText('Ja, det går bra').click();
  await shot('02-radgivarens-brev');
  await p.getByRole('button', { name: 'Tack' }).click();
  await shot('02b-banor');

  await playLevel(0, '03-bana1-samla');
  await shot('04-bana1-slut');
  await leaveDialog();

  await p.getByRole('button', { name: 'Byn' }).click();
  await shot('05-byn-start');
  await p.getByRole('button', { name: 'Bygg', exact: true }).first().click();
  await shot('06-byn-bygger', 1500);
  await p.waitForTimeout(5000);
  await shot('07-byn-stugan-klar');

  await playLevel(1, '08-bana2-is');
  await shot('09-bana2-slut');
  await leaveDialog();

  await playLevel(2, '10-bana3-poang');
  await shot('11-bana3-sa-nara');
  await leaveDialog();

  await p.getByRole('button', { name: /ädelstenar/ }).click();
  await shot('12-butiken');
  await dialog().getByText('Stäng').click();

  await p.getByRole('button', { name: 'Inställningar' }).click();
  await shot('13-installningar');
  await p.evaluate(() => document.querySelector('.dev')?.scrollIntoView());
  await shot('14-utvecklarmeny-tid-och-krokar');
  await p.evaluate(() => document.querySelector('.settings').scrollTo(0, 99999));
  await shot('15-utvecklarmeny-planbok');

  // Steps 4 and 5, reached with the dev menu's step buttons.
  await p.evaluate(() => document.querySelector('.dev')?.scrollIntoView());
  if (await p.getByRole('button', { name: 'Till steg 4' }).isEnabled()) {
    await p.getByRole('button', { name: 'Till steg 4' }).click();
    await shot('16-brev-steg4');
    await closeLetters();
  }
  await shot('17-startpaket');
  await clickIf(dialog().getByText('Inte nu'));
  await p.getByRole('button', { name: 'Till steg 5' }).click();
  await shot('18-brev-anfall');
  await closeLetters();
  await p.getByRole('button', { name: 'Byn' }).click();
  await shot('19-anfall-varning');
  await p.waitForTimeout(61000);
  await shot('20-efter-anfallet');
  await closeLetters();
  await shot('21-byn-efter-anfallet');
  await p.getByRole('button', { name: 'Avsluta' }).click();
  await shot('22-avsluta-tjat');
  await p.getByRole('button', { name: 'Avsluta ändå' }).click();
  await shot('23-enkat');
  const n = await p.locator('fieldset').count();
  for (let i = 0; i < n; i++) {
    await p.locator(`input[name=p${i}][value="3"]`).check({ force: true });
    await p.locator(`input[name=q${i}]`).nth(1).check({ force: true });
  }
  await p.getByRole('button', { name: 'Skicka svaren' }).click();
  await shot('24-tack');
  await b.close();
})();
