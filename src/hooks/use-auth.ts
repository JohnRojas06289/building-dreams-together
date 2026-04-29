import { useEffect, useState } from "react";
import { authStore, type AppUser } from "@/lib/auth-store";

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      try {
        const nextUser = await authStore.getUser();
        if (mounted) {
          setUser(nextUser);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void sync();
    const unsubscribe = authStore.onChange(() => {
      setLoading(true);
      void sync();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}
