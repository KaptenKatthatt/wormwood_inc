import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { TUT_STEPS, currentTutStep, startTutorial, tutEvent, tutText, tutorial } from '../src/lib/tutorial';

describe('the introduction', () => {
  beforeEach(() => startTutorial());

  it('asks for three practice moves after the first one, counting down', () => {
    tutEvent('moved');
    const step = currentTutStep()!;
    expect(step.id).toBe('practice');
    expect(tutText(step, get(tutorial).left)).toBe('Prova tre drag till.');
    tutEvent('moved');
    expect(tutText(step, get(tutorial).left)).toBe('Två drag till.');
    tutEvent('moved');
    expect(tutText(step, get(tutorial).left)).toBe('Ett drag till.');
    tutEvent('moved');
    expect(currentTutStep()!.id).toBe('play');
    expect(get(tutorial).left).toBeUndefined();
  });

  it('goes on to the village when the challenge ends during the practice moves', () => {
    tutEvent('moved');
    tutEvent('moved');
    tutEvent('levelEnded');
    expect(currentTutStep()!.id).toBe('village');
  });

  it('keeps the frame on the board through the first move and the practice moves', () => {
    expect(TUT_STEPS.filter((s) => s.hint).map((s) => s.id)).toEqual(['swap', 'practice']);
  });
});
