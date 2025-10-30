'use client';

import { useEffect } from 'react';

/**
 * Custom hook to set the page title dynamically in client components
 * @param title - The title to set for the page
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Task Management`;

    // Cleanup function to restore the previous title when component unmounts
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export default usePageTitle;