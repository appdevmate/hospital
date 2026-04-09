import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { Config } from './config';
let DocumentService = class DocumentService {
    http;
    oidc;
    // CHANGE THIS to your API Gateway URL
    path = 'documents';
    constructor(http, oidc) {
        this.http = http;
        this.oidc = oidc;
    }
    /**
     * Get the list of available folders
     */
    getFolders() {
        const url = Config.buildUrl(this.path);
        return this.authGet(`${url}/folders`).pipe(map(res => res.folders));
    }
    /**
     * List files in a specific folder
     */
    listFiles(folder) {
        const url = Config.buildUrl(this.path);
        return this.authGet(`${url}/list?folder=${folder}`).pipe(map(res => res.files));
    }
    /**
     * Upload a file to S3 via pre-signed URL
     * Returns an Observable that emits upload progress (0-100)
     */
    uploadFile(file, folder) {
        const url = Config.buildUrl(this.path);
        return new Observable(observer => {
            // Step 1: Get pre-signed upload URL from Lambda
            this.oidc.getAccessToken().subscribe(token => {
                const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
                this.http.post(`${url}/upload-url`, {
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
                            }
                            else {
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
    getDownloadUrl(key) {
        const url = Config.buildUrl(this.path);
        return this.authPost(`${url}/download-url`, { key }).pipe(map(res => res.downloadUrl));
    }
    /**
     * Download a file (opens in new tab or triggers download)
     */
    downloadFile(key) {
        this.getDownloadUrl(key).subscribe(url => {
            window.open(url, '_blank');
        });
    }
    /**
     * Delete a file
     */
    deleteFile(key) {
        const url = Config.buildUrl(this.path);
        return this.oidc.getAccessToken().pipe(switchMap(token => {
            const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
            return this.http.delete(`${url}/delete`, {
                headers,
                body: { key }
            });
        }));
    }
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    // ── Private helpers ──
    authGet(url) {
        return this.oidc.getAccessToken().pipe(switchMap(token => {
            const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
            return this.http.get(url, { headers });
        }));
    }
    authPost(url, body) {
        return this.oidc.getAccessToken().pipe(switchMap(token => {
            const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
            return this.http.post(url, body, { headers });
        }));
    }
};
DocumentService = __decorate([
    Injectable({ providedIn: 'root' })
], DocumentService);
export { DocumentService };
