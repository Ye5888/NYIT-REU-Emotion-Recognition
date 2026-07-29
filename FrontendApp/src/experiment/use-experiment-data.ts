/**
 * Loads the protocol and the definitions it references, and resolves this
 * participant's assignment once. Runs after login, since definition endpoints
 * are authenticated.
 */
import { useEffect, useState } from 'react';

import { api } from './api';
import { resolveAssignment } from './assignment';
import { persist } from './persistence';
import { useSession } from './session';
import type { CaseStudy, ProbeQuestion, TaskTrial } from './types';

export interface ExperimentData {
  caseStudy: CaseStudy;
  trials: TaskTrial[];
  probeQuestions: Record<string, ProbeQuestion>;
  condition: string;
}

export function useExperimentData() {
  const { session, update } = useSession();
  const [data, setData] = useState<ExperimentData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const protocol = await api.getProtocol(session.protocolVersion);
        const assignment = resolveAssignment(protocol, session.seed);

        const first = assignment.caseStudies[0];
        if (!first) throw new Error('protocol lists no case studies');

        const [caseStudy, trials, probeList] = await Promise.all([
          api.getCaseStudy(first.caseStudyId),
          api.getCaseStudyTrials(first.caseStudyId),
          api.getProbeQuestions(),
        ]);

        if (cancelled) return;

        const byId = Object.fromEntries(probeList.map((q) => [q.id, q]));
        update({ assignment });
        // The realized draw is persisted rather than recomputed: the seed makes
        // it reproducible, but only against a protocol that has not changed
        // since. Storing it means the run stays interpretable either way.
        persist(session, { kind: 'sessionPatch', patch: { assignment } });
        setData({
          caseStudy,
          trials,
          probeQuestions: byId,
          condition: first.condition,
        });
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Resolved once per session; re-running would redraw the assignment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]);

  return { data, error };
}
