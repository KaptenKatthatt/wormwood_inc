/**
 * A short, readable test code derived from the random player id. The tester
 * can read it out from Settings to have their data deleted; the log carries
 * the same code, so only the test leader can tie it to a person.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I

export function testCode(playerId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < playerId.length; i++) {
    h ^= playerId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let h2 = h ^ 0x9e3779b9;
  let out = '';
  for (let i = 0; i < 6; i++) {
    const src = i < 3 ? h : h2;
    out += ALPHABET[(src >>> ((i % 3) * 5)) & 31];
    if (i === 2) h2 = Math.imul(h2 ^ (h2 >>> 15), 0x2c1b3c6d) >>> 0;
  }
  return out;
}
