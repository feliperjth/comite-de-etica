"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /comite is now unified with /revisores (same password, same role)
export default function ComiteRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/revisores"); }, [router]);
  return null;
}
