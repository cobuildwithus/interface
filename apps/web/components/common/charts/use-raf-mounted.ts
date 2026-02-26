"use client";

import { useEffect, useState } from "react";

export const useRafMounted = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return mounted;
};
