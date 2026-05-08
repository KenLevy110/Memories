import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  isFirebaseClientConfigured,
  readMemoriesClaims,
  signOutFirebase,
  subscribeFirebaseUser,
} from "./firebase";

export function useFirebaseSession(): {
  configured: boolean;
  user: User | null;
  loading: boolean;
  defaultClientId: string | null;
  signOut: () => Promise<void>;
} {
  const configured = isFirebaseClientConfigured();
  const [user, setUser] = useState<User | null>(null);
  // When Firebase env is missing, stay non-loading; when present, loading until auth resolves.
  const [loading, setLoading] = useState(() => configured);
  const [defaultClientId, setDefaultClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      return;
    }

    return subscribeFirebaseUser((next) => {
      setUser(next);
      if (!next) {
        setDefaultClientId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      void readMemoriesClaims(next)
        .then((claims) => {
          const cid = typeof claims["client_id"] === "string" ? claims["client_id"].trim() : "";
          setDefaultClientId(cid.length > 0 ? cid : null);
        })
        .catch(() => {
          setDefaultClientId(null);
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, [configured]);

  return {
    configured,
    user,
    loading,
    defaultClientId,
    signOut: signOutFirebase,
  };
}
