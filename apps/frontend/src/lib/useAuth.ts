import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

function subscribeToAuth(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const callback = () => onStoreChange();
  window.addEventListener("storage", callback);
  window.addEventListener("focus", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("focus", callback);
  };
}

function getAuthTokenSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("uptimeToken");
}

export function useAuth() {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeToAuth,
    getAuthTokenSnapshot,
    () => null
  );
  const isAuthenticated = Boolean(token);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  return { isAuthenticated, isLoading: false };
}
