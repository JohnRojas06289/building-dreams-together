import { useEffect, useState } from "react";
import { authStore, type AppUser } from "@/lib/auth-store";

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(authStore.getUser());
    setLoading(false);
    const sync = () => setUser(authStore.getUser());
    window.addEventListener("agrosync_auth", sync);
    return () => window.removeEventListener("agrosync_auth", sync);
  }, []);

  return { user, loading };
}
