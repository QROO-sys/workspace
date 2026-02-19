import React, { useEffect } from "react";

export default function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  const Wrapped: React.FC<P> = (props) => {
    useEffect(() => {
      // keep your existing auth logic here
      // (redirect, token check, etc.)
    }, []);

    return <Component {...props} />;
  };

  Wrapped.displayName = `withAuth(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
}

