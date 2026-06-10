import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TiryaqLoaderComponent
 *
 * Animated brand loading overlay. Two modes:
 *  - fullPage (default false): overlays its nearest `position:relative` parent.
 *  - fullPage=true           : fixed overlay covering the entire viewport.
 *
 * Usage:
 *   <app-tiryaq-loader [loading]="loading" message="Loading patients…" />
 *   <app-tiryaq-loader [loading]="loading" [fullPage]="true" />
 */
@Component({
    selector: 'app-tiryaq-loader',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (loading) {
            <div class="tl-overlay" [class.tl-fullpage]="fullPage">
                <div class="tl-box">

                    <!-- ── Animated logo ─────────────────────────────── -->
                    <div class="tl-logo-wrap">
                        <!--
                            Cross SVG only — "Akwadona" text is rendered as HTML
                            for crisp sub-pixel browser text rendering.
                            viewBox "0 0 100 100" gives generous coordinate space.
                        -->
                        <svg viewBox="0 0 100 100"
                             class="tl-svg"
                             xmlns="http://www.w3.org/2000/svg"
                             shape-rendering="geometricPrecision"
                             aria-hidden="true">
                            <!-- Vertical bar -->
                            <rect x="35" y="5" width="30" height="90" rx="8" fill="#3EBE78"/>
                            <!-- Horizontal bar -->
                            <rect x="5"  y="35" width="90" height="30" rx="8" fill="#3EBE78"/>
                            <!--
                                ECG line runs across the horizontal bar (y=50).
                                Path total length ≈ 100 units.
                                dasharray="100 50" → 100-unit visible stroke, 50-unit gap.
                                Animating dashoffset 150→0 sweeps it across once per cycle.
                            -->
                            <path class="tl-ecg"
                                  d="M8,50 L30,50 L36,35 L43,65 L49,50 L92,50"
                                  stroke="white"
                                  stroke-width="4"
                                  fill="none"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-dasharray="100 50"
                                  stroke-dashoffset="150"
                                  shape-rendering="geometricPrecision"/>
                        </svg>

                        <!-- Brand name — crisp HTML text, not SVG text -->
                        <span class="tl-brand">Akwadona</span>
                    </div>

                    <!-- ── Loading message ───────────────────────────── -->
                    @if (message) {
                        <p class="tl-msg">{{ message }}</p>
                    }

                    <!-- ── Bouncing dots ──────────────────────────────── -->
                    <div class="tl-dots" aria-label="Loading">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>

                </div>
            </div>
        }
    `,
    styles: [`
        /* ── Overlay ──────────────────────────────────────────────── */
        .tl-overlay {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.90);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 999;
            border-radius: inherit;
        }

        /* Inline mode — covers the nearest position:relative parent */
        .tl-overlay:not(.tl-fullpage) {
            position: absolute;
            inset: 0;
        }

        /* Full-page mode */
        .tl-fullpage {
            position: fixed;
            inset: 0;
            z-index: 9999;
            border-radius: 0;
        }

        /* ── Content box ──────────────────────────────────────────── */
        .tl-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
        }

        /* ── Logo wrapper — drives the overall pulse ─────────────── */
        .tl-logo-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            /* GPU-composited layer: no repaints on scale animation */
            will-change: transform;
            transform: translateZ(0);
            animation: tl-breathe 2.2s ease-in-out infinite;
        }

        .tl-svg {
            width: 110px;
            height: 110px;
            /* Avoid blurry filter — use a subtle box-shadow on the wrapper instead */
            overflow: visible;
        }

        /* ── ECG running line ─────────────────────────────────────── */
        .tl-ecg {
            will-change: stroke-dashoffset;
            animation: tl-run 1.8s linear infinite;
        }

        /* ── Brand name (crisp HTML rendering) ───────────────────── */
        .tl-brand {
            font-family: 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif;
            font-size: 1.35rem;
            font-weight: 700;
            color: #1F2937;
            letter-spacing: -0.5px;
            line-height: 1;
            /* Force sub-pixel anti-aliasing */
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* ── Loading message ──────────────────────────────────────── */
        .tl-msg {
            font-family: 'Segoe UI', 'Inter', Arial, sans-serif;
            font-size: 0.8rem;
            color: #6B7280;
            margin: 0;
            letter-spacing: 0.04em;
            -webkit-font-smoothing: antialiased;
        }

        /* ── Three bouncing dots ─────────────────────────────────── */
        .tl-dots {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .tl-dots span {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #3EBE78;
            will-change: transform, opacity;
            animation: tl-bounce 1.4s ease-in-out infinite;
        }
        .tl-dots span:nth-child(2) { animation-delay: 0.18s; }
        .tl-dots span:nth-child(3) { animation-delay: 0.36s; }

        /* ── Keyframes ───────────────────────────────────────────── */

        /* Gentle pulse on the whole logo block */
        @keyframes tl-breathe {
            0%, 100% { transform: scale(1)    translateZ(0); }
            50%       { transform: scale(1.05) translateZ(0); }
        }

        /*
         * ECG running line:
         * stroke-dasharray="100 50" → 100-unit visible stroke, 50-unit gap (total = 150).
         * dashoffset 150→0 sweeps the segment across the path cleanly each cycle.
         */
        @keyframes tl-run {
            0%   { stroke-dashoffset: 150; }
            100% { stroke-dashoffset: 0;   }
        }

        /* Bouncing dots */
        @keyframes tl-bounce {
            0%, 80%, 100% { transform: translateY(0)    translateZ(0); opacity: 0.4; }
            40%            { transform: translateY(-8px) translateZ(0); opacity: 1;   }
        }
    `]
})
export class TiryaqLoaderComponent {
    /** Show or hide the loader */
    @Input() loading = true;

    /** Text shown below the logo. Pass empty string to hide. */
    @Input() message = 'Loading…';

    /**
     * false (default): overlays the nearest position:relative parent.
     * true           : covers the full viewport (position:fixed).
     */
    @Input() fullPage = false;
}
