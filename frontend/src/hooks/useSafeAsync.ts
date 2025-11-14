import { useEffect, useRef } from 'react';

/**
 * Custom hook to track if a component is still mounted
 * Helps prevent state updates on unmounted components
 */
export const useIsMounted = () => {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};

/**
 * Custom hook for safe async operations
 * Prevents memory leaks and errors from async operations after component unmount
 */
export const useSafeAsync = () => {
  const isMountedRef = useIsMounted();

  const safeAsync = <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    return new Promise((resolve, reject) => {
      asyncFn()
        .then((result) => {
          if (isMountedRef.current) {
            resolve(result);
          } else {
            resolve(null);
          }
        })
        .catch((error) => {
          if (isMountedRef.current) {
            reject(error);
          }
        });
    });
  };

  return { safeAsync, isMounted: isMountedRef };
};

/**
 * Custom hook for safer intervals that automatically clean up
 */
export const useSafeInterval = (
  callback: () => void,
  delay: number | null
) => {
  const isMountedRef = useIsMounted();
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const interval = setInterval(() => {
      if (isMountedRef.current) {
        callbackRef.current();
      }
    }, delay);

    return () => clearInterval(interval);
  }, [delay, isMountedRef]);
};