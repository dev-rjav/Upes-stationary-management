import { useState } from 'react';
import { lookupSAP } from '../api/teacher';

export function useSAPLookup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const lookup = async (sapId) => {
    setLoading(true);
    setError(null);
    try {
      const r = await lookupSAP(sapId);
      setResult(r.data);
      return r.data;
    } catch (e) {
      setError(e.response?.data?.error || 'Lookup failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { lookup, loading, result, error, reset: () => setResult(null) };
}
