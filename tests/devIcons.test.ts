import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The dev app's icons are the normal icons with DEV written on them; when
// the normal icons change, run `python3 tools/dev-icons.py` again.
describe('dev icons', () => {
  it('are made from the current icons', () => {
    const made = JSON.parse(readFileSync('public/icons/dev/source.json', 'utf8')) as Record<string, string>;
    for (const [name, hash] of Object.entries(made)) {
      const now = createHash('sha256').update(readFileSync(`public/icons/${name}`)).digest('hex');
      expect(now, `public/icons/${name} changed: run python3 tools/dev-icons.py`).toBe(hash);
    }
  });
});
