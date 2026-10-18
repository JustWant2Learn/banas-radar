"use client";

import { useEffect } from "react";
import { useProfileStore } from "@/store/useProfileStore";

export function ProfileHydrator() {
  const hydrate = useProfileStore((state) => state.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}
