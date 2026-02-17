import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentService, DocumentFile, DocumentFolder } from '@/pages/service/document.service';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
    selector: 'app-document-manager',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        FileUploadModule,
        ProgressBarModule,
        ToastModule,
        ConfirmDialogModule,
        TagModule,
        ToolbarModule,
        CardModule,
        SelectModule,
        TooltipModule
    ],
    template: `
        <p-toast />
        <p-confirmdialog />

        <div class="grid grid-cols-12 gap-8">
            <!-- Header Card -->
            <div class="col-span-12">
                <p-card>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 class="text-2xl font-bold m-0">Document Manager</h2>
                            <p class="text-muted-color mt-1 mb-0">Upload and manage medical documents securely</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <p-select
                                [options]="folders"
                                [(ngModel)]="selectedFolder"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Select Folder"
                                (onChange)="onFolderChange()"
                                class="w-64"
                            />
                        </div>
                    </div>
                </p-card>
            </div>

            <!-- Upload Section -->
            <div class="col-span-12">
                <p-card header="Upload Documents">
                    <div class="flex flex-col gap-4">
                        @if (!selectedFolder) {
                            <div class="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                                <i class="pi pi-info-circle mr-2"></i>
                                Please select a folder first before uploading documents.
                            </div>
                        } @else {
                            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <input
                                    type="file"
                                    #fileInput
                                    (change)="onFileSelected($event)"
                                    [accept]="acceptedTypes"
                                    class="hidden"
                                    multiple
                                />
                                <p-button
                                    label="Choose Files"
                                    icon="pi pi-upload"
                                    (onClick)="fileInput.click()"
                                    [disabled]="uploading"
                                />
                                <span class="text-muted-color text-sm">
                                    Allowed: PDF, Images, Word, Excel, Text — Max 50 MB per file
                                </span>
                            </div>

                            @if (uploadProgress > 0 && uploading) {
                                <div class="flex flex-col gap-2">
                                    <span class="text-sm font-medium">
                                        Uploading {{ currentUploadName }}... {{ uploadProgress }}%
                                    </span>
                                    <p-progressbar [value]="uploadProgress" />
                                </div>
                            }
                        }
                    </div>
                </p-card>
            </div>

            <!-- Files Table -->
            <div class="col-span-12">
                <p-card>
                    <p-table
                        [value]="files"
                        [loading]="loadingFiles"
                        [paginator]="true"
                        [rows]="10"
                        [rowsPerPageOptions]="[5, 10, 25]"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} documents"
                        [globalFilterFields]="['fileName']"
                        responsiveLayout="scroll"
                    >
                        <ng-template #caption>
                            <div class="flex items-center justify-between">
                                <span class="text-lg font-semibold">
                                    {{ getSelectedFolderName() }}
                                    <span class="text-muted-color font-normal text-base ml-2">({{ files.length }} files)</span>
                                </span>
                                <p-button
                                    icon="pi pi-refresh"
                                    rounded
                                    text
                                    (onClick)="loadFiles()"
                                    [disabled]="!selectedFolder"
                                    pTooltip="Refresh"
                                />
                            </div>
                        </ng-template>

                        <ng-template #header>
                            <tr>
                                <th pSortableColumn="fileName" style="min-width: 250px">
                                    File Name <p-sortIcon field="fileName" />
                                </th>
                                <th pSortableColumn="size" style="width: 120px">
                                    Size <p-sortIcon field="size" />
                                </th>
                                <th pSortableColumn="lastModified" style="width: 180px">
                                    Uploaded <p-sortIcon field="lastModified" />
                                </th>
                                <th style="width: 150px">Actions</th>
                            </tr>
                        </ng-template>

                        <ng-template #body let-file>
                            <tr>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <i [class]="getFileIcon(file.fileName)" class="text-lg"></i>
                                        <span class="font-medium">{{ getDisplayName(file.fileName) }}</span>
                                    </div>
                                </td>
                                <td>{{ documentService.formatFileSize(file.size) }}</td>
                                <td>{{ file.lastModified | date:'medium' }}</td>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <p-button
    [icon]="downloadingKeys.has(file.key) ? 'pi pi-spin pi-spinner' : 'pi pi-download'"
    rounded
    text
    severity="info"
    (onClick)="download(file)"
    [disabled]="downloadingKeys.has(file.key)"
    [pTooltip]="downloadingKeys.has(file.key) ? 'Downloading...' : 'Download'"
/>
                                        <p-button
                                            icon="pi pi-trash"
                                            rounded
                                            text
                                            severity="danger"
                                            (onClick)="confirmDelete(file)"
                                            pTooltip="Delete"
                                        />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>

                        <ng-template #emptymessage>
                            <tr>
                                <td colspan="4">
                                    <div class="flex flex-col items-center justify-center py-8 text-muted-color">
                                        <i class="pi pi-folder-open text-4xl mb-4"></i>
                                        @if (!selectedFolder) {
                                            <span>Select a folder to view documents</span>
                                        } @else {
                                            <span>No documents in this folder yet</span>
                                        }
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </p-card>
            </div>
        </div>
    `
})
export class DocumentManagerComponent implements OnInit {
    folders: DocumentFolder[] = [];
    selectedFolder: string = '';
    files: DocumentFile[] = [];
    loadingFiles = false;
    uploading = false;
    uploadProgress = 0;
    currentUploadName = '';
    downloadingKeys = new Set<string>();

    acceptedTypes = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.dcm';

    constructor(
        public documentService: DocumentService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit() {
        this.documentService.getFolders().subscribe({
            next: (folders) => this.folders = folders,
            error: () => {
                // Fallback if API is not ready
                this.folders = [
                    { id: 'doctors-documents', name: 'Doctors Documents' },
                    { id: 'patients-documents', name: 'Patients Documents' },
                    { id: 'lab-results', name: 'Lab Results' },
                    { id: 'prescriptions', name: 'Prescriptions' },
                    { id: 'radiology-images', name: 'Radiology Images' }
                ];
            }
        });
    }

    onFolderChange() {
        this.loadFiles();
    }

    loadFiles() {
        if (!this.selectedFolder) return;
        this.loadingFiles = true;
        this.documentService.listFiles(this.selectedFolder).subscribe({
            next: (files) => {
              if (!files) {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load files' });
                this.files = [];
                this.loadingFiles = false;
              } else if(files && files.length > 0) {
                this.files = files;
                this.loadingFiles = false;
              } else {
                this.messageService.add({ severity: 'warn', summary: 'Info', detail: 'No files in the selected directory' });
                this.files = [];
                this.loadingFiles = false;
              }
                
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load files' });
                this.loadingFiles = false;
            }
        });
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const filesToUpload = Array.from(input.files);
        this.uploadFiles(filesToUpload, 0);

        // Reset file input so the same file can be selected again
        input.value = '';
    }

    private uploadFiles(files: File[], index: number) {
        if (index >= files.length) {
            this.uploading = false;
            this.uploadProgress = 0;
            this.loadFiles(); // Refresh the file list
            return;
        }

        const file = files[index];
        this.uploading = true;
        this.currentUploadName = file.name;
        this.uploadProgress = 0;

        this.documentService.uploadFile(file, this.selectedFolder).subscribe({
            next: (event) => {
                this.uploadProgress = event.progress;
                if (event.key) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Uploaded',
                        detail: `${file.name} uploaded successfully`
                    });
                    // Upload next file
                    this.uploadFiles(files, index + 1);
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Upload Failed',
                    detail: `Failed to upload ${file.name}: ${err.message}`
                });
                // Continue with next file even if one fails
                this.uploadFiles(files, index + 1);
            }
        });
    }

download(file: DocumentFile) {
    this.downloadingKeys.add(file.key);
    this.documentService.getDownloadUrl(file.key).subscribe({
        next: (url) => {
            window.open(url, '_blank');
            this.downloadingKeys.delete(file.key);
        },
        error: (err) => {
            this.downloadingKeys.delete(file.key);
            this.messageService.add({
                severity: 'error',
                summary: 'Download Failed',
                detail: 'Failed to generate download link'
            });
        }
    });
}

    confirmDelete(file: DocumentFile) {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete "${this.getDisplayName(file.fileName)}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.documentService.deleteFile(file.key).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Deleted',
                            detail: 'File deleted successfully'
                        });
                        this.loadFiles();
                    },
                    error: () => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to delete file'
                        });
                    }
                });
            }
        });
    }

    getSelectedFolderName(): string {
        const folder = this.folders.find(f => f.id === this.selectedFolder);
        return folder?.name || 'Documents';
    }

    getDisplayName(fileName: string): string {
        // Remove the timestamp prefix (e.g., "1708123456789_report.pdf" → "report.pdf")
        const parts = fileName.split('_');
        if (parts.length > 1 && /^\d+$/.test(parts[0])) {
            return parts.slice(1).join('_');
        }
        return fileName;
    }

    getFileIcon(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const iconMap: Record<string, string> = {
            pdf: 'pi pi-file-pdf text-red-500',
            doc: 'pi pi-file-word text-blue-500',
            docx: 'pi pi-file-word text-blue-500',
            xls: 'pi pi-file-excel text-green-500',
            xlsx: 'pi pi-file-excel text-green-500',
            jpg: 'pi pi-image text-orange-500',
            jpeg: 'pi pi-image text-orange-500',
            png: 'pi pi-image text-orange-500',
            gif: 'pi pi-image text-orange-500',
            webp: 'pi pi-image text-orange-500',
            txt: 'pi pi-file text-gray-500',
            dcm: 'pi pi-image text-purple-500'
        };
        return iconMap[ext] || 'pi pi-file text-gray-500';
    }
}