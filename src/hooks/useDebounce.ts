import debounce from "debounce";
import { useCallback, useEffect, useMemo, useRef } from "react";

export const useDebounce = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => unknown,
  delay = 1000
) => {
  const ref = useRef<(...args: TArgs) => unknown>(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const fn = (...args: TArgs) => {
      ref.current?.(...args);
    };

    return debounce(fn, delay);
  }, [delay]);

  return useCallback(debouncedCallback, [debouncedCallback]);
};

export default useDebounce;
