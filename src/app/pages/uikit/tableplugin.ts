import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { FileUploadModule } from 'primeng/fileupload';
import { TagModule } from 'primeng/tag';

export interface TableColumn {
    field: string;
    header: string;
    type?: 'text' | 'date' | 'number' | 'boolean' | 'custom';
    pipe?: 'date' | 'currency' | 'number' | 'titlecase' | 'uppercase' | 'lowercase';
    dateFormat?: string;
    filterable?: boolean;
    sortable?: boolean;
    width?: string;
    customTemplate?: boolean;
    editable?: boolean;
    editorType?: 'text' | 'date' | 'number' | 'textarea' | 'autocomplete';
    editorOptions?: ReadonlyArray<{ label: string; value: any }>;
}

export interface TableConfig {
    title?: string;
    showGlobalSearch?: boolean;
    showClearButton?: boolean;
    pageSizeOptions?: number[];
    defaultPageSize?: number;
    scrollHeight?: string;
    showGridlines?: boolean;
    rowHover?: boolean;
    responsive?: boolean;
    emptyMessage?: string;
    loadingMessage?: string;
    showResultsSummary?: boolean;
    showToolbar?: boolean;
    selectable?: boolean;
    selectionMode?: 'single' | 'multiple';
    showSelectAll?: boolean;
}

export interface ToolbarConfig {
    showNew?: boolean;
    showDelete?: boolean;
    showImport?: boolean;
    showExport?: boolean;
    newLabel?: string;
    deleteLabel?: string;
    importLabel?: string;
    exportLabel?: string;
    newIcon?: string;
    deleteIcon?: string;
    importIcon?: string;
    exportIcon?: string;
}

export interface RowEditEvent<T = any> {
    data: T;
    index?: number;
}

@Component({
    selector: 'app-generic-table',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, IconFieldModule, InputIconModule, InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule, ToolbarModule, FileUploadModule, TagModule],
    template: `
        <div class="card">
            <div class="font-semibold text-xl mb-4" *ngIf="config?.title">{{ config.title }}</div>
            
            <!-- Toolbar -->
            <p-toolbar class="mb-6" *ngIf="config?.showToolbar">
                <ng-template #start>
                    <p-button *ngIf="toolbarConfig?.showNew !== false" [label]="toolbarConfig.newLabel || 'New'" [icon]="toolbarConfig.newIcon || 'pi pi-plus'" class="mr-2" (onClick)="onNewClick()" />
                    <p-button
                        *ngIf="toolbarConfig?.showDelete !== false"
                        severity="danger"
                        [label]="toolbarConfig.deleteLabel || 'Delete'"
                        [icon]="toolbarConfig.deleteIcon || 'pi pi-trash'"
                        outlined
                        (onClick)="onDeleteClick()"
                        [disabled]="!hasSelectedItems"
                    />
                </ng-template>
                <ng-template #end>
                    <p-fileUpload
                        *ngIf="toolbarConfig?.showImport !== false"
                        mode="basic"
                        accept="image/*"
                        [maxFileSize]="1000000"
                        [chooseLabel]="toolbarConfig.importLabel || 'Import'"
                        auto
                        customUpload
                        class="mr-2 inline-block"
                        [chooseButtonProps]="{ severity: 'secondary' }"
                    />
                    <p-button *ngIf="toolbarConfig?.showExport !== false" [label]="toolbarConfig.exportLabel || 'Export'" [icon]="toolbarConfig.exportIcon || 'pi pi-upload'" severity="secondary" (onClick)="onExportClick()" />
                </ng-template>
            </p-toolbar>
            
            <p-table
                #dt
                [value]="data"
                [dataKey]="dataKey"
                [loading]="loading"
                [lazy]="isLazy"
                editMode="row"
                [paginator]="true"
                [rows]="pageSize"
                [rowsPerPageOptions]="config.pageSizeOptions || [5, 10, 15, 25, 50, 100]"
                [totalRecords]="totalRecords"
                [rowHover]="config.rowHover !== false"
                [showGridlines]="config.showGridlines !== false"
                [(selection)]="selectedRows"
                [selectionMode]="getSelectionMode()"
                (selectionChange)="onSelectionChange()"
                (onRowEditInit)="onTableRowEditInit($event)"
                (onRowEditSave)="onTableRowEditSave($event)"
                (onRowEditCancel)="onTableRowEditCancel($event)"
                [responsiveLayout]="config.responsive !== false ? 'scroll' : 'stack'"
                [scrollable]="true"
                [scrollHeight]="config.scrollHeight || '600px'"
                sortMode="single"
                (onLazyLoad)="lazyLoad.emit($event)"
                [tableStyle]="{ 'table-layout': 'fixed', width: '100%' }"
            >
                <ng-template #caption>
                    <div class="flex justify-between items-center flex-col sm:flex-row">
                        <button *ngIf="config.showClearButton !== false" pButton label="Clear" class="p-button-outlined mb-2" icon="pi pi-filter-slash" (click)="clear(dt)"></button>
                        <p-iconfield *ngIf="config.showGlobalSearch !== false" iconPosition="left" class="ml-auto">
                            <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                            <input #globalFilter pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Global Search" />
                        </p-iconfield>
                    </div>
                </ng-template>
                
                <ng-template pTemplate="header">
                    <tr>
                        <!-- Selection checkbox column -->
                        <th *ngIf="config?.selectable" style="width: 4rem">
                            <p-tableHeaderCheckbox 
                                *ngIf="config?.selectionMode === 'multiple' && config?.showSelectAll !== false"
                            ></p-tableHeaderCheckbox>
                        </th>
                        <ng-container *ngFor="let col of columns">
                            <!-- Sortable by default -->
                            <th *ngIf="col.sortable !== false; else noSort" [style.min-width]="col.width || '12rem'" [pSortableColumn]="col.field">
                                <div class="flex justify-between items-center">
                                    <span class="flex items-center gap-2">
                                        {{ col.header }}
                                        <p-sortIcon [field]="col.field"></p-sortIcon>
                                    </span>
                                    <p-columnFilter *ngIf="col.filterable !== false" type="text" [field]="col.field" display="menu" [placeholder]="'Search by ' + col.header.toLowerCase()" [showOperator]="false" [showAddButton]="false">
                                    </p-columnFilter>
                                </div>
                            </th>
                            <!-- Non-sortable -->
                            <ng-template #noSort>
                                <th [style.min-width]="col.width || '12rem'">
                                    <div class="flex justify-between items-center">
                                        {{ col.header }}
                                        <p-columnFilter *ngIf="col.filterable !== false" type="text" [field]="col.field" display="menu" [placeholder]="'Search by ' + col.header.toLowerCase()" [showOperator]="false" [showAddButton]="false">
                                        </p-columnFilter>
                                    </div>
                                </th>
                            </ng-template>
                        </ng-container>
                        <th style="min-width:8rem">Actions</th>
                    </tr>
                </ng-template>
                
                <ng-template pTemplate="body" let-row let-editing="editing" let-ri="rowIndex">
                    <tr [pEditableRow]="row">
                        <!-- Selection checkbox column -->
                        <td *ngIf="config?.selectable">
                            <p-tableCheckbox [value]="row"></p-tableCheckbox>
                        </td>
                        <td *ngFor="let col of columns">
                            <ng-container *ngIf="col.editable === true; else readCell">
                                <p-cellEditor>
                                    <ng-template pTemplate="input">
                                        <ng-container [ngSwitch]="col.editorType || 'text'">
                                            <input *ngSwitchCase="'text'" pInputText [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" [attr.placeholder]="col.header" />
                                            <input *ngSwitchCase="'number'" type="number" pInputText [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" />
                                            <textarea *ngSwitchCase="'textarea'" pInputText rows="2" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)"></textarea>
                                            <p-datepicker
                                                *ngSwitchCase="'date'"
                                                [showIcon]="true"
                                                [iconDisplay]="'input'"
                                                [appendTo]="'body'"
                                                [dateFormat]="fmt(col.dateFormat)"
                                                [ngModel]="getDate(row, col.field)"
                                                (ngModelChange)="setDate(row, col.field, $event)"
                                                class="w-full"
                                            >
                                            </p-datepicker>
                                            <p-autocomplete
                                                *ngSwitchCase="'autocomplete'"
                                                [suggestions]="ac[col.field] || []"
                                                (completeMethod)="acFill(col, $event)"
                                                [optionLabel]="'label'"
                                                [dropdown]="true"
                                                [forceSelection]="true"
                                                class="w-full"
                                                [ngModel]="acSel(row, col)"
                                                (ngModelChange)="acSet(row, col, $event)"
                                            >
                                                <ng-template pTemplate="item" let-opt>{{ opt.label }}</ng-template>
                                            </p-autocomplete>
                                        </ng-container>
                                    </ng-template>
                                    <ng-template pTemplate="output">
                                        <ng-container *ngIf="col.customTemplate && custom(col.field); else textOut">
                                            <ng-container *ngTemplateOutlet="custom(col.field)!; context: { $implicit: row, rowIndex: ri, field: col.field, value: val(row, col.field) }"></ng-container>
                                        </ng-container>
                                        <ng-template #textOut>{{ display(row, col) }}</ng-template>
                                    </ng-template>
                                </p-cellEditor>
                            </ng-container>
                            <ng-template #readCell>
                                <ng-container *ngIf="col.customTemplate && custom(col.field); else plain">
                                    <ng-container *ngTemplateOutlet="custom(col.field)!; context: { $implicit: row, rowIndex: ri, field: col.field, value: val(row, col.field) }"></ng-container>
                                </ng-container>
                                <ng-template #plain>{{ display(row, col) }}</ng-template>
                            </ng-template>
                        </td>
                        <td>
                            <div class="flex items-center justify-center gap-2">
                                <button *ngIf="!editing" 
                                    pButton 
                                    type="button" 
                                    pInitEditableRow 
                                    icon="pi pi-pencil" 
                                    text 
                                    rounded 
                                    severity="secondary"
                                    (click)="onEditButtonClick(row, ri)">
                                </button>
                                <button *ngIf="editing" 
                                    pButton 
                                    type="button" 
                                    pSaveEditableRow 
                                    icon="pi pi-check" 
                                    text 
                                    rounded 
                                    severity="secondary"
                                    (click)="onSaveButtonClick(row, ri)">
                                </button>
                                <button *ngIf="editing" 
                                    pButton 
                                    type="button" 
                                    pCancelEditableRow 
                                    icon="pi pi-times" 
                                    text 
                                    rounded 
                                    severity="secondary"
                                    (click)="onCancelButtonClick(row, ri)">
                                </button>
                                <ng-container *ngIf="actionsTemplate" [ngTemplateOutlet]="actionsTemplate" [ngTemplateOutletContext]="{ $implicit: row, rowIndex: ri }"></ng-container>
                            </div>
                        </td>
                    </tr>
                </ng-template>
                
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td [colSpan]="getColSpan()" class="text-center py-8">
                            <div class="text-gray-500">
                                <i class="pi pi-search text-3xl mb-2"></i>
                                <div>{{ config.emptyMessage || 'No records found matching your criteria.' }}</div>
                            </div>
                        </td>
                    </tr>
                </ng-template>
                
                <ng-template pTemplate="loadingbody">
                    <tr>
                        <td [colSpan]="getColSpan()" class="text-center py-8">
                            <div class="text-gray-500">
                                <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
                                <div>{{ config.loadingMessage || 'Loading data...' }}</div>
                            </div>
                        </td>
                    </tr>
                </ng-template>
            </p-table>
            
            <div class="mt-4 text-sm text-gray-600" *ngIf="!loading && config.showResultsSummary !== false">
                <div class="flex justify-between items-center">
                    <span>Showing {{ data.length || 0 }} of {{ totalRecords | number }} records</span>
                    <span *ngIf="config?.selectable && selectedRows?.length">
                        {{ selectedRows.length }} item(s) selected
                    </span>
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            :host ::ng-deep .p-autocomplete,
            :host ::ng-deep .p-datepicker {
                width: 100%;
            }
        `
    ]
})
export class GenericTableComponent<T = any> implements OnChanges {
    @ViewChild('dt') dt!: Table;
    @ViewChild('globalFilter') globalFilter!: ElementRef;
    
    @Input({ required: true }) columns: TableColumn[] = [];
    @Input({ required: true }) dataKey = 'id';
    @Input() data: T[] = [];
    @Input() totalRecords = 0;
    @Input() loading = false;
    @Input() isLazy = true;
    @Input() config: TableConfig = {};
    @Input() toolbarConfig: ToolbarConfig = {};
    @Input() actionsTemplate?: TemplateRef<any>;
    @Input() customTemplates: { [field: string]: TemplateRef<any> } = {};
    @Input() hasSelectedItems = false;
    @Input() selectedRows: T[] = [];
    
    @Output() lazyLoad = new EventEmitter<any>();
    @Output() rowEditInit = new EventEmitter<RowEditEvent<T>>();
    @Output() rowEditSave = new EventEmitter<RowEditEvent<T>>();
    @Output() rowEditCancel = new EventEmitter<RowEditEvent<T>>();
    @Output() selectionChange = new EventEmitter<T[]>();
    
    // Toolbar events
    @Output() newClick = new EventEmitter<void>();
    @Output() deleteClick = new EventEmitter<void>();
    @Output() importClick = new EventEmitter<any>();
    @Output() exportClick = new EventEmitter<void>();
    
    pageSize = 15;
    ac: Record<string, { label: string; value: any }[]> = {};
    private dateCache = new WeakMap<any, Map<string, Date | null>>();
    private clonedRows: { [s: string]: T } = {};
    
    ngOnChanges(ch: SimpleChanges) {
        if (ch['config']) this.pageSize = this.config?.defaultPageSize ?? 15;
    }
    
    // Row edit event handlers - properly typed and emit events
    // Replace the event handler methods in your GenericTableComponent with these corrected versions:

// Row edit event handlers - properly typed for PrimeNG events
onTableRowEditInit(event: any) {
    console.log('Table Row Edit Init', event);
    
    // PrimeNG passes the row data directly in event.data
    const rowData = event.data || event;
    const rowIndex = event.index;
    
    // Clone the original row for cancel functionality
    const key = rowData[this.dataKey];
    this.clonedRows[key] = { ...rowData };
    
    // Emit the event to parent with proper structure
    this.rowEditInit.emit({
        data: rowData,
        index: rowIndex
    });
}

onTableRowEditSave(event: any) {
    console.log('Table Row Edit Save', event);
    
    // PrimeNG passes the row data directly in event.data
    const rowData = event.data || event;
    const rowIndex = event.index;
    
    // Clean up cloned row
    const key = rowData[this.dataKey];
    delete this.clonedRows[key];
    
    // Emit the event to parent with proper structure
    this.rowEditSave.emit({
        data: rowData,
        index: rowIndex
    });
}

onTableRowEditCancel(event: any) {
    console.log('Table Row Edit Cancel', event);
    
    // PrimeNG passes the row data directly in event.data
    const rowData = event.data || event;
    const rowIndex = event.index;
    
    // Restore original values
    const key = rowData[this.dataKey];
    if (this.clonedRows[key]) {
        const index = this.data.findIndex(item => (item as any)[this.dataKey] === key);
        if (index !== -1) {
            this.data[index] = this.clonedRows[key];
        }
        delete this.clonedRows[key];
    }
    
    // Emit the event to parent with proper structure
    this.rowEditCancel.emit({
        data: rowData,
        index: rowIndex
    });
}
    
    // Additional click handlers for debugging
    onEditButtonClick(row: T, index: number) {
        console.log('Edit button clicked', { row, index });
        // The pInitEditableRow directive handles the actual editing
    }
    
    onSaveButtonClick(row: T, index: number) {
        console.log('Save button clicked', { row, index });
        // The pSaveEditableRow directive handles the actual saving
    }
    
    onCancelButtonClick(row: T, index: number) {
        console.log('Cancel button clicked', { row, index });
        // The pCancelEditableRow directive handles the actual canceling
    }
    
    onSelectionChange() {
        this.selectionChange.emit(this.selectedRows);
    }
    
    getSelectionMode(): 'single' | 'multiple' | null {
        if (!this.config?.selectable) return null;
        return this.config.selectionMode === 'single' ? 'single' : 'multiple';
    }
    
    getColSpan(): number {
        let baseColSpan = this.columns.length + 1; // columns + actions
        if (this.config?.selectable) baseColSpan += 1; // add selection column
        return baseColSpan;
    }
    
    // Toolbar event handlers
    onNewClick() {
        this.newClick.emit();
    }
    
    onDeleteClick() {
        this.deleteClick.emit();
    }
    
    onImportClick(event: any) {
        this.importClick.emit(event);
    }
    
    onExportClick() {
        this.exportClick.emit();
    }
    
    // Table utils
    onGlobalFilter(t: Table, e: Event) {
        t.filterGlobal((e.target as HTMLInputElement).value, 'contains');
    }
    
    clear(t: Table) {
        t.clear();
        if (this.globalFilter?.nativeElement) this.globalFilter.nativeElement.value = '';
    }
    
    // Model helpers
    get = (row: any, f: string) => row?.[f];
    set = (row: any, f: string, v: any) => {
        if (row) row[f] = v;
    };
    val = (row: any, f: string) => f.split('.').reduce((o, p) => (o ? o[p] : undefined), row);
    
    // Autocomplete
    acFill(col: TableColumn, e: { query?: string }) {
        const all = col.editorOptions || [];
        const q = (e.query || '').toLowerCase();
        this.ac[col.field] = q ? all.filter((o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)) : all.slice(0, 50);
    }
    
    acSel(row: any, col: TableColumn) {
        const v = row?.[col.field];
        return (col.editorOptions || []).find((o) => o.value === v) || null;
    }
    
    acSet(row: any, col: TableColumn, sel: any) {
        row[col.field] = sel?.value ?? null;
    }
    
    // Datepicker (stable reference)
    private ref(row: any) {
        let m = this.dateCache.get(row);
        if (!m) {
            m = new Map();
            this.dateCache.set(row, m);
        }
        return m;
    }
    
    getDate(row: any, f: string): Date | null {
        if (!row) return null;
        const m = this.ref(row);
        if (m.has(f)) return m.get(f) ?? null;
        const v = row[f];
        const d = v == null ? null : v instanceof Date ? v : new Date(v);
        m.set(f, d);
        return d;
    }
    
    setDate(row: any, f: string, v: Date | null) {
        if (!row) return;
        this.ref(row).set(f, v);
        row[f] = v;
    }
    
    fmt = (pipeFmt?: string) => (!pipeFmt ? 'mm/dd/yy' : pipeFmt.replace(/yyyy/g, 'yy').replace(/MM/g, 'mm').replace(/dd/g, 'dd'));
    
    // Display
    display(row: T, col: TableColumn): string {
        const v = this.val(row, col.field);
        if (v == null) return '-';
        switch (col.pipe) {
            case 'date': {
                const d = v instanceof Date ? v : new Date(v);
                return new DatePipe('en-US').transform(d, col.dateFormat || 'MM/dd/yyyy') || '-';
            }
            case 'titlecase':
                return typeof v === 'string' ? v.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase()) : String(v);
            case 'uppercase':
                return String(v).toUpperCase();
            case 'lowercase':
                return String(v).toLowerCase();
            case 'currency':
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));
            case 'number':
                return new Intl.NumberFormat('en-US').format(Number(v));
            default:
                return String(v);
        }
    }
    
    // Templates
    custom = (f: string) => this.customTemplates[f] || null;
    
    // CSV Export method for external access
    exportCSV() {
        if (this.dt) {
            this.dt.exportCSV();
        }
    }
    
    // Utility methods for selection
    clearSelection() {
        this.selectedRows = [];
        this.selectionChange.emit(this.selectedRows);
    }
    
    isRowSelected(row: T): boolean {
        if (!this.selectedRows?.length) return false;
        const dataKey = this.dataKey;
        return this.selectedRows.some(selected =>
            (selected as any)[dataKey] === (row as any)[dataKey]
        );
    }
}