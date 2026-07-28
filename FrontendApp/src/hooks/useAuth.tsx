import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AuthUser = Record<string, unknown> | null;

interface AuthContextValue {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);

  useEffect(() => {
    console.log("USER:",user);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      setUser,
      clearUser: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
