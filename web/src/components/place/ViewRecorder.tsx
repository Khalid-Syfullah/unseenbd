"use client";

import { useEffect } from "react";
import { recordView, type ViewTarget } from "@/lib/history";

/** Records a page view in the signed-in visitor's history (does nothing until accounts exist). */
export function ViewRecorder({ placeId, districtId }: ViewTarget) {
  useEffect(() => {
    recordView({ placeId, districtId });
  }, [placeId, districtId]);
  return null;
}
