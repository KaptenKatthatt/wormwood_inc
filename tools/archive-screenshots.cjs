// Takes the report screenshot set from a running game (phone size).
// Usage: node tools/archive-screenshots.cjs <out-dir/> [url]
const { chromium, devices } = require('playwright');
const D = process.argv[2];
const URL = process.argv[3] ?? 'https://wormwood.84.247.143.6.sslip.io/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: D + n + '.png' }); };
  await p.goto(URL);
  await shot('01-samtycke');
  await p.getByText('Ja, det går bra').click();
  await shot('02-byn-tom');
  await p.getByRole('button', { name: /Bygg \(30 min/ }).click();
  await p.waitForTimeout(4000);
  await shot('03-byn-bygger-med-pris');
  await p.getByRole('button', { name: /Klart nu/ }).click();
  await p.waitForTimeout(300);
  await shot('04-byn-kopt-klart');
  await p.getByRole('button', { name: 'Pussel' }).click();
  await p.waitForTimeout(800);
  await p.mouse.click(200, 400);
  await shot('05-pussel');
  await p.getByRole('button', { name: /Spela nivå/ }).click();
  await shot('06-pussel-liv-anvant');
  await p.waitForTimeout(4000);
  await p.getByRole('button', { name: 'Inställningar' }).click();
  await shot('07-installningar');
  await p.evaluate(() => document.querySelector('.settings').scrollTo(0, 9999));
  await shot('08-utvecklarmeny');
  const ios = await b.newContext({ ...devices['iPhone 15'] });
  const q = await ios.newPage();
  await q.goto(URL + '#installningar');
  await q.getByText('Nej tack').click();
  await q.waitForTimeout(700);
  await q.screenshot({ path: D + '09-iphone-installationsguide.png' });
  await b.close();
})();
