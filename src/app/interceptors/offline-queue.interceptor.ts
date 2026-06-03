import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OfflineService } from '@/services/offline.service';
import { HelpersService } from '@/services/helpers-service';
import { markOfflineEnqueue, uuid } from '@/services/offline-db';

/**
 * Offline mutation interceptor (Phase C).
 *
 * - Only intercepts mutating HTTP methods on our own API host.
 * - When offline:
 *     1. Saves the request to the IndexedDB queue (see OfflineService.enqueue).
 *     2. Returns a synthetic 202 "Queued offline" response, with the body
 *        echoed so the caller's success path can run (optimistic UI).
 *     3. Shows a toast.
 * - When online: passes through normally (auth + network errors still surface).
 *
 * Cognito/OIDC calls go to a different host and are never queued.
 * Document uploads PUT directly to S3 and are NOT queued in Phase C.
 */
const API_HOST = 'execute-api.us-east-1.amazonaws.com';
const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export const offlineQueueInterceptor: HttpInterceptorFn = (req, next) => {
    const offline = inject(OfflineService);
    const helpers = inject(HelpersService);

    const isMutating = MUTATING.has(req.method.toUpperCase());
    const isApi = req.url.includes(API_HOST);

    // Attach X-Client-Request-Id on every mutating API call (online + offline)
    // so the backend can dedupe replays / accidental double-submits.
    let workingReq = req;
    if (isMutating && isApi && !req.headers.has('X-Client-Request-Id')) {
        workingReq = req.clone({ setHeaders: { 'X-Client-Request-Id': uuid() } });
    }

    if (!isMutating || !isApi) return next(workingReq);
    if (!offline.isOffline()) return next(workingReq);

    // Mark synchronously so HelpersService.notifySuccess can suppress the
    // component's "Created/Updated" toast that would otherwise stack on top of
    // the "Saved offline" toast below.
    markOfflineEnqueue();

    // Persist + notify. Fire-and-forget; the synthetic response below makes the
    // caller think the save succeeded so the UI doesn't get stuck.
    offline.enqueue(workingReq).then(
        () => helpers.notifyInfo('Saved offline', 'Will sync when connection is back.'),
        () => helpers.notifyError('Save Failed', 'Could not queue the request offline.')
    );

    // Echo the body so optimistic UI keeps the fields the user typed.
    const body =
        workingReq.body && typeof workingReq.body === 'object'
            ? { ...(workingReq.body as object), _offlineQueued: true }
            : { _offlineQueued: true };

    return of(
        new HttpResponse({
            status: 202,
            statusText: 'Queued offline',
            url: workingReq.urlWithParams,
            body
        })
    ) as unknown as Observable<any>;
};
