/**
 * Records when something was *shown*, as against when it was answered.
 *
 * Kept separate from the response writers because a mark is not a response: it
 * has no value and no correctness, and it is written even if the participant
 * never answers.
 */
import { useCallback } from 'react';

import { useSession } from './session';
import type { CaptureMark } from './types';

export function useCaptureMarks() {
  const { update } = useSession();

  return useCallback(
    (kind: CaptureMark['kind'], refId: string) => {
      update((s) => ({ ...s, marks: [...s.marks, { kind, refId, at: Date.now() }] }));
    },
    [update],
  );
}
