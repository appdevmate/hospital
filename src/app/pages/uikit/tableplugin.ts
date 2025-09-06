// tableplugin.ts
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
import { PopoverModule } from 'primeng/popover';
import { ListboxModule } from 'primeng/listbox';
import { CheckboxModule } from 'primeng/checkbox';

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
    editType?: 'row' | 'cell' | 'none';
}

// extend ToolbarConfig
export interface ToolbarConfig {
    showNew?: boolean;
    showDelete?: boolean;
    showImport?: boolean;
    showExport?: boolean;
    showTemplate?: boolean;
    newLabel?: string;
    deleteLabel?: string;
    importLabel?: string;
    exportLabel?: string;
    templateLabel?: string;
    newIcon?: string;
    deleteIcon?: string;
    importIcon?: string;
    exportIcon?: string;
    templateIcon?: string;
}


export interface RowEditEvent<T = any> {
    data: T;
    index?: number;
}

export type FilterControlType = 'cycle' | 'toggle' | 'button';
export interface FilterControl {
    id: string;
    type: FilterControlType;
    label?: string;
    icon?: string;
    tooltip?: string;
    outlined?: boolean;
    severityOn?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
    severityOff?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
    values?: any[];
    getLabel?: (value: any) => string;
    getIcon?: (value: any) => string | undefined;
}

@Component({
    selector: 'app-generic-table',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
        AutoCompleteModule,
        DatePickerModule,
        ButtonModule,
        ToolbarModule,
        FileUploadModule,
        TagModule,
        TooltipModule,
        PopoverModule,
        ListboxModule,
        CheckboxModule
    ],
    template: `
    <div class="card">
      <div class="font-semibold text-xl mb-4" *ngIf="config?.title">{{ config.title }}</div>

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
            mode="basic"
            accept=".xlsx,.xls,.csv"
            [maxFileSize]="10_000_000"
            [chooseLabel]="toolbarConfig.importLabel || 'Import'"
            auto
            customUpload
            class="mr-2 inline-block"
            [chooseButtonProps]="{ severity: 'secondary' }"
            (uploadHandler)="onImportUpload($event)">
          </p-fileUpload>

          <p-button *ngIf="toolbarConfig?.showExport !== false" [label]="toolbarConfig.exportLabel || 'Export'" [icon]="toolbarConfig.exportIcon || 'pi pi-upload'" severity="secondary" (onClick)="onExportClick()" />
        <p-button  *ngIf="toolbarConfig?.showTemplate !== false"  [label]="toolbarConfig.templateLabel || 'Template'"  [icon]="toolbarConfig.templateIcon || 'pi pi-file-excel'" severity="secondary"  (onClick)="onTemplateClick()" />
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
          <div class="flex justify-between items-center flex-col sm:flex-row gap-2">
            <div class="flex items-center gap-2">
              <button *ngIf="config.showClearButton !== false" pButton label="Clear" class="p-button-outlined" icon="pi pi-filter-slash" (click)="clear(dt)"></button>

              <!-- Dynamic filter controls -->
              <ng-container *ngFor="let ctl of filterControls">
                <p-button
                  [label]="computeLabel(ctl)"
                  [icon]="computeIcon(ctl)"
                  [outlined]="ctl.outlined !== false"
                  [severity]="isActive(ctl) ? ctl.severityOn || 'primary' : ctl.severityOff || 'secondary'"
                  (onClick)="onFilterClick(ctl)"
                  [pTooltip]="ctl.tooltip || ''">
                </p-button>
              </ng-container>
            </div>

            <div class="flex items-center gap-2 ml-auto">
              <button pButton class="p-button-outlined" label="Select Columns" icon="pi pi-bars" (click)="colsPop.toggle($event)"></button>

              <p-popover #colsPop appendTo="body">
                <div class="w-72 p-2">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium">Columns</span>
                    <button pButton type="button" icon="pi pi-times" text (click)="colsPop.hide()"></button>
                  </div>

                  <input pInputText type="text" [(ngModel)]="columnFilter" placeholder="Search columns" class="w-full mb-2" (input)="filterColumnOptions()" />

                  <p-listbox
                    [options]="columnOptions"
                    optionLabel="header"
                    [multiple]="true"
                    [metaKeySelection]="false"
                    [(ngModel)]="selectedColumnOptions"
                    (ngModelChange)="setVisibleFromOptions($event)"
                    [listStyle]="{ 'max-height': '280px' }">
                    <ng-template pTemplate="header">
                      <div class="flex items-center gap-2 p-2 border-b">
                        <p-checkbox binary="true" [ngModel]="isAllSelected()" (onChange)="toggleAll($event.checked)"></p-checkbox>
                        <span class="font-medium">Select All</span>
                      </div>
                    </ng-template>

                    <ng-template let-opt pTemplate="item">
                      <div class="flex items-center gap-2">
                        <p-checkbox [binary]="true" [ngModel]="isSelectedField(opt.field)"></p-checkbox>
                        <span class="truncate">{{ opt.header }}</span>
                      </div>
                    </ng-template>
                  </p-listbox>
                </div>
              </p-popover>

              <p-iconfield *ngIf="config.showGlobalSearch !== false" iconPosition="left">
                <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                <input #globalFilter pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Global Search" />
              </p-iconfield>
            </div>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th *ngIf="config?.selectable" style="width: 4rem">
              <p-tableHeaderCheckbox *ngIf="config?.selectionMode === 'multiple' && config?.showSelectAll !== false"></p-tableHeaderCheckbox>
            </th>

            <ng-container *ngFor="let col of viewColumns">
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
            <td *ngIf="config?.selectable"><p-tableCheckbox [value]="row"></p-tableCheckbox></td>

            <td *ngFor="let col of viewColumns">
              <ng-container *ngIf="isColumnEditable(col) && isEditingEnabled(); else readCell">
                <p-cellEditor>
                  <ng-template pTemplate="input">
                    <ng-container [ngSwitch]="col.editorType || 'text'">
                      <input *ngSwitchCase="'text'" pInputText [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" class="w-full" />

                      <input *ngSwitchCase="'number'" type="number" pInputText [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" class="w-full" />

                      <textarea *ngSwitchCase="'textarea'" pInputText rows="2" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" class="w-full"></textarea>

                      <p-datepicker
                        *ngSwitchCase="'date'"
                        [showIcon]="true"
                        [iconDisplay]="'input'"
                        [appendTo]="'body'"
                        [dateFormat]="fmt(col.dateFormat)"
                        [ngModel]="getDate(row, col.field)"
                        (ngModelChange)="setDate(row, col.field, $event)"
                        class="w-full">
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
                        (ngModelChange)="acSet(row, col, $event)">
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
              <div class="flex items-center justify-center gap-2" *ngIf="isEditingEnabled() && hasEditableColumns()">
                <ng-container *ngIf="!editing; else editControls">
                  <p-button icon="pi pi-pencil" severity="secondary" size="small" text pInitEditableRow pTooltip="Edit" (click)="onRowEditInit(row, ri)"></p-button>
                </ng-container>
                <ng-template #editControls>
                  <p-button icon="pi pi-check" severity="success" size="small" text pSaveEditableRow pTooltip="Save" (click)="onRowEditSave(row, ri)"></p-button>
                  <p-button icon="pi pi-times" severity="danger" size="small" text pCancelEditableRow pTooltip="Cancel" (click)="onRowEditCancel(row, ri)"></p-button>
                </ng-template>
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
          <span *ngIf="config?.selectable && selectedRows?.length">{{ selectedRows.length }} item(s) selected</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host ::ng-deep .p-autocomplete,
    :host ::ng-deep .p-datepicker { width: 100%; }
    :host ::ng-deep .p-button.p-button-text { padding: 0.25rem; min-width: auto; }
  `]
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
    @Input() selectedRows: T[] = [];
    @Input() visibleColumnFields?: string[];
    @Input() requireAtLeastOneColumn = true;

    // dynamic quick filters
    @Input() filterControls: FilterControl[] = [];
    @Input() activeFilters: Record<string, any> = {};
    @Output() filterControlChange = new EventEmitter<{ id: string; value: any }>();

    // events
    @Output() columnsVisibilityChange = new EventEmitter<string[]>();
    @Output() clearAll = new EventEmitter<void>();
    @Output() lazyLoad = new EventEmitter<any>();
    @Output() rowEditInit = new EventEmitter<RowEditEvent<T>>();
    @Output() rowEditSave = new EventEmitter<RowEditEvent<T>>();
    @Output() rowEditCancel = new EventEmitter<RowEditEvent<T>>();
    @Output() selectionChange = new EventEmitter<T[]>();
    @Output() newClick = new EventEmitter<void>();
    @Output() deleteClick = new EventEmitter<void>();
    @Output() importUpload = new EventEmitter<File[]>();   // <-- for parent (onImportPatients)
    @Output() exportClick = new EventEmitter<void>();
    @Output() templateClick = new EventEmitter<void>();

    pageSize = 15;
    columnFilter = '';
    columnHeaderMap: Record<string, string> = {};
    private visibleFields: string[] = [];
    columnOptions: { header: string; field: string }[] = [];
    selectedColumnOptions: { header: string; field: string }[] = [];
    ac: Record<string, { label: string; value: any }[]> = {};
    private dateCache = new WeakMap<any, Map<string, Date | null>>();
    private clonedRows: { [s: string]: T } = {};

    ngOnChanges(ch: SimpleChanges) {
        if (ch['config']) this.pageSize = this.config?.defaultPageSize ?? 15;
        if (ch['columns'] || ch['visibleColumnFields']) this.ensureVisibleInit();
    }

    /* -------- dynamic filters -------- */
    isActive(ctl: FilterControl): boolean {
        const v = this.activeFilters?.[ctl.id];
        return ctl.type === 'toggle' ? !!v : v !== undefined && v !== null && v !== '';
    }
    computeLabel(ctl: FilterControl): string {
        const v = this.activeFilters?.[ctl.id];
        if (ctl.getLabel) return ctl.getLabel(v);
        if (ctl.type === 'cycle') return ctl.label || 'Filter';
        if (ctl.type === 'toggle') return this.isActive(ctl) ? (ctl.label || 'On') : (ctl.label || 'Off');
        return ctl.label || 'Action';
    }
    computeIcon(ctl: FilterControl): string | undefined {
        const v = this.activeFilters?.[ctl.id];
        return ctl.getIcon ? ctl.getIcon(v) : ctl.icon;
    }
    onFilterClick(ctl: FilterControl) {
        const current = this.activeFilters?.[ctl.id];
        let next: any = current;

        if (ctl.type === 'toggle') {
            next = current ? null : true;
        } else if (ctl.type === 'cycle') {
            const arr = ctl.values ?? [null, true, false];
            const idx = arr.findIndex(x => JSON.stringify(x) === JSON.stringify(current));
            next = arr[(idx + 1) % arr.length];
        } else {
            next = true;
        }
        this.filterControlChange.emit({ id: ctl.id, value: next });
    }

    /* -------- columns picker -------- */
    private ensureVisibleInit() {
        this.columnOptions = (this.columns || []).map(c => ({ header: c.header || c.field, field: c.field }));
        this.columnHeaderMap = Object.fromEntries(this.columnOptions.map(o => [o.field, o.header]));
        const all = this.columnOptions.map(o => o.field);

        let seed: string[] = this.visibleColumnFields ? this.visibleColumnFields.filter(f => all.includes(f)) : all.slice();
        if (this.requireAtLeastOneColumn && seed.length === 0 && this.columnOptions[0]) seed = [this.columnOptions[0].field];

        this.visibleFields = seed.slice();
        this.selectedColumnOptions = this.columnOptions.filter(o => seed.includes(o.field));
    }

    setVisibleFromOptions(list: { header: string; field: string }[]) {
        const want = list || [];
        this.selectedColumnOptions = this.requireAtLeastOneColumn && want.length === 0 ? (this.columnOptions[0] ? [this.columnOptions[0]] : []) : want;
        this.visibleFields = this.selectedColumnOptions.map(o => o.field);
        this.columnsVisibilityChange.emit(this.visibleFields);
    }

    filterColumnOptions() {
        const q = this.columnFilter.trim().toLowerCase();
        this.columnOptions = (this.columns || [])
            .map(c => ({ header: c.header || c.field, field: c.field }))
            .filter(o => !q || o.header.toLowerCase().includes(q) || o.field.toLowerCase().includes(q));
        this.selectedColumnOptions = this.selectedColumnOptions.filter(s => this.columnOptions.some(o => o.field === s.field));
    }

    isSelectedField(field: string): boolean {
        return (this.selectedColumnOptions || []).some(o => o.field === field);
    }
    isAllSelected(): boolean {
        return this.selectedColumnOptions?.length === this.columnOptions?.length;
    }
    toggleAll(checked: boolean) {
        this.selectedColumnOptions = checked ? [...this.columnOptions] : [];
        this.setVisibleFromOptions(this.selectedColumnOptions);
    }

    /* -------- editing -------- */
    isEditingEnabled(): boolean {
        return this.config?.editType === 'row' || this.config?.editType === 'cell';
    }
    isColumnEditable(col: TableColumn): boolean {
        return col.editable === true;
    }
    hasEditableColumns(): boolean {
        return this.columns.some(col => col.editable === true);
    }

    onTableRowEditInit(event: any) {
        const rowData = event.data || event;
        const rowIndex = event.index;
        const key = rowData[this.dataKey];
        this.clonedRows[key] = { ...rowData };
        this.rowEditInit.emit({ data: rowData, index: rowIndex });
    }
    onTableRowEditSave(event: any) {
        const rowData = event.data || event;
        const rowIndex = event.index;
        const key = rowData[this.dataKey];
        delete this.clonedRows[key];
        this.rowEditSave.emit({ data: rowData, index: rowIndex });
    }
    onTableRowEditCancel(event: any) {
        const rowData = event.data || event;
        const rowIndex = event.index;
        const key = rowData[this.dataKey];
        if (this.clonedRows[key]) {
            const idx = this.data.findIndex(item => (item as any)[this.dataKey] === key);
            if (idx !== -1) this.data[idx] = this.clonedRows[key];
            delete this.clonedRows[key];
        }
        this.rowEditCancel.emit({ data: rowData, index: rowIndex });
    }

    // direct template calls (also exposed for convenience)
    onRowEditInit(row: T, index: number): void {
        const key = (row as any)[this.dataKey];
        if (key !== undefined && key !== null) this.clonedRows[key] = { ...(row as any) };
        this.rowEditInit.emit({ data: row, index });
    }
    onRowEditSave(row: T, index: number): void {
        const key = (row as any)[this.dataKey];
        if (key !== undefined && key !== null) delete this.clonedRows[key];
        this.rowEditSave.emit({ data: row, index });
    }
    onRowEditCancel(row: T, index: number): void {
        const key = (row as any)[this.dataKey];
        if (key !== undefined && key !== null && this.clonedRows[key]) {
            const i = this.data.findIndex(r => (r as any)[this.dataKey] === key);
            if (i !== -1) this.data[i] = this.clonedRows[key];
            delete this.clonedRows[key];
        }
        this.rowEditCancel.emit({ data: row, index });
    }

    /* -------- selection -------- */
    onSelectionChange() {
        this.selectionChange.emit(this.selectedRows);
    }
    getSelectionMode(): 'single' | 'multiple' | null {
        return !this.config?.selectable ? null : this.config.selectionMode === 'single' ? 'single' : 'multiple';
    }
    get viewColumns(): TableColumn[] {
        return (this.columns || []).filter(c => this.visibleFields.includes(c.field));
    }
    getColSpan(): number {
        let base = this.viewColumns.length + 1; // actions
        if (this.config?.selectable) base += 1;
        return base;
    }

    /* -------- toolbar -------- */
    onNewClick() { this.newClick.emit(); }
    onDeleteClick() { this.deleteClick.emit(); }
    onImportUpload(e: any) {
        const files = (e?.files ?? []) as File[];
        this.importUpload.emit(files);
        if (e?.options?.clear) e.options.clear();
    }
    onExportClick() { this.exportClick.emit(); }

    onTemplateClick() { this.templateClick.emit(); }

    /* -------- table utils -------- */
    onGlobalFilter(t: Table, e: Event) {
        t.filterGlobal((e.target as HTMLInputElement).value, 'contains');
    }
    clear(t: Table) {
        this.clearAll.emit();
        setTimeout(() => {
            t.clear();
            if (this.globalFilter?.nativeElement) this.globalFilter.nativeElement.value = '';
        }, 0);
    }

    /* -------- model helpers -------- */
    get = (row: any, f: string) => row?.[f];
    set = (row: any, f: string, v: any) => { if (row) row[f] = v; };
    val = (row: any, f: string) => f.split('.').reduce((o, p) => (o ? (o as any)[p] : undefined), row);

    /* -------- autocomplete -------- */
    acFill(col: TableColumn, e: { query?: string }) {
        const all = col.editorOptions || [];
        const q = (e.query || '').toLowerCase();
        this.ac[col.field] = q ? all.filter(o => String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)) : all.slice(0, 50);
    }
    acSel(row: any, col: TableColumn) {
        const v = row?.[col.field];
        return (col.editorOptions || []).find(o => o.value === v) || null;
    }
    acSet(row: any, col: TableColumn, sel: any) {
        if (sel && typeof sel === 'object' && 'value' in sel) row[col.field] = sel.value;
        else row[col.field] = sel ?? null;
    }

    /* -------- dates -------- */
    private ref(row: any) {
        let m = this.dateCache.get(row);
        if (!m) { m = new Map<string, Date | null>(); this.dateCache.set(row, m); }
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

    /* -------- display -------- */
    display(row: T, col: TableColumn): string {
        const v = this.val(row, col.field);
        if (v == null) return '-';
        switch (col.pipe) {
            case 'date': {
                const d = v instanceof Date ? v : new Date(v);
                return new DatePipe('en-US').transform(d, col.dateFormat || 'MM/dd/yyyy') || '-';
            }
            case 'titlecase':
                return typeof v === 'string' ? v.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()) : String(v);
            case 'uppercase': return String(v).toUpperCase();
            case 'lowercase': return String(v).toLowerCase();
            case 'currency': return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));
            case 'number': return new Intl.NumberFormat('en-US').format(Number(v));
            default: return String(v);
        }
    }

    /* -------- CSV export -------- */
    private csvEscape(v: any): string {
        const s = v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
    }
    private raw(row: any, col: TableColumn): any {
        const v = this.val(row, col.field);
        if (v instanceof Date) return v.toISOString();
        return v ?? '';
    }
    exportCSV(opts?: { selectionOnly?: boolean; filename?: string; separator?: string; includeHeaders?: boolean; applyPipes?: boolean; columns?: string[] }) {
        const { selectionOnly = false, filename = (this.config?.title || 'export').replace(/\s+/g, '_').toLowerCase(), separator = ',', includeHeaders = true, applyPipes = true, columns } = opts || {};

        const rows: any[] = selectionOnly ? this.selectedRows || [] : this.data || [];
        if (!rows.length || !this.columns?.length) return;

        const cols = columns && columns.length ? this.columns.filter(c => columns.includes(c.field)) : this.viewColumns;

        const header = includeHeaders ? cols.map(c => this.csvEscape(c.header || c.field)).join(separator) + '\r\n' : '';
        const body = rows.map(r =>
            cols.map(c => {
                const v = applyPipes ? this.display(r as any, c) : this.raw(r as any, c);
                return this.csvEscape(v);
            }).join(separator)
        ).join('\r\n');

        const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* -------- custom cell template lookup -------- */
    custom(f: string): TemplateRef<any> | null {
        return this.customTemplates && this.customTemplates[f] ? this.customTemplates[f] : null;
    }
}
