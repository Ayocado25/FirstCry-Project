import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

// ── Generic API hook ─────────────────────────────────────────
export function useApi(apiFn, deps = [], { immediate = true, onSuccess, onError } = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError]     = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      const result = res.data?.data ?? res.data;
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      setError(msg);
      onError?.(msg);
      return null;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return { data, loading, error, execute, setData };
}

// ── Paginated list hook ───────────────────────────────────────
export function usePagination(apiFn, defaultParams = {}) {
  const [items, setItems]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [params, setParams]       = useState({ page: 1, limit: 20, ...defaultParams });

  const fetch = useCallback(async (overrides = {}) => {
    const merged = { ...params, ...overrides };
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(merged);
      setItems(res.data?.data ?? []);
      setPagination(res.data?.pagination ?? null);
      setParams(merged);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load data';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiFn, params]);

  useEffect(() => { fetch(); }, []); // eslint-disable-line

  const goToPage = (page) => fetch({ page });
  const search   = (search) => fetch({ page: 1, search });
  const filter   = (filters) => fetch({ page: 1, ...filters });
  const refresh  = () => fetch();

  return { items, pagination, loading, error, goToPage, search, filter, refresh, params };
}

// ── Debounce hook ─────────────────────────────────────────────
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Local storage hook ────────────────────────────────────────
export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = (value) => {
    const toStore = value instanceof Function ? value(stored) : value;
    setStored(toStore);
    localStorage.setItem(key, JSON.stringify(toStore));
  };

  return [stored, setValue];
}

// ── Toggle hook ───────────────────────────────────────────────
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue  = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  return [value, toggle, setTrue, setFalse];
}

// ── Form state hook ───────────────────────────────────────────
export function useForm(initialValues = {}) {
  const [values, setValues]   = useState(initialValues);
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const setField = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const reset = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  };

  return { values, errors, touched, setErrors, handleChange, handleBlur, setField, reset, setValues };
}

// ── Click outside hook ────────────────────────────────────────
export function useClickOutside(handler) {
  const ref = useRef(null);
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler(e);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [handler]);
  return ref;
}

// ── Window size hook ──────────────────────────────────────────
export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}
