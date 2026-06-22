import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { TranslatePipe } from '@ngx-translate/core';

import { ScribeService, SoapDraft } from '@/services/scribe.service';

// Web Speech API typing — browser-native, free, supported in Chrome / Edge / Safari.
// We use it for Phase 1. Phase 2 swaps in Amazon Transcribe Medical streaming.
type SpeechRecognitionAlternative = { transcript: string; confidence: number };
type SpeechRecognitionResult = { isFinal: boolean; 0: SpeechRecognitionAlternative; length: number };
type SpeechRecognitionResultList = { length: number; item(i: number): SpeechRecognitionResult; [i: number]: SpeechRecognitionResult };
type SpeechRecognitionEvent = { resultIndex: number; results: SpeechRecognitionResultList };
type SpeechRecognition = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: any) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
};

declare global {
    interface Window {
        SpeechRecognition?: { new (): SpeechRecognition };
        webkitSpeechRecognition?: { new (): SpeechRecognition };
    }
}

type Status = 'idle' | 'recording' | 'processing' | 'review' | 'approved' | 'error';

@Component({
    selector: 'app-voice-scribe',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        CheckboxModule,
        TextareaModule,
        TagModule,
        DividerModule,
        ToastModule,
        ProgressBarModule,
        TranslatePipe
    ],
    providers: [MessageService],
    templateUrl: './voice-scribe.html',
    styleUrl: './voice-scribe.scss'
})
export class VoiceScribeComponent implements OnDestroy {
    private scribe = inject(ScribeService);
    private toast = inject(MessageService);

    // ── State ───────────────────────────────────────────────────────────
    consentGiven = signal(false);
    // ngModel can't bind to a signal's `()` invocation, so this mirror field
    // is what the checkbox writes to. The setter syncs it into the signal.
    get consentGivenModel(): boolean { return this.consentGiven(); }
    set consentGivenModel(v: boolean) { this.consentGiven.set(v); }

    sessionId = signal<string | null>(null);
    status = signal<Status>('idle');
    transcript = signal('');
    interimTranscript = signal('');
    errorMessage = signal('');
    // Non-fatal mic/speech notice shown inline in Step 2 — does NOT abort the
    // flow, so the doctor can keep typing the transcript when the mic misbehaves.
    micWarning = signal('');
    durationSec = signal(0);

    // ngModel mirror so the transcript box is directly editable. Typed / pasted
    // text is the fallback path when the browser speech service is unavailable.
    get transcriptModel(): string { return this.transcript(); }
    set transcriptModel(v: string) { this.transcript.set(v); }

    // Editable SOAP draft — kept as a plain object so [(ngModel)] works inside
    // the textareas without the immutable-signal-value gymnastics.
    soapDraft: SoapDraft | null = null;

    // ── Derived ─────────────────────────────────────────────────────────
    isRecording = computed(() => this.status() === 'recording');
    canStartRecording = computed(() => this.consentGiven() && !!this.sessionId() && this.status() === 'idle');
    fullTranscript = computed(() => (this.transcript() + ' ' + this.interimTranscript()).trim());
    // Generate is allowed whenever we have a session, aren't busy, and the
    // transcript (recorded OR typed) is long enough for the backend (>= 20 chars).
    canGenerate = computed(() =>
        !!this.sessionId() &&
        this.status() !== 'recording' &&
        this.status() !== 'processing' &&
        this.transcript().trim().length >= 20
    );

    // ── Speech recognition state ────────────────────────────────────────
    private recognition: SpeechRecognition | null = null;
    private startedAt = 0;
    private timerId: any = null;
    // Transient speech errors (network/aborted) are retried up to this many
    // times before we fall back to manual transcript entry.
    private speechRetries = 0;
    private readonly MAX_SPEECH_RETRIES = 3;

    // ── Browser support ─────────────────────────────────────────────────
    readonly browserSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    ngOnDestroy(): void {
        this.cleanupRecognition();
        if (this.timerId) clearInterval(this.timerId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Step 1: confirm consent + create session
    // ─────────────────────────────────────────────────────────────────────
    startSession() {
        if (!this.consentGiven()) {
            this.toast.add({ severity: 'warn', summary: 'Consent required', detail: 'Tick the consent checkbox first.' });
            return;
        }
        this.scribe.createSession({ consentGiven: true }).subscribe({
            next: (res) => {
                this.sessionId.set(res.sessionId);
                this.status.set('idle');
                this.toast.add({ severity: 'success', summary: 'Session ready', detail: 'You can now start recording.' });
            },
            error: (err) => {
                this.errorMessage.set(err?.error?.error || 'Failed to create session');
                this.status.set('error');
                this.toast.add({ severity: 'error', summary: 'Session failed', detail: this.errorMessage() });
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Step 2: record audio (Web Speech API for Phase 1)
    // ─────────────────────────────────────────────────────────────────────
    startRecording() {
        if (!this.canStartRecording()) return;
        if (!this.browserSupported) {
            this.errorMessage.set('Voice recognition not supported in this browser. Use Chrome or Edge.');
            this.status.set('error');
            return;
        }

        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;
        const r: SpeechRecognition = new Ctor();
        r.lang = 'en-US';
        r.continuous = true;
        r.interimResults = true;

        r.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let finalChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;
                if (result.isFinal) {
                    finalChunk += text + ' ';
                } else {
                    interim += text;
                }
            }
            if (finalChunk) {
                this.transcript.update((prev) => (prev + ' ' + finalChunk).trim());
                this.speechRetries = 0;   // a good result refills the retry budget
                this.micWarning.set('');
            }
            this.interimTranscript.set(interim);
        };
        r.onerror = (e) => {
            const errType = e?.error || 'unknown';
            console.error('Speech recognition error', e);

            // Fatal-ish: the browser/user blocked mic access. Stay in Step 2 so
            // the doctor can still type the transcript — just drop the live mic.
            if (errType === 'not-allowed' || errType === 'service-not-allowed') {
                this.micWarning.set('Microphone access is blocked. Allow it in the browser, or type / paste the transcript below and click Generate SOAP.');
                this.stopMic('idle');
                return;
            }

            // Benign: a pause in speech. Let onend auto-restart; don't penalise it.
            if (errType === 'no-speech') return;

            // Transient (network / aborted / audio-capture): keep status 'recording'
            // so onend's auto-restart reconnects, up to the retry budget.
            this.speechRetries++;
            if (this.speechRetries <= this.MAX_SPEECH_RETRIES) {
                this.micWarning.set('Speech service hiccup — reconnecting…');
                this.toast.add({ severity: 'warn', summary: 'Reconnecting…', detail: 'The speech service dropped; retrying.' });
                return;
            }

            // Out of retries: give up on the mic but keep the work. The doctor can
            // finish the transcript by typing and still generate the SOAP note.
            this.micWarning.set('Couldn’t reach the speech service. Type or paste the transcript below, then click Generate SOAP — your captured text is safe.');
            this.toast.add({ severity: 'warn', summary: 'Voice unavailable', detail: 'Switched to manual transcript.' });
            this.stopMic('idle');
        };
        r.onend = () => {
            // Auto-restart if still recording (Chrome auto-stops after a few minutes of silence).
            if (this.status() === 'recording') {
                try { r.start(); } catch (_) { /* ignore */ }
            }
        };

        this.recognition = r;
        // Keep any already-typed/captured transcript; live speech appends to it.
        this.interimTranscript.set('');
        this.soapDraft = null;
        this.micWarning.set('');
        this.speechRetries = 0;
        this.startedAt = Date.now();
        this.durationSec.set(0);
        this.timerId = setInterval(() => {
            this.durationSec.set(Math.floor((Date.now() - this.startedAt) / 1000));
        }, 500);

        try {
            r.start();
            this.status.set('recording');
        } catch (e: any) {
            this.errorMessage.set('Could not start microphone: ' + e.message);
            this.status.set('error');
        }
    }

    // Stop the mic but KEEP the transcript so it can be reviewed/edited and then
    // sent to the backend via Generate SOAP (decoupled from stopping).
    stopRecording() {
        this.stopMic('idle');
    }

    // Stops recognition + timer and folds any pending interim words into the
    // editable transcript. nextStatus is applied only if we were recording, so
    // we never clobber 'processing'/'review'.
    private stopMic(nextStatus: Status = 'idle') {
        const interim = this.interimTranscript().trim();
        if (interim) {
            this.transcript.update((prev) => (prev + ' ' + interim).trim());
            this.interimTranscript.set('');
        }
        this.cleanupRecognition();
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        if (this.status() === 'recording') {
            this.status.set(nextStatus);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Generate SOAP from the current transcript — recorded OR typed/pasted.
    // ─────────────────────────────────────────────────────────────────────
    generateSoap() {
        const sid = this.sessionId();
        if (!sid) return;

        // Make sure the mic is stopped and interim text is captured first.
        if (this.isRecording()) this.stopMic('idle');

        const transcript = this.transcript().trim();
        if (transcript.length < 20) {
            this.toast.add({ severity: 'warn', summary: 'Transcript too short', detail: 'Add at least a few sentences before generating.' });
            return;
        }

        this.status.set('processing');
        this.scribe.generateSoap(sid, { transcript, durationSec: this.durationSec() }).subscribe({
            next: (res) => {
                this.soapDraft = { ...res.soap };
                this.status.set('review');
                this.toast.add({ severity: 'success', summary: 'SOAP draft ready', detail: 'Review and edit before approving.' });
            },
            error: (err) => {
                this.errorMessage.set(err?.error?.error || 'SOAP generation failed');
                this.status.set('error');
                this.toast.add({ severity: 'error', summary: 'SOAP failed', detail: this.errorMessage() });
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Step 3: approve and audit
    // ─────────────────────────────────────────────────────────────────────
    approveSoap() {
        const sid = this.sessionId();
        const draft = this.soapDraft;
        if (!sid || !draft) return;

        this.scribe.approveSession(sid, { soap: draft }).subscribe({
            next: () => {
                this.status.set('approved');
                this.toast.add({ severity: 'success', summary: 'Approved', detail: 'SOAP signed off and audited.' });
            },
            error: (err) => {
                this.errorMessage.set(err?.error?.error || 'Approval failed');
                this.toast.add({ severity: 'error', summary: 'Approval failed', detail: this.errorMessage() });
            }
        });
    }

    resetForNewSession() {
        this.consentGiven.set(false);
        this.sessionId.set(null);
        this.status.set('idle');
        this.transcript.set('');
        this.interimTranscript.set('');
        this.soapDraft = null;
        this.errorMessage.set('');
        this.micWarning.set('');
        this.speechRetries = 0;
        this.durationSec.set(0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────
    private cleanupRecognition() {
        if (this.recognition) {
            try {
                this.recognition.onresult = null;
                this.recognition.onerror = null;
                this.recognition.onend = null;
                this.recognition.stop();
            } catch (_) { /* ignore */ }
            this.recognition = null;
        }
    }

    formattedDuration(): string {
        const s = this.durationSec();
        const mm = Math.floor(s / 60).toString().padStart(2, '0');
        const ss = (s % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    }

    statusLabel(): string {
        switch (this.status()) {
            case 'idle': return this.sessionId() ? 'Ready to record' : 'Awaiting consent';
            case 'recording': return 'Listening…';
            case 'processing': return 'Generating SOAP…';
            case 'review': return 'Review SOAP draft';
            case 'approved': return 'Approved & signed';
            case 'error': return 'Error';
        }
    }
}
