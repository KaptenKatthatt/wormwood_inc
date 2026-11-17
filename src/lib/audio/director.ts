/**
 * Decides which sound belongs to which moment, by listening to the game's
 * event log and its stores, so the game logic itself needs no sound code.
 * The board's own sounds (swap, match, cascade) are played by Match3Scene.
 */
import { get } from 'svelte/store';
import { onLog } from '../log/logger';
import { purse } from '../state/game';
import { initSound, play, puzzleMusicFor, setMusic } from './sound';

/** Hooks whose 'yes' means the player paid for something. */
const PAID = new Set(['gemPacks', 'topUpGold', 'skipWait', 'buyLives', 'extraMoves', 'boosters', 'timedOffer', 'starterPack', 'repair', 'shield', 'soldiers']);

export function initSoundDirector(startTab: string): void {
  initSound();
  setMusic('village', startTab === 'byn');

  onLog((name, d) => {
    switch (name) {
      case 'view':
        if (d.tab === 'byn') setMusic('village', true);
        else if (d.tab === 'pussel') setMusic('village', false);
        break;
      case 'level_start':
        if (typeof d.level === 'number') setMusic(puzzleMusicFor(d.level));
        break;
      case 'level_won': play('win'); break;
      case 'level_lost': play('lose'); break;
      case 'build_start': play('buildStart'); break;
      case 'timer_done': if (d.kind === 'build') play('buildDone'); break;
      case 'attack_result': if (d.result === 'defended') play('defended'); break;
      case 'hook': {
        const hook = String(d.hook);
        if (hook === 'extraMoves' && d.response === 'shown') play('near');
        else if (hook === 'attack' && d.response === 'shown') play('attack');
        else if (hook === 'figures' && d.response === 'shown') play('notify');
        else if (d.response === 'yes' && PAID.has(hook)) play('purchase');
        break;
      }
    }
  });

  // Gold and gems coming in are the reward sounds (counted, not spent).
  let last = get(purse);
  purse.subscribe((p) => {
    if (p.gold > last.gold) play('coins');
    if (p.gems > last.gems) play('gems');
    last = p;
  });
}
