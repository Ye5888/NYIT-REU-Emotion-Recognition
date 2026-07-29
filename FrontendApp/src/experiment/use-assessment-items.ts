/**
 * Loads the assessment items for one stage.
 *
 * Separate from useExperimentData on purpose: the pretest runs before the task
 * and has no business fetching case studies, trials or probe questions, and it
 * must not touch the participant's assignment.
 *
 * Item order comes from the protocol, not from the backend's document order —
 * assessmentItemIds is the authored sequence, and it stays fixed across
 * participants so that item position is not a lurking variable.
 */
import { useEffect, useState } from 'react';

import { api } from './api';
import type { AssessmentItem } from './types';

type Stage = AssessmentItem['stage'];

export function useAssessmentItems(version: string, stage: Stage) {
  const [items, setItems] = useState<AssessmentItem[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [protocol, all] = await Promise.all([
          api.getProtocol(version),
          api.getAssessmentItems(),
        ]);

        if (cancelled) return;

        const byId = new Map(all.map((item) => [item.id, item]));
        const ordered = (protocol.assessmentItemIds[stage] ?? [])
          .map((id) => byId.get(id))
          .filter((item): item is AssessmentItem => item !== undefined);

        if (ordered.length === 0) throw new Error(`protocol lists no ${stage} items`);

        setItems(ordered);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version, stage]);

  return { items, error };
}
