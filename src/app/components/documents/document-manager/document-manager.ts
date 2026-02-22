import { Component, OnInit, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DocumentService, DocumentFile, DocumentFolder } from '@/pages/service/document.service';
import { GenericTableComponent } from '@/pages/uikit/generic-table';
import { TableColumn, TableConfig } from '@/interfaces/tableplugin.interfaces';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ConfirmationService } from 'primeng/api';
import { HelpersService } from '@/services/helpers-service';

@Component({
    selector: 'app-document-manager',
    standalone: true,
    imports: [CommonModule, FormsModule, GenericTableComponent, ButtonModule, FileUploadModule, ProgressBarModule, ToastModule, ConfirmDialogModule, TagModule, ToolbarModule, CardModule, SelectModule, TooltipModule],
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
                            <p-select [options]="folders" [(ngModel)]="selectedFolder" optionLabel="name" optionValue="id" placeholder="Select Folder" (onChange)="onFolderChange()" class="w-64" />
                        </div>
                    </div>
                </p-card>
            </div>

            <!-- OLD Upload Section — kept for reference, uncomment to revert
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
                                <input type="file" #fileInput (change)="onFileSelected($event)" [accept]="acceptedTypes" class="hidden" multiple />
                                <p-button label="Choose Files" icon="pi pi-upload" (onClick)="fileInput.click()" [disabled]="uploading" />
                                <span class="text-muted-color text-sm"> Allowed: PDF, Images, Word, Excel </span>
                            </div>
                            @if (uploadProgress > 0 && uploading) {
                                <div class="flex flex-col gap-2">
                                    <span class="text-sm font-medium"> Uploading {{ currentUploadName }}... {{ uploadProgress }}% </span>
                                    <p-progressbar [value]="uploadProgress" />
                                </div>
                            }
                        }
                    </div>
                </p-card>
            </div>
            END OLD Upload Section -->

            <!-- NEW Upload Section — p-fileUpload with custom templates -->
            <div class="col-span-12">
                <p-card header="Upload Documents">
                    @if (!selectedFolder) {
                        <div class="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300">
                            <i class="pi pi-info-circle mr-2"></i>
                            Please select a folder first before uploading documents.
                        </div>
                    } @else {
                        <p-fileUpload #fileUploader [multiple]="true" [accept]="acceptedTypes" [customUpload]="true" (uploadHandler)="onUploadHandler($event, fileUploader)" [disabled]="uploading">
                            <!-- Toolbar: Choose / Upload All / Clear + hint text -->
                            <ng-template pTemplate="header" let-files let-chooseCallback="chooseCallback" let-clearCallback="clearCallback" let-uploadCallback="uploadCallback">
                                <div class="flex flex-wrap items-center gap-3 w-full">
                                    <p-button label="Choose Files" icon="pi pi-plus" [outlined]="true" (onClick)="chooseCallback()" [disabled]="uploading" />
                                    <p-button label="Upload All" icon="pi pi-cloud-upload" severity="success" (onClick)="uploadCallback()" [disabled]="!files || files.length === 0 || uploading" />
                                    <p-button label="Clear" icon="pi pi-times" severity="danger" [outlined]="true" (onClick)="clearCallback()" [disabled]="!files || files.length === 0 || uploading" />
                                    <span class="text-muted-color text-sm ml-auto hidden sm:block"> Allowed: PDF, Images, Word, Excel, Markdown </span>
                                </div>
                            </ng-template>

                            <!-- Content: drag-drop empty state or queued file list with per-file progress -->
                            <ng-template pTemplate="content" let-files let-removeFileCallback="removeFileCallback">
                                @if (!files || files.length === 0) {
                                    <div
                                        class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl text-muted-color cursor-pointer select-none transition-colors hover:border-primary hover:text-primary"
                                        (click)="fileUploader.choose()"
                                    >
                                        <i class="pi pi-cloud-upload text-5xl mb-3 text-primary"></i>
                                        <p class="m-0 text-lg font-medium">Drag & Drop files here</p>
                                        <p class="m-0 text-sm mt-1">or click to choose files</p>
                                    </div>
                                } @else {
                                    <div class="flex flex-col gap-2">
                                        @for (file of files; track file.name; let i = $index) {
                                            <div class="flex items-center gap-3 p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                                                <i [class]="getFileIcon(file.name)" class="text-2xl flex-shrink-0"></i>
                                                <div class="flex flex-col flex-1 min-w-0">
                                                    <span class="font-medium truncate">{{ file.name }}</span>
                                                    <span class="text-muted-color text-sm">{{ documentService.formatFileSize(file.size) }}</span>
                                                </div>
                                                @if (uploading && currentUploadName === file.name) {
                                                    <div class="flex items-center gap-2 w-40 flex-shrink-0">
                                                        <p-progressbar [value]="uploadProgress" class="flex-1" />
                                                        <span class="text-sm tabular-nums w-10 text-right">{{ uploadProgress }}%</span>
                                                    </div>
                                                } @else if (uploading) {
                                                    <i class="pi pi-clock text-muted-color flex-shrink-0" pTooltip="Waiting..."></i>
                                                } @else {
                                                    <p-button icon="pi pi-times" rounded text severity="danger" (onClick)="removeFileCallback($event, i)" pTooltip="Remove" />
                                                }
                                            </div>
                                        }
                                    </div>
                                }
                            </ng-template>
                        </p-fileUpload>
                    }
                </p-card>
            </div>

            <!-- Files Table -->
            <div class="col-span-12">
                <app-generic-table
                    [columns]="tableColumns"
                    [config]="tableConfig"
                    [data]="files"
                    [totalRecords]="files.length"
                    [loading]="loadingFiles"
                    [isLazy]="false"
                    dataKey="key"
                    [actionsTemplate]="rowActions"
                    [captionStart]="captionLeft"
                    [captionEnd]="captionRight"
                    [customTemplates]="customTemplates"
                    [selectedRows]="selectedFiles"
                    (selectionChange)="selectedFiles = $event"
                >
                    <!-- Left caption: folder name + file count -->
                    <ng-template #captionLeft>
                        <span class="text-base font-semibold">
                            {{ getSelectedFolderName() }}
                            <span class="text-muted-color font-normal ml-2">({{ files.length }} files)</span>
                        </span>
                    </ng-template>

                    <!-- Right caption: Delete Selected + Empty Folder + Refresh -->
                    <ng-template #captionRight>
                        @if (isDeveloper) {
                            <p-button label="Delete Selected" icon="pi pi-trash" severity="warn" (onClick)="confirmDeleteSelected()" [disabled]="selectedFiles.length === 0 || deletingAll" />
                            <p-button label="Empty Folder" [icon]="deletingAll ? 'pi pi-spin pi-spinner' : 'pi pi-trash'" severity="danger" (onClick)="confirmEmptyFolder()" [disabled]="!selectedFolder || files.length === 0 || deletingAll" />
                        }
                        <p-button icon="pi pi-refresh" rounded text (onClick)="loadFiles()" [disabled]="!selectedFolder" pTooltip="Refresh" />
                    </ng-template>

                    <!-- Custom cell: file name with icon -->
                    <ng-template #fileNameTpl let-row let-value="value">
                        <div class="flex items-center gap-2">
                            <i [class]="getFileIcon(row.fileName)" class="text-lg"></i>
                            <span class="font-medium">{{ getDisplayName(value) }}</span>
                        </div>
                    </ng-template>

                    <!-- Custom cell: human-readable file size -->
                    <ng-template #sizeTpl let-value="value">
                        {{ documentService.formatFileSize(value) }}
                    </ng-template>

                    <!-- Row actions: download + delete -->
                    <ng-template #rowActions let-row>
                        <p-button
                            [icon]="downloadingKeys.has(row.key) ? 'pi pi-spin pi-spinner' : 'pi pi-download'"
                            rounded
                            text
                            severity="info"
                            (onClick)="download(row)"
                            [disabled]="downloadingKeys.has(row.key)"
                            [pTooltip]="downloadingKeys.has(row.key) ? 'Downloading...' : 'Download'"
                        />
                        @if (isDeveloper) {
                            <p-button icon="pi pi-trash" rounded text severity="danger" (onClick)="confirmDelete(row)" pTooltip="Delete" />
                        }
                    </ng-template>
                </app-generic-table>
            </div>
        </div>
    `
})
export class DocumentManagerComponent implements OnInit, AfterViewInit {
    @ViewChild('fileNameTpl') fileNameTpl!: TemplateRef<any>;
    @ViewChild('sizeTpl') sizeTpl!: TemplateRef<any>;

    folders: DocumentFolder[] = [];
    selectedFolder: string = '';
    files: DocumentFile[] = [];
    loadingFiles = false;
    uploading = false;
    uploadProgress = 0;
    currentUploadName = '';
    downloadingKeys = new Set<string>();
    deletingAll = false;
    selectedFiles: DocumentFile[] = [];
    isDeveloper = false;

    acceptedTypes = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.dcm,.md';

    customTemplates: { [field: string]: TemplateRef<any> } = {};

    tableColumns: TableColumn[] = [
        { field: 'fileName', header: 'File Name', sortable: true, filterable: true, customTemplate: true },
        { field: 'size', header: 'Size', sortable: true, customTemplate: true },
        { field: 'lastModified', header: 'Uploaded', sortable: true, pipe: 'date', dateFormat: 'mediumDate' }
    ];

    tableConfig: TableConfig = {
        showGlobalSearch: true,
        showClearButton: false,
        showColumnPicker: false,
        pageSizeOptions: [10, 25, 50],
        defaultPageSize: 10,
        scrollHeight: '500px',
        emptyMessage: 'No documents in this folder yet.',
        showGridlines: false,
        rowHover: true,
        responsive: true,
        showResultsSummary: true,
        selectable: true,
        selectionMode: 'multiple',
        showSelectAll: true,
        showToolbar: false,
        editType: 'none'
    };

    constructor(
        public documentService: DocumentService,
        private helpers: HelpersService,
        private confirmationService: ConfirmationService,
    ) {
        const token = sessionStorage.getItem('accessToken') || '';
        if (this.isJwt(token)) {
            try {
                const payload = JSON.parse(this.b64url(token.split('.')[1]));
                const groups: string[] = payload['cognito:groups'] ?? [];
                if (groups.includes('Developers')) this.isDeveloper = true;
            } catch {}
        }
    }

    ngAfterViewInit() {
        this.customTemplates = {
            fileName: this.fileNameTpl,
            size: this.sizeTpl
        };
    }

    ngOnInit() {
        this.documentService.getFolders().subscribe({
            next: (folders) => (this.folders = folders),
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
                    this.helpers.notifyError('Error', 'Failed to load files');
                    this.files = [];
                    this.loadingFiles = false;
                } else if (files && files.length > 0) {
                    this.files = files;
                    this.loadingFiles = false;
                } else {
                    this.files = [];
                    this.loadingFiles = false;
                }
            },
            error: (err) => {
                if (err.error.message == 'Unauthorized') {
                    this.helpers.redirectToLogin();
                    return;
                } else {
                    this.helpers.notifyError(err.error.message, 'Please try again later');
                    this.loadingFiles = false;
                }
            }
        });
    }

    // OLD onFileSelected — kept for reference, uncomment to revert
    // onFileSelected(event: Event) {
    //     const input = event.target as HTMLInputElement;
    //     if (!input.files?.length) return;
    //     const filesToUpload = Array.from(input.files);
    //     this.uploadFiles(filesToUpload, 0);
    //     input.value = '';
    // }

    onUploadHandler(event: { files: File[] }, fileUploader: FileUpload) {
        this.uploadFiles(event.files, 0, fileUploader);
    }

    private uploadFiles(files: File[], index: number, fileUploader?: FileUpload) {
        if (index >= files.length) {
            this.uploading = false;
            this.uploadProgress = 0;
            fileUploader?.clear();
            this.loadFiles();
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
                    this.helpers.notifySuccess(`${file.name} uploaded successfully`);
                    this.uploadFiles(files, index + 1, fileUploader);
                }
            },
            error: (err) => {
                if (err?.error?.message == 'Unauthorized') {
                    this.helpers.redirectToLogin();
                    return;
                }
                this.helpers.notifyError('Upload Failed', `Failed to upload ${file.name}: ${err.message}`);
                this.uploadFiles(files, index + 1, fileUploader);
            }
        });
    }

    download(file: DocumentFile) {
        this.downloadingKeys.add(file.key);
        this.documentService.getDownloadUrl(file.key).subscribe({
            next: (url) => {
                fetch(url)
                    .then((res) => res.blob())
                    .then((blob) => {
                        const objectUrl = URL.createObjectURL(blob);
                        const anchor = document.createElement('a');
                        anchor.href = objectUrl;
                        anchor.download = this.getDisplayName(file.fileName);
                        anchor.click();
                        URL.revokeObjectURL(objectUrl);
                        this.downloadingKeys.delete(file.key);
                    })
                    .catch(() => {
                        this.downloadingKeys.delete(file.key);
                        this.helpers.notifyError('Download Failed', 'Failed to download file');
                    });
            },
            error: (err) => {
                if (err?.error?.message == 'Unauthorized') {
                    this.helpers.redirectToLogin();
                    return;
                }
                this.downloadingKeys.delete(file.key);
                this.helpers.notifyError('Download Failed', 'Failed to generate download link');
            }
        });
    }

    confirmDeleteSelected() {
        const count = this.selectedFiles.length;
        this.confirmationService.confirm({
            message: `Delete ${count} selected file(s)? This cannot be undone.`,
            header: 'Delete Selected',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.deletingAll = true;
                forkJoin(this.selectedFiles.map((f) => this.documentService.deleteFile(f.key))).subscribe({
                    next: () => {
                        this.helpers.notifySuccess(`${count} file(s) deleted`);
                        this.selectedFiles = [];
                        this.deletingAll = false;
                        this.loadFiles();
                    },
                    error: (err) => {
                        if (err?.error?.message == 'Unauthorized') {
                            this.helpers.redirectToLogin();
                            return;
                        }
                        this.helpers.notifyError('Error', 'Some files could not be deleted');
                        this.selectedFiles = [];
                        this.deletingAll = false;
                        this.loadFiles();
                    }
                });
            }
        });
    }

    confirmEmptyFolder() {
        this.confirmationService.confirm({
            message: `Delete all ${this.files.length} file(s) in "${this.getSelectedFolderName()}"? This cannot be undone.`,
            header: 'Empty Folder',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.deletingAll = true;
                forkJoin(this.files.map((f) => this.documentService.deleteFile(f.key))).subscribe({
                    next: () => {
                        this.helpers.notifySuccess(`All files in "${this.getSelectedFolderName()}" deleted`);
                        this.deletingAll = false;
                        this.loadFiles();
                    },
                    error: (err) => {
                        if (err?.error?.message == 'Unauthorized') {
                            this.helpers.redirectToLogin();
                            return;
                        }
                        this.helpers.notifyError('Error', 'Some files could not be deleted');
                        this.deletingAll = false;
                        this.loadFiles();
                    }
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
                        this.helpers.notifySuccess('File deleted successfully');
                        this.loadFiles();
                    },
                    error: (err) => {
                        if (err?.error?.message == 'Unauthorized') {
                            this.helpers.redirectToLogin();
                            return;
                        }
                        this.helpers.notifyError('Error', 'Failed to delete file');
                    }
                });
            }
        });
    }

    getSelectedFolderName(): string {
        const folder = this.folders.find((f) => f.id === this.selectedFolder);
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

    private isJwt(t: string) {
        return !!t && t.split('.').length === 3;
    }
    private b64url(s: string) {
        const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
        return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
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
            dcm: 'pi pi-image text-purple-500',
            md: 'pi pi-file-edit text-teal-500'
        };
        return iconMap[ext] || 'pi pi-file text-gray-500';
    }
}
