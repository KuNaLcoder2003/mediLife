import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../lib/format";

interface QueryState<T> {
  key: string | null;
  data?: T;
  error?: string;
}

/**
 * Minimal data-fetching hook. `key` identifies the request: when it changes the
 * fetcher runs again; pass null to skip. `previous` keeps the last result around
 * so lists don't flash empty while a new search loads.
 */
export function useQuery<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<QueryState<T>>({ key: null });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestKey = key === null ? null : `${key}#${nonce}`;

  useEffect(() => {
    if (requestKey === null) return;
    const controller = new AbortController();
    fetcherRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key: requestKey, data });
      },
      (err: unknown) => {
        if (!controller.signal.aborted) setState({ key: requestKey, error: errorMessage(err) });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const settled = requestKey !== null && state.key === requestKey;
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: settled ? state.data : undefined,
    error: settled ? state.error : undefined,
    loading: requestKey !== null && !settled,
    previous: state.data,
    reload,
  };
}
