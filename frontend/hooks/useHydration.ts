'use client';

import React, { useEffect, useState } from 'react';

/**
 * Custom hook to handle hydration issues with browser extensions
 * This prevents hydration mismatches caused by browser extensions
 * that inject attributes into the DOM
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after the first render
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Component wrapper to suppress hydration warnings for specific elements
 * that are known to have browser extension attributes
 */
export function SuppressHydrationWarning({ 
  children, 
  ...props 
}: { 
  children: React.ReactNode;
  [key: string]: any;
}): React.JSX.Element {
  return (
    <div suppressHydrationWarning {...(props as any)}>
      {children}
    </div>
  );
}
