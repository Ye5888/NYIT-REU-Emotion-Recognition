/**
 * Session state as React context — the only cross-screen coupling in the app.
 * Screens read/write the session; they never know about each other.
 *
 * `assignment` starts empty and is filled by resolveAssignment once the
 * protocol has loaded (see use-experiment-data). Everything before the task
 * step runs fine without it.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { emptyConsent } from './consent';
import type { SessionState } from './types';

const PROTOCOL_VERSION = 'v1';

function makeSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function createSession(): SessionState {
  const seed = makeSeed();
  return {
    sessionId: `s_${seed.toString(36)}_${Date.now().toString(36)}`,
    protocolVersion: PROTOCOL_VERSION,
    seed,
    consent: emptyConsent(),
    assignment: { probeTiming: 'immediate', probeOrder: [], caseStudies: [] },
    forcedChoices: [],
    probes: [],
    assessments: [],
    recordingStartedAt: null,
    marks: [],
  };
}

type SessionPatch = Partial<SessionState> | ((s: SessionState) => SessionState);

interface SessionContextValue {
  session: SessionState;
  update: (patch: SessionPatch) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(createSession);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      update: (patch) =>
        setSession((s) => (typeof patch === 'function' ? patch(s) : { ...s, ...patch })),
      reset: () => setSession(createSession()),
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
