import { useCallback } from "react";
import { lookupTeacher } from "../api/teacher";

export default function useSAPLookup() {
  return useCallback(async (payload) => {
    const r = await lookupTeacher(payload);
    return r.data; // { teacher, created }
  }, []);
}