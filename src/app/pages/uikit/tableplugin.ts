// tableplugin.ts - Enhanced GenericTableComponent with Row Edit Implementation

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
import { TooltipModule } from 'primeng/tooltip';

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
    filterType?: 'text' | 'dropdown';
    filterOptions?: Array<{ label: string; value: any }>;
    filterMatchMode?: 'contains' | 'equals' | 'startsWith' | 'endsWith';
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
    editType?: 'row' | 'cell' | 'none'; // Add edit type configuration
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
    imports: [CommonModule, FormsModule, TableModule, IconFieldModule, InputIconModule, InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule, ToolbarModule, FileUploadModule, TagModule, TooltipModule],
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
                        [disabled]="selectedRows.length === 0"
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
                [responsiveLayout]="config.responsive !== false ? 'scroll' : 'stack'"
                [scrollable]="true"
                [scrollHeight]="config.scrollHeight || '600px'"
                sortMode="single"
                (onLazyLoad)="lazyLoad.emit($event)"
                (onRowEditInit)="onTableRowEditInit($event)"
                (onRowEditSave)="onTableRowEditSave($event)"
                (onRowEditCancel)="onTableRowEditCancel($event)"
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
                            <ng-container *ngIf="isColumnEditable(col) && isEditingEnabled(); else readCell">
                                <p-cellEditor>
                                    <ng-template pTemplate="input">
                                        <ng-container [ngSwitch]="col.editorType || 'text'">
                                            <input *ngSwitchCase="'text'" 
                                                pInputText 
                                                [ngModel]="get(row, col.field)" 
                                                (ngModelChange)="set(row, col.field, $event)" 
                                                [attr.placeholder]="col.header"
                                                class="w-full" />
                                            <input *ngSwitchCase="'number'" 
                                                type="number" 
                                                pInputText 
                                                [ngModel]="get(row, col.field)" 
                                                (ngModelChange)="set(row, col.field, $event)"
                                                class="w-full" />
                                            <textarea *ngSwitchCase="'textarea'" 
                                                pInputText 
                                                rows="2" 
                                                [ngModel]="get(row, col.field)" 
                                                (ngModelChange)="set(row, col.field, $event)"
                                                class="w-full"></textarea>
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
                                <!-- Row Edit Controls -->
                                <ng-container *ngIf="isEditingEnabled() && hasEditableColumns()">
                                    <ng-container *ngIf="!editing; else editControls">
                                        <p-button 
                                            icon="pi pi-pencil" 
                                            severity="secondary" 
                                            size="small"
                                            text
                                            pInitEditableRow 
                                            pTooltip="Edit"
                                            (click)="onRowEditInit(row, ri)"
                                        ></p-button>
                                    </ng-container>
                                    <ng-template #editControls>
                                        <p-button 
                                            icon="pi pi-check" 
                                            severity="success" 
                                            size="small"
                                            text
                                            pSaveEditableRow
                                            pTooltip="Save"
                                            (click)="onRowEditSave(row, ri)"
                                        ></p-button>
                                        <p-button 
                                            icon="pi pi-times" 
                                            severity="danger" 
                                            size="small"
                                            text
                                            pCancelEditableRow
                                            pTooltip="Cancel"
                                            (click)="onRowEditCancel(row, ri)"
                                        ></p-button>
                                    </ng-template>
                                </ng-container>
                                
                                <!-- Custom Actions Template -->
                                <ng-container *ngIf="actionsTemplate" [ngTemplateOutlet]="actionsTemplate" [ngTemplateOutletContext]="{ $implicit: row, rowIndex: ri, row: row, index: ri }"></ng-container>
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
            
            :host ::ng-deep .p-button.p-button-text {
                padding: 0.25rem;
                min-width: auto;
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
    
    // Check if editing is enabled
    isEditingEnabled(): boolean {
        return this.config?.editType === 'row' || this.config?.editType === 'cell';
    }
    
    // Check if column is editable
    isColumnEditable(col: TableColumn): boolean {
        return col.editable === true;
    }
    
    // Check if table has any editable columns
    hasEditableColumns(): boolean {
        return this.columns.some(col => col.editable === true);
    }
    
    // Row edit event handlers
    onRowEditInit(rowData: T, rowIndex: number) {
        const key = (rowData as any)[this.dataKey];
        this.clonedRows[key] = { ...rowData };
    }
    
    onRowEditSave(rowData: T, rowIndex: number) {
        const key = (rowData as any)[this.dataKey];
        delete this.clonedRows[key];
        
        this.rowEditSave.emit({
            data: rowData,
            index: rowIndex
        });
    }
    
    onRowEditCancel(rowData: T, rowIndex: number) {
        const key = (rowData as any)[this.dataKey];
        if (this.clonedRows[key]) {
            const index = this.data.findIndex(item => (item as any)[this.dataKey] === key);
            if (index !== -1) {
                this.data[index] = this.clonedRows[key];
            }
            delete this.clonedRows[key];
        }
        
        this.rowEditCancel.emit({
            data: rowData,
            index: rowIndex
        });
    }
    
    // PrimeNG Table event handlers
    onTableRowEditInit(event: any) {
        console.log('Table Row Edit Init', event);
        
        const rowData = event.data || event;
        const rowIndex = event.index;
        
        const key = rowData[this.dataKey];
        this.clonedRows[key] = { ...rowData };
        
        this.rowEditInit.emit({
            data: rowData,
            index: rowIndex
        });
    }

    onTableRowEditSave(event: any) {
        console.log('Table Row Edit Save', event);
        
        const rowData = event.data || event;
        const rowIndex = event.index;
        
        const key = rowData[this.dataKey];
        delete this.clonedRows[key];
        
        this.rowEditSave.emit({
            data: rowData,
            index: rowIndex
        });
    }

    onTableRowEditCancel(event: any) {
        console.log('Table Row Edit Cancel', event);
        
        const rowData = event.data || event;
        const rowIndex = event.index;
        
        const key = rowData[this.dataKey];
        if (this.clonedRows[key]) {
            const index = this.data.findIndex(item => (item as any)[this.dataKey] === key);
            if (index !== -1) {
                this.data[index] = this.clonedRows[key];
            }
            delete this.clonedRows[key];
        }
        
        this.rowEditCancel.emit({
            data: rowData,
            index: rowIndex
        });
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
        row[col.field] = sel ?? null;
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