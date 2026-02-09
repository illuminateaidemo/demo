/* ============================================================
   Project Intelligence Platform - useApi Hook
   Generic hook for API calls with loading / error / data state.
   ============================================================ */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ApiError } from '../services/api';

// ─── Types ───────────────────────────────────────────────────

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  statusCode: number | null;
}

interface UseApiReturn<T, A extends unknown[]> extends UseApiState<T> {
  /** Trigger the API call. Returns the data on success, throws on failure. */
  execute: (...args: A) => Promise<T>;
  /** Reset state to initial values. */
  reset: () => void;
  /** Manually set the data (useful for optimistic updates). */
  setData: (data: T | null) => void;
}

// ─── Hook ────────────────────────────────────────────────────

/**
 * Custom hook to wrap an async API function with loading, error, and data state.
 *
 * @example
 * const { data: projects, isLoading, error, execute } = useApi(api.projects.list);
 *
 * useEffect(() => { execute({ status: 'ACTIVE' }); }, [execute]);
 */
export function useApi<T, A extends unknown[]>(
  apiFunction: (...args: A) => Promise<T>,
  options?: {
    /** If true, resets previous data when a new call starts. Default: false */
    resetOnExecute?: boolean;
    /** Callback on successful completion */
    onSuccess?: (data: T) => void;
    /** Callback on error */
    onError?: (error: string) => void;
  }
): UseApiReturn<T, A> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
    statusCode: null,
  });

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);
  // Track the latest call to handle race conditions
  const callIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: A): Promise<T> => {
      const currentCallId = ++callIdRef.current;

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
          statusCode: null,
          ...(options?.resetOnExecute ? { data: null } : {}),
        }));
      }

      try {
        const data = await apiFunction(...args);

        // Only update state if this is still the latest call and component is mounted
        if (mountedRef.current && currentCallId === callIdRef.current) {
          setState({ data, isLoading: false, error: null, statusCode: 200 });
          options?.onSuccess?.(data);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.detail
            : err instanceof Error
            ? err.message
            : 'An unexpected error occurred';

        const statusCode = err instanceof ApiError ? err.status : null;

        if (mountedRef.current && currentCallId === callIdRef.current) {
          setState({
            data: null,
            isLoading: false,
            error: errorMessage,
            statusCode,
          });
          options?.onError?.(errorMessage);
        }

        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFunction]
  );

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState({ data: null, isLoading: false, error: null, statusCode: null });
    }
  }, []);

  const setData = useCallback((data: T | null) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, data }));
    }
  }, []);

  return { ...state, execute, reset, setData };
}

// ─── Convenience: useApiOnMount ──────────────────────────────

/**
 * Automatically calls the API function on component mount.
 *
 * @example
 * const { data: clients, isLoading } = useApiOnMount(api.clients.list, [{ is_active: true }]);
 */
export function useApiOnMount<T, A extends unknown[]>(
  apiFunction: (...args: A) => Promise<T>,
  args?: A,
  options?: {
    resetOnExecute?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  }
): UseApiReturn<T, A> {
  const hook = useApi<T, A>(apiFunction, options);
  const executedRef = useRef(false);

  useEffect(() => {
    if (!executedRef.current) {
      executedRef.current = true;
      if (args) {
        hook.execute(...args);
      } else {
        hook.execute(...([] as unknown as A));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return hook;
}

export default useApi;
