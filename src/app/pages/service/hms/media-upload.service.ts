import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpRequest, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PresignedUrlResponse {
    url: string;
    key: string;
    expiresIn: number;
}

export interface UploadProgress {
    percent: number;
    loaded: number;
    total: number;
}

@Injectable({ providedIn: 'root' })
export class MediaUploadService {
    private http = inject(HttpClient);
    private readonly mediaBase = `${environment.hmsApiUrl}/media`;

    private authHeaders(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    /** Request a presigned S3 PUT URL for uploading a file */
    getUploadUrl(key: string, contentType: string): Observable<PresignedUrlResponse> {
        return this.http
            .post<PresignedUrlResponse>(`${this.mediaBase}/upload-url`, { key, contentType }, { headers: this.authHeaders() })
            .pipe(catchError(this.handleError));
    }

    /** Request a presigned S3 GET URL for downloading/viewing a file */
    getDownloadUrl(key: string): Observable<PresignedUrlResponse> {
        return this.http
            .get<PresignedUrlResponse>(`${this.mediaBase}/download-url`, { headers: this.authHeaders(), params: { key } })
            .pipe(catchError(this.handleError));
    }

    /**
     * Upload a file directly to S3 via presigned PUT URL.
     * Returns an observable that emits upload progress then completes.
     */
    uploadToS3(presignedUrl: string, file: File): Observable<UploadProgress> {
        const req = new HttpRequest('PUT', presignedUrl, file, {
            reportProgress: true,
            headers: new HttpHeaders({ 'Content-Type': file.type }),
        });

        return this.http.request(req).pipe(
            filter((event) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
            map((event) => {
                if (event.type === HttpEventType.UploadProgress) {
                    const total = event.total ?? file.size;
                    return { percent: Math.round((100 * event.loaded) / total), loaded: event.loaded, total };
                }
                return { percent: 100, loaded: file.size, total: file.size };
            }),
            catchError(this.handleError),
        );
    }

    /**
     * Convenience: get presigned URL then upload the file.
     * Generates a unique key using entity type + file name.
     */
    uploadFile(entityType: 'lab-results' | 'radiology', entityId: string, file: File): Observable<{ key: string; url: string }> {
        const ext = file.name.split('.').pop() ?? 'bin';
        const key = `${entityType}/${entityId}/${Date.now()}.${ext}`;

        return new Observable((observer) => {
            this.getUploadUrl(key, file.type).subscribe({
                next: ({ url }) => {
                    this.uploadToS3(url, file).subscribe({
                        next: (progress) => {
                            if (progress.percent === 100) {
                                observer.next({ key, url: `${url.split('?')[0]}` });
                                observer.complete();
                            }
                        },
                        error: (err) => observer.error(err),
                    });
                },
                error: (err) => observer.error(err),
            });
        });
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'Upload failed';
        return throwError(() => new Error(message));
    }
}
