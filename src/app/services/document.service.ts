import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Config } from './config';

export interface DocumentFolder {
    id: string;
    name: string;
}

export interface DocumentFile {
    key: string;
    fileName: string;
    folder: string;
    uploadedBy: string;
    size: number;
    lastModified: string;
}

export interface UploadUrlResponse {
    uploadUrl: string;
    key: string;
    expiresIn: number;
}

export interface DownloadUrlResponse {
    downloadUrl: string;
    expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
    // CHANGE THIS to your API Gateway URL
    private path = 'documents';

    constructor(
        private http: HttpClient,
        private oidc: OidcSecurityService
    ) {}

    /**
     * Get the list of available folders
     */
    getFolders(): Observable<DocumentFolder[]> {
        const url = Config.buildUrl(this.path);
        return this.authGet<{ folders: DocumentFolder[] }>(`${url}/folders`).pipe(
            map(res => res.folders)
        );
    }

    /**
     * List files in a specific folder
     */
    listFiles(folder: string): Observable<DocumentFile[]> {
        const url = Config.buildUrl(this.path);
        return this.authGet<{ files: DocumentFile[] }>(`${url}/list?folder=${folder}`).pipe(
            map(res => res.files)
        );
    }

    /**
     * Upload a file to S3 via pre-signed URL
     * Returns an Observable that emits upload progress (0-100)
     */
    uploadFile(file: File, folder: string): Observable<{ progress: number; key?: string }> {
        const url = Config.buildUrl(this.path);
        return new Observable(observer => {
            // Step 1: Get pre-signed upload URL from Lambda
            this.oidc.getAccessToken().subscribe(token => {
                const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

                this.http.post<UploadUrlResponse>(`${url}/upload-url`, {
                    folder,
                    fileName: file.name,
                    contentType: file.type || 'application/octet-stream',
                    fileSize: file.size
                }, { headers }).subscribe({
                    next: (res) => {
                        // Step 2: Upload directly to S3 using the pre-signed URL
                        const xhr = new XMLHttpRequest();
                        xhr.open('PUT', res.uploadUrl, true);
                        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const progress = Math.round((event.loaded / event.total) * 100);
                                observer.next({ progress });
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                observer.next({ progress: 100, key: res.key });
                                observer.complete();
                            } else {
                                observer.error(new Error(`Upload failed with status ${xhr.status}`));
                            }
                        };

                        xhr.onerror = () => {
                            observer.error(new Error('Upload failed'));
                        };

                        xhr.send(file);
                    },
                    error: (err) => observer.error(err)
                });
            });
        });
    }

    /**
     * Get a download URL for a file
     */
    getDownloadUrl(key: string): Observable<string> {
        const url = Config.buildUrl(this.path);
        return this.authPost<DownloadUrlResponse>(`${url}/download-url`, { key }).pipe(
            map(res => res.downloadUrl)
        );
    }

    /**
     * Download a file (opens in new tab or triggers download)
     */
    downloadFile(key: string): void {
        this.getDownloadUrl(key).subscribe(url => {
            window.open(url, '_blank');
        });
    }

    /**
     * Delete a file
     */
    deleteFile(key: string): Observable<any> {
        const url = Config.buildUrl(this.path);
        return this.oidc.getAccessToken().pipe(
            switchMap(token => {
                const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
                return this.http.delete(`${url}/delete`, {
                    headers,
                    body: { key }
                });
            })
        );
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ── Private helpers ──

    private authGet<T>(url: string): Observable<T> {
        return this.oidc.getAccessToken().pipe(
            switchMap(token => {
                const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
                return this.http.get<T>(url, { headers });
            })
        );
    }

    private authPost<T>(url: string, body: any): Observable<T> {
        return this.oidc.getAccessToken().pipe(
            switchMap(token => {
                const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
                return this.http.post<T>(url, body, { headers });
            })
        );
    }
}