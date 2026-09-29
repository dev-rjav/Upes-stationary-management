import { useEffect, useState } from "react";
import { teacherCaps } from "../api/teacher";

// D8: server is the source of truth; this mirror is UX only.
export default function useCapCheck(sapId) {
  const [caps, setCaps] = useState(null);
  const [week, setWeek] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sapId) {
      setCaps(null);
      return;
    }
    setLoading(true);
    teacherCaps(sapId)
      .then((r) => {
        setCaps(r.data.caps);
        setWeek(r.data.week);
        setError(null);
      })
      .catch((e) => setError(e.response?.data?.error || "cap check failed"))
      .finally(() => setLoading(false));
  }, [sapId]);

  const remainingFor = (capRow, qty) => {
    if (!capRow || capRow.is_bulk) return null;
    return {
      monthly: capRow.monthly_left != null ? capRow.monthly_left - (qty || 0) : null,
      weekly: capRow.weekly_left != null ? capRow.weekly_left - (qty || 0) : null,
    };
  };

  return { caps, week, error, loading, remainingFor };
}