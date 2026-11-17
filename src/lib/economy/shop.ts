/** Prices (game design, section 3 "Butiken och priserna"). Gems are shown without kronor beside them on purpose. */
export interface GemPack { id: string; gems: number; kronor: number; tag?: string }

export const GEM_PACKS: GemPack[] = [
  { id: 'gems100', gems: 100, kronor: 20 },
  { id: 'gems300', gems: 300, kronor: 49, tag: 'Populärast' },
  { id: 'gems700', gems: 700, kronor: 99, tag: 'Bäst värde' },
];

export const PRICE = {
  extraMoves: 30,
  extraMovesCount: 5,
  oneLife: 20,
  fullLives: 60,
  shield: 100,
};

export const START = { gold: 100, gems: 30, kronor: 100 };

/** Gold for a won level; level 3 pays more. */
export function levelReward(levelId: number, multiplier: number): number {
  const base = [100, 100, 150][levelId - 1] ?? 100;
  return Math.round(base * multiplier);
}
