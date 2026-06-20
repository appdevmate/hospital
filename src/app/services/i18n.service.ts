import { Injectable, inject, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

/**
 * Akwadona i18n service (Step I).
 *
 * Owns the active language for the app:
 *   - Reads the saved language from localStorage on boot.
 *   - Falls back to the browser's first preferred language.
 *   - Falls back to English if no match.
 *   - Persists every change to localStorage so it survives a reload.
 *   - Toggles  <html dir="rtl">  for Arabic and swaps PrimeNG's RTL CSS root
 *     so the whole UI mirrors automatically (icons, calendars, menus).
 *
 * Future: also write the choice to Cognito `custom:locale` so it follows
 * the user across devices.
 */

export const SUPPORTED_LANGS = [
    { code: 'en', label: 'English',  rtl: false, flag: '🇬🇧' },
    { code: 'ar', label: 'العربية',  rtl: true,  flag: '🇶🇦' },
    { code: 'fr', label: 'Français', rtl: false, flag: '🇫🇷' },
    { code: 'es', label: 'Español',  rtl: false, flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch',  rtl: false, flag: '🇩🇪' },
    { code: 'nl', label: 'Nederlands', rtl: false, flag: '🇳🇱' }
] as const;

export type LangCode = typeof SUPPORTED_LANGS[number]['code'];

const STORAGE_KEY = 'akw:lang';
const DEFAULT_LANG: LangCode = 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {
    private translate = inject(TranslateService);
    private document  = inject(DOCUMENT);

    /** Reactive signal — components can subscribe in templates. */
    readonly current = signal<LangCode>(DEFAULT_LANG);

    constructor() {
        // 1. Tell ngx-translate which languages exist + the fallback.
        this.translate.addLangs(SUPPORTED_LANGS.map(l => l.code));
        this.translate.setDefaultLang(DEFAULT_LANG);

        // 2. Decide the initial language.
        const initial = this.detectInitialLang();
        this.setLang(initial);

        // 3. Whenever current changes, sync ngx-translate + <html dir>.
        effect(() => {
            const code = this.current();
            this.translate.use(code);
            const isRtl = SUPPORTED_LANGS.find(l => l.code === code)?.rtl ?? false;
            this.document.documentElement.setAttribute('lang', code);
            this.document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
            // Also toggle a body class for any custom CSS hooks (PrimeNG
            // respects the <html dir> attribute natively).
            this.document.body.classList.toggle('rtl', isRtl);
        });
    }

    setLang(code: LangCode): void {
        if (!SUPPORTED_LANGS.some(l => l.code === code)) return;
        try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
        this.current.set(code);
    }

    private detectInitialLang(): LangCode {
        // 1. Saved choice wins.
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && SUPPORTED_LANGS.some(l => l.code === saved)) {
                return saved as LangCode;
            }
        } catch { /* ignore */ }

        // 2. Browser preference.
        const nav = (typeof navigator !== 'undefined') ? navigator : ({} as Navigator);
        const candidates = ([] as string[])
            .concat(nav.languages || [])
            .concat(nav.language ? [nav.language] : []);
        for (const lang of candidates) {
            const two = (lang || '').toLowerCase().slice(0, 2);
            if (SUPPORTED_LANGS.some(l => l.code === two)) return two as LangCode;
        }

        // 3. English fallback.
        return DEFAULT_LANG;
    }
}
