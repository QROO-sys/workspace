import React from "react";

/**
 * Temporary safe wrapper:
 * Does NOT use hooks, window, localStorage, or navigation.
 * Use /owner/layout.tsx client guard for auth gating.
 */
export default function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithAuth(props: P) {
    return <Component {...props} />;
  };
}
