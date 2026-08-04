/**
 * Resolves what one participant actually sees.
 *
 * Two mechanisms, deliberately separated:
 *
 *  - Stochastic, driven by `seed` — probe timing (per participant) and probe
 *    order. These are things randomization is the right tool for.
 *
 *  - Systematic, driven by a participant index — which condition each case
 *    study runs under. D'Mello §3.1.2 counterbalances this with a Graeco-Latin
 *    Square so that across the pool, every concept appears in every condition
 *    and in every serial position equally often. A random draw does not give
 *    that, and at REU-scale N the imbalance is visible.
 *
 * The square is NOT implemented yet — see allocateConditions below. With one
 * case study it degenerates, so the demo draws from the seed instead.
 */
import type { Assignment, Condition, ProbeTiming, Protocol } from './types';

const CONDITIONS: Condition[] = ['TT', 'TF', 'FT', 'FF'];

/** mulberry32 — small, fast, deterministic for a given seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], next: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * TODO: replace with the Graeco-Latin Square keyed on participant index.
 * Placeholder draws from the seed so the demo runs end to end.
 */
function allocateConditions(caseStudyIds: string[], next: () => number) {
  return caseStudyIds.map((caseStudyId) => ({
    caseStudyId,
    condition: CONDITIONS[Math.floor(next() * CONDITIONS.length)],
  }));
}

export function resolveAssignment(protocol: Protocol, seed: number): Assignment {
  const next = rng(seed);

  const probeTiming: ProbeTiming =
    protocol.policy.probeTiming === 'alwaysImmediate'
      ? 'immediate'
      : protocol.policy.probeTiming === 'alwaysRetrospective'
        ? 'retrospective'
        : next() < 0.5
          ? 'immediate'
          : 'retrospective';

  const probeOrder =
    protocol.policy.probeOrder === 'fixed'
      ? [...protocol.probeIds]
      : shuffle(protocol.probeIds, next);

  return {
    probeTiming,
    probeOrder,
    caseStudies: allocateConditions(protocol.caseStudyIds, next),
  };
}
