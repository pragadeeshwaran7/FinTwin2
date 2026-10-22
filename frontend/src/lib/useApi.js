import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Fetch `path` (re-running when `deps` change); returns { data, error, loading, reload }. */
export function useApi(path, { query, deps = [], enabled = true, select = (d) => d.data } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const selectRef = useRef(select);
  selectRef.current = select;
  const key = JSON.stringify([path, query]);

  const load = useCallback(() => {
    if (!enabled || !path) return () => {};
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { query })
      .then((d) => !cancelled && setState({ data: selectRef.current(d), error: null, loading: false }))
      .catch((e) => !cancelled && setState((s) => ({ ...s, error: e, loading: false })));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ...deps]);

  useEffect(() => load(), [load]);
  return { ...state, reload: load };
}
