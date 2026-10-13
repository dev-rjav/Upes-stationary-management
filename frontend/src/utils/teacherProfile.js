// Remembers the teacher's identity on their own device so they don't re-enter
// SAP ID / name / department on every visit. Teachers never log in — this is a
// convenience cookie only, holding no secrets. Cleared via "Not you?".

const COOKIE = 'teacher_profile';
const MAX_AGE_DAYS = 90;

export function saveTeacherProfile({ sap_id, name, cluster, cluster_id }) {
  if (!sap_id) return;
  const payload = JSON.stringify({ sap_id, name, cluster, cluster_id });
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE}=${encodeURIComponent(payload)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function loadTeacherProfile() {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1)));
    if (parsed && parsed.sap_id && parsed.cluster_id) return parsed;
  } catch {
    // corrupt cookie — ignore
  }
  return null;
}

export function clearTeacherProfile() {
  document.cookie = `${COOKIE}=;path=/;max-age=0;SameSite=Lax`;
}
