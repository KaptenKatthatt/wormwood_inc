import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Every close cross is a circle: the shape lives in one rule in app.css. */
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.svelte') ? [join(dir, e.name)] : [],
  );

describe('close cross', () => {
  it('has one shared round shape', () => {
    const css = readFileSync('src/app.css', 'utf8');
    const rule = /button\.close-x \{([^}]*)\}/.exec(css)?.[1] ?? '';
    for (const part of ['width: 44px', 'height: 44px', 'min-width: 44px', 'min-height: 44px', 'border-radius: 50%'])
      expect(rule).toContain(part);
    // Drawn bars, centred by the rule itself, instead of a letter placed by its font.
    expect(rule).toContain('font-size: 0');
    expect(css).toMatch(/button\.close-x::before, button\.close-x::after \{[^}]*left: 50%; top: 50%/);
  });

  it('is used by every button that shows a cross', () => {
    const wrong: string[] = [];
    for (const file of files('src')) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<button\b([^>]*)>\s*[✕✖×]\s*<\/button>/g))
        if (!/class="[^"]*\bclose-x\b/.test(m[1])) wrong.push(file);
    }
    expect(wrong).toEqual([]);
  });
});
