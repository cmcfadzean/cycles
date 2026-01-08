"use client";

import { useOrganization } from "@clerk/nextjs";

export function useIsAdmin() {
  const { membership, isLoaded } = useOrganization();
  
  return {
    isAdmin: membership?.role === "org:admin",
    isLoaded,
  };
}

