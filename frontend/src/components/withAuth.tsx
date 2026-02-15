import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This client-side check should only supplement, not replace, middleware for security!
export function withAuth<P>(Component: React.ComponentType<P>) {
  return function Protected(props: P) {
    const router = useRouter();
    useEffect(() => {
      fetch("/api/auth/me").then(res => {
        if (!res.ok) router.replace("/login?from=" + window.location.pathname);
      });
    }, []);
    return <Component {...props} />;
  };
}