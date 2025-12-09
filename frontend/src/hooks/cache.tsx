import { useRef } from "react";

const useCache = <T,R>(cb: (data: T) => R) => {
  const cache = useRef<Map<T, R>>(new Map());

  return (data: T) => {
    const cacheVal = cache.current.get(data);

    if (cacheVal !== undefined) return cacheVal;

    const result = cb(data);

    cache.current.set(data, result);

    return result;
  }
}

export default useCache;