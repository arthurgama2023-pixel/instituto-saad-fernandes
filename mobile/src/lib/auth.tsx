// Contexto de sessão do paciente. Guarda o Bearer token (via useStorageState) e
// expõe signIn/signOut. O _layout usa `token` como guard do Stack.Protected.

import { createContext, useContext, type PropsWithChildren } from "react";
import { useStorageState } from "./storage";

const TOKEN_KEY = "sd_patient_token";

type Session = {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<Session>({
  token: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export function useSession(): Session {
  return useContext(AuthContext);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, token], setToken] = useStorageState(TOKEN_KEY);

  return (
    <AuthContext.Provider
      value={{
        token,
        isLoading,
        signIn: (t) => setToken(t),
        signOut: () => setToken(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
