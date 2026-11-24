"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "./api";

// 화면에서 목록을 불러오고 다시 불러오는 공통 훅
export function useData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, reload: load, setData };
}
