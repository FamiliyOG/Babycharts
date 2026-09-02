/**
 * src/utils/passwordStrength.js
 * Evaluates password strength and passphrase quality according to NIST SP 800-63B guidelines (Issue #245).
 */

export function calculatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { score: 0, label: '', color: 'bg-slate-700', percentage: 0, isValid: false };
  }

  const trimmed = password.trim();
  const length = trimmed.length;
  let score = 0;

  // Length is the primary strength metric in NIST SP 800-63B
  if (length >= 10) score += 1;
  if (length >= 14) score += 1;
  if (length >= 18) score += 1;

  // Character variety adds entropy
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (varietyCount >= 2) score += 1;
  if (varietyCount >= 3) score += 1;

  const finalScore = Math.min(4, Math.max(0, score));

  const STRENGTH_MAP = [
    {
      score: 0,
      label: 'Zu kurz (min. 10 Zeichen)',
      color: 'bg-rose-600',
      percentage: 20,
      isValid: false,
    },
    { score: 1, label: 'Schwach', color: 'bg-orange-500', percentage: 40, isValid: length >= 10 },
    { score: 2, label: 'Mittel', color: 'bg-amber-500', percentage: 60, isValid: true },
    { score: 3, label: 'Stark', color: 'bg-cyan-500', percentage: 80, isValid: true },
    {
      score: 4,
      label: 'Sehr sicher (Passphrase)',
      color: 'bg-emerald-500',
      percentage: 100,
      isValid: true,
    },
  ];

  return STRENGTH_MAP[finalScore];
}
