/**
 * Shared form constants — keep these as the single source of truth so every
 * "phone", "gender", "blood type", "QID" input across the app validates the
 * same way. Import from `@/shared/form-constants` in new forms.
 */

// ── Masks ───────────────────────────────────────────────────────────────────
/** International phone mask used by every phone field in the app. */
export const PHONE_MASK = '+999 9999 9999';
/** Qatar ID mask — 11 digits, unmasked when read. */
export const QID_MASK = '99999999999';

// ── Option lists ────────────────────────────────────────────────────────────
export interface OptionItem<T extends string = string> { label: string; value: T; }

export const GENDER_OPTIONS: OptionItem[] = [
    { label: 'Male',   value: 'male'   },
    { label: 'Female', value: 'female' },
    { label: 'Other',  value: 'other'  }
];

export const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ── Validators / sanitizers (pure functions) ────────────────────────────────
/** Strip any character that is not a digit or leading + and trim. */
export function sanitizePhone(x: any): string | undefined {
    if (x == null) return undefined;
    const s = String(x).trim();
    if (!s) return undefined;
    // Keep leading + then digits only.
    const plus = s.startsWith('+') ? '+' : '';
    const digits = s.replace(/\D/g, '');
    return digits ? plus + digits : undefined;
}

/** Returns true for an 8–15 digit international phone after sanitization. */
export function isValidPhone(x: any): boolean {
    const s = sanitizePhone(x);
    if (!s) return false;
    const digitsOnly = s.replace(/\D/g, '');
    return digitsOnly.length >= 8 && digitsOnly.length <= 15;
}

/** Lightweight email validator — same regex used everywhere. */
export function isValidEmail(x: any): boolean {
    if (!x) return false;
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(x).trim());
}

/** 11-digit Qatar ID. */
export function isValidQid(x: any): boolean {
    if (!x) return false;
    return /^\d{11}$/.test(String(x).replace(/\D/g, ''));
}
