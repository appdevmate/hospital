import { __decorate } from "tslib";
import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { ListboxModule } from 'primeng/listbox';
import { CheckboxModule } from 'primeng/checkbox';
let GenericTableComponent = class GenericTableComponent {
    dt;
    globalFilter;
    columns = [];
    dataKey = 'id';
    data = [];
    totalRecords = 0;
    loading = false;
    isLazy = true;
    config = {};
    toolbarStart;
    toolbarEnd;
    captionStart;
    captionEnd;
    actionsTemplate;
    actionsHeaderTemplate;
    customTemplates = {};
    selectedRows = [];
    visibleColumnFields;
    requireAtLeastOneColumn = true;
    filterControls = [];
    activeFilters = {};
    filterControlChange = new EventEmitter();
    columnsVisibilityChange = new EventEmitter();
    clearAll = new EventEmitter();
    lazyLoad = new EventEmitter();
    rowEditInit = new EventEmitter();
    rowEditSave = new EventEmitter();
    rowEditCancel = new EventEmitter();
    selectionChange = new EventEmitter();
    pageSize = 15;
    columnFilter = '';
    columnHeaderMap = {};
    visibleFields = [];
    columnOptions = [];
    selectedColumnOptions = [];
    ac = {};
    dateCache = new WeakMap();
    clonedRows = {};
    SELECT_COL_WIDTH = '5rem';
    trackByField = (_, c) => c.field;
    toolbarCtx = {};
    captionCtx = {};
    publicApi = {
        clear: () => this.clear(this.dt),
        exportCSV: (o) => this.exportCSV(o),
        table: () => this.dt,
        getSelected: () => this.selectedRows,
        setVisibleColumns: (f) => this.setVisibleColumns(f),
        beginRowEdit: (r, i) => this._beginRowEdit(r, i),
        saveRowEdit: (r, i) => this._saveRowEdit(r, i),
        cancelRowEdit: (r, i) => this._cancelRowEdit(r, i)
    };
    // ── Lifecycle ─────────────────────────────────────────────────────────
    ngOnChanges(ch) {
        if (ch['config'])
            this.pageSize = this.config?.defaultPageSize ?? 15;
        if (ch['columns'] || ch['visibleColumnFields'])
            this.ensureVisibleInit();
        this.refreshContexts();
    }
    refreshContexts() {
        this.toolbarCtx = { api: this.publicApi, selected: this.selectedRows, config: this.config, columns: this.columns, viewColumns: this.viewColumns, total: this.totalRecords };
        this.captionCtx = { api: this.publicApi, selected: this.selectedRows, config: this.config };
    }
    // ── Column visibility ─────────────────────────────────────────────────
    ensureVisibleInit() {
        this.columnOptions = (this.columns || []).map((c) => ({ header: c.header || c.field, field: c.field }));
        this.columnHeaderMap = Object.fromEntries(this.columnOptions.map((o) => [o.field, o.header]));
        const all = this.columnOptions.map((o) => o.field);
        let seed = this.visibleColumnFields ? this.visibleColumnFields.filter((f) => all.includes(f)) : all.slice();
        if (this.requireAtLeastOneColumn && seed.length === 0 && this.columnOptions[0])
            seed = [this.columnOptions[0].field];
        this.visibleFields = seed.slice();
        this.selectedColumnOptions = this.columnOptions.filter((o) => seed.includes(o.field));
    }
    setVisibleFromOptions(list) {
        const want = list || [];
        this.selectedColumnOptions = this.requireAtLeastOneColumn && want.length === 0 ? (this.columnOptions[0] ? [this.columnOptions[0]] : []) : want;
        this.visibleFields = this.selectedColumnOptions.map((o) => o.field);
        this.columnsVisibilityChange.emit(this.visibleFields);
        this.refreshContexts();
    }
    setVisibleColumns(fields) {
        const all = new Set(this.columnOptions.map((o) => o.field));
        const safe = (fields || []).filter((f) => all.has(f));
        if (this.requireAtLeastOneColumn && safe.length === 0 && this.columnOptions[0])
            safe.push(this.columnOptions[0].field);
        this.visibleFields = [...safe];
        this.selectedColumnOptions = this.columnOptions.filter((o) => this.visibleFields.includes(o.field));
        this.columnsVisibilityChange.emit(this.visibleFields);
        this.refreshContexts();
    }
    filterColumnOptions() {
        const q = this.columnFilter.trim().toLowerCase();
        this.columnOptions = (this.columns || []).map((c) => ({ header: c.header || c.field, field: c.field })).filter((o) => !q || o.header.toLowerCase().includes(q) || o.field.toLowerCase().includes(q));
        this.selectedColumnOptions = this.selectedColumnOptions.filter((s) => this.columnOptions.some((o) => o.field === s.field));
    }
    isSelectedField = (field) => (this.selectedColumnOptions || []).some((o) => o.field === field);
    isAllSelected = () => this.selectedColumnOptions?.length === this.columnOptions?.length;
    toggleAll(checked) {
        this.selectedColumnOptions = checked ? [...this.columnOptions] : [];
        this.setVisibleFromOptions(this.selectedColumnOptions);
    }
    // ── Filter controls ───────────────────────────────────────────────────
    isActive = (ctl) => (ctl.type === 'toggle' ? !!this.activeFilters?.[ctl.id] : this.activeFilters?.[ctl.id] !== undefined && this.activeFilters?.[ctl.id] !== null && this.activeFilters?.[ctl.id] !== '');
    computeLabel = (ctl) => ctl.getLabel ? ctl.getLabel(this.activeFilters?.[ctl.id]) : ctl.type === 'cycle' ? ctl.label || 'Filter' : ctl.type === 'toggle' ? (this.isActive(ctl) ? ctl.label || 'On' : ctl.label || 'Off') : ctl.label || 'Action';
    computeIcon = (ctl) => (ctl.getIcon ? ctl.getIcon(this.activeFilters?.[ctl.id]) : ctl.icon);
    onFilterClick(ctl) {
        const cur = this.activeFilters?.[ctl.id];
        let next = cur;
        if (ctl.type === 'toggle')
            next = cur ? null : true;
        else if (ctl.type === 'cycle') {
            const arr = ctl.values ?? [null, true, false];
            const idx = arr.findIndex((x) => JSON.stringify(x) === JSON.stringify(cur));
            next = arr[(idx + 1) % arr.length];
        }
        else
            next = true;
        this.filterControlChange.emit({ id: ctl.id, value: next });
    }
    // ── Table helpers ─────────────────────────────────────────────────────
    isEditingEnabled = () => this.config?.editType === 'row' || this.config?.editType === 'cell';
    isColumnEditable = (col) => col.editable === true;
    hasEditableColumns = () => this.columns.some((col) => col.editable === true);
    showActionsCol = () => !!this.actionsTemplate || (this.isEditingEnabled() && this.hasEditableColumns());
    get viewColumns() {
        return (this.columns || []).filter((c) => this.visibleFields.includes(c.field));
    }
    get globalFilterFields() {
        return this.viewColumns.map((c) => c.field);
    }
    getColSpan() {
        let base = this.viewColumns.length + (this.showActionsCol() ? 1 : 0);
        if (this.config?.selectable)
            base += 1;
        return base;
    }
    getSelectionMode() {
        return !this.config?.selectable ? null : this.config.selectionMode === 'single' ? 'single' : 'multiple';
    }
    onSelectionChange() {
        this.selectionChange.emit(this.selectedRows);
        this.refreshContexts();
    }
    // ── Row edit ──────────────────────────────────────────────────────────
    onTableRowEditInit(event) {
        const rowData = event.data || event, rowIndex = event.index, key = rowData[this.dataKey];
        this.clonedRows[key] = { ...rowData };
        this.rowEditInit.emit({ data: rowData, index: rowIndex });
    }
    onTableRowEditSave(event) {
        const rowData = event.data || event, rowIndex = event.index, key = rowData[this.dataKey];
        delete this.clonedRows[key];
        this.rowEditSave.emit({ data: rowData, index: rowIndex });
    }
    onTableRowEditCancel(event) {
        const rowData = event.data || event, rowIndex = event.index, key = rowData[this.dataKey];
        if (this.clonedRows[key]) {
            const idx = this.data.findIndex((item) => item[this.dataKey] === key);
            if (idx !== -1)
                this.data[idx] = this.clonedRows[key];
            delete this.clonedRows[key];
        }
        this.rowEditCancel.emit({ data: rowData, index: rowIndex });
    }
    onRowEditInit(row, index) {
        const key = row[this.dataKey];
        if (key != null)
            this.clonedRows[key] = { ...row };
        this.rowEditInit.emit({ data: row, index });
    }
    onRowEditSave(row, index) {
        const key = row[this.dataKey];
        if (key != null)
            delete this.clonedRows[key];
        this.rowEditSave.emit({ data: row, index });
    }
    onRowEditCancel(row, index) {
        const key = row[this.dataKey];
        if (key != null && this.clonedRows[key]) {
            const i = this.data.findIndex((r) => r[this.dataKey] === key);
            if (i !== -1)
                this.data[i] = this.clonedRows[key];
            delete this.clonedRows[key];
        }
        this.rowEditCancel.emit({ data: row, index });
    }
    rowElementAt(index) {
        if (index == null || index < 0)
            return null;
        const host = this.dt?.el?.nativeElement ?? null;
        if (!host)
            return null;
        const trs = host.querySelectorAll('tbody tr');
        return trs?.[index] || null;
    }
    _beginRowEdit(row, rowIndex) {
        const el = this.rowElementAt(rowIndex);
        if (el && this.dt?.initRowEdit)
            this.dt.initRowEdit(row, el);
    }
    _saveRowEdit(row, rowIndex) {
        const el = this.rowElementAt(rowIndex);
        if (el && this.dt?.saveRowEdit)
            this.dt.saveRowEdit(row, el);
    }
    _cancelRowEdit(row, rowIndex) {
        const el = this.rowElementAt(rowIndex);
        if (el && this.dt?.cancelRowEdit)
            this.dt.cancelRowEdit(row, el);
    }
    // ── Width helpers ─────────────────────────────────────────────────────
    rootFontSizePx() {
        if (typeof window === 'undefined')
            return 16;
        return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    }
    cssSizeToPx(size) {
        if (!size)
            return 0;
        const s = String(size).trim();
        if (s.endsWith('px'))
            return parseFloat(s);
        if (s.endsWith('rem'))
            return parseFloat(s) * this.rootFontSizePx();
        if (s.endsWith('em'))
            return parseFloat(s) * this.rootFontSizePx();
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }
    colWidthPx(c) {
        return this.cssSizeToPx(c.width || '12rem');
    }
    stickyLeftPx(col) {
        let left = 0;
        if (this.config?.selectable)
            left += this.cssSizeToPx(this.SELECT_COL_WIDTH);
        for (const c of this.viewColumns) {
            if (c === col)
                break;
            if (c.frozen)
                left += this.colWidthPx(c);
        }
        return left;
    }
    maxW(col) {
        return col.maxWidth || col.width || '20rem';
    }
    // ── Global filter / clear ─────────────────────────────────────────────
    onGlobalFilter(t, e) {
        t.filterGlobal(e.target.value, 'contains');
    }
    clear(t) {
        this.clearAll.emit();
        setTimeout(() => {
            t.clear();
            if (this.globalFilter?.nativeElement)
                this.globalFilter.nativeElement.value = '';
        }, 0);
    }
    // ── Cell value helpers ────────────────────────────────────────────────
    get = (row, f) => row?.[f];
    set = (row, f, v) => {
        if (row)
            row[f] = v;
    };
    val = (row, f) => f.split('.').reduce((o, p) => (o ? o[p] : undefined), row);
    acFill(col, e) {
        const all = col.editorOptions || [];
        const q = (e.query || '').toLowerCase();
        this.ac[col.field] = q ? all.filter((o) => String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)) : all.slice(0, 50);
    }
    acSel(row, col) {
        const v = row?.[col.field];
        return (col.editorOptions || []).find((o) => o.value === v) || null;
    }
    acSet(row, col, sel) {
        row[col.field] = sel && typeof sel === 'object' && 'value' in sel ? sel.value : (sel ?? null);
    }
    // ── Date helpers ──────────────────────────────────────────────────────
    ref(row) {
        let m = this.dateCache.get(row);
        if (!m) {
            m = new Map();
            this.dateCache.set(row, m);
        }
        return m;
    }
    getDate(row, f) {
        if (!row)
            return null;
        const m = this.ref(row);
        if (m.has(f))
            return m.get(f) ?? null;
        const v = row[f];
        const d = v == null ? null : v instanceof Date ? v : new Date(v);
        m.set(f, d);
        return d;
    }
    setDate(row, f, v) {
        if (!row)
            return;
        this.ref(row).set(f, v);
        row[f] = v;
    }
    getTime(row, f) {
        if (!row)
            return null;
        const m = this.ref(row);
        if (m.has(f))
            return m.get(f) ?? null;
        const v = row[f];
        let d = null;
        if (v instanceof Date) {
            d = v;
        }
        else if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) {
            const [hh, mm] = v.split(':').map(Number);
            d = new Date();
            d.setHours(hh, mm, 0, 0);
        }
        m.set(f, d);
        return d;
    }
    setTime(row, f, v) {
        if (!row)
            return;
        this.ref(row).set(f, v);
        if (!v) {
            row[f] = null;
            return;
        }
        const hh = String(v.getHours()).padStart(2, '0');
        const mm = String(v.getMinutes()).padStart(2, '0');
        row[f] = `${hh}:${mm}`;
    }
    fmt = (pipeFmt) => (!pipeFmt ? 'mm/dd/yy' : pipeFmt.replace(/yyyy/g, 'yy').replace(/MM/g, 'mm').replace(/dd/g, 'dd'));
    // ── Display ───────────────────────────────────────────────────────────
    display(row, col) {
        const v = this.val(row, col.field);
        if (v == null)
            return '-';
        switch (col.pipe) {
            case 'date': {
                const d = this.toValidDate(v);
                return d ? (new DatePipe('en-US').transform(d, col.dateFormat || 'MM/dd/yyyy') ?? '-') : '-';
            }
            case 'titlecase':
                return typeof v === 'string' ? v.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase()) : String(v);
            case 'uppercase':
                return String(v).toUpperCase();
            case 'lowercase':
                return String(v).toLowerCase();
            case 'currency': {
                const n = Number(v);
                return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '-';
            }
            case 'number': {
                const n = Number(v);
                return Number.isFinite(n) ? new Intl.NumberFormat('en-US').format(n) : '-';
            }
            default:
                return String(v);
        }
    }
    toValidDate(val) {
        if (val instanceof Date && !isNaN(val.getTime()))
            return val;
        if (typeof val === 'number') {
            const ms = val < 1e12 ? val * 1000 : val;
            const d = new Date(ms);
            return isNaN(d.getTime()) ? null : d;
        }
        if (typeof val === 'string') {
            const s = val.trim();
            if (!s || s.toLowerCase() === 'invalid date')
                return null;
            const d1 = new Date(s);
            if (!isNaN(d1.getTime()))
                return d1;
            const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
            if (m) {
                const dd = +m[1], mm = +m[2], y = +m[3];
                const yyyy = m[3].length === 2 ? 2000 + y : y;
                const d2 = new Date(yyyy, mm - 1, dd);
                return isNaN(d2.getTime()) ? null : d2;
            }
        }
        return null;
    }
    // ── CSV export ────────────────────────────────────────────────────────
    csvEscape(v) {
        const s = v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
    }
    raw(row, col) {
        const v = this.val(row, col.field);
        return v instanceof Date ? v.toISOString() : (v ?? '');
    }
    exportCSV(opts) {
        const { selectionOnly = false, filename = (this.config?.title || 'export').replace(/\s+/g, '_').toLowerCase(), separator = ',', includeHeaders = true, applyPipes = true, columns } = opts || {};
        const rows = selectionOnly ? this.selectedRows || [] : this.data || [];
        if (!rows.length || !this.columns?.length)
            return;
        const cols = columns?.length ? this.columns.filter((c) => columns.includes(c.field)) : this.viewColumns;
        const header = includeHeaders ? cols.map((c) => this.csvEscape(c.header || c.field)).join(separator) + '\r\n' : '';
        const body = rows.map((r) => cols.map((c) => this.csvEscape(applyPipes ? this.display(r, c) : this.raw(r, c))).join(separator)).join('\r\n');
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
    custom(f) {
        return this.customTemplates?.[f] ?? null;
    }
    toMutable(arr) {
        return arr ? arr.slice() : [];
    }
    selectionColWidthPx() {
        return this.cssSizeToPx('5rem');
    }
};
__decorate([
    ViewChild('dt')
], GenericTableComponent.prototype, "dt", void 0);
__decorate([
    ViewChild('globalFilter')
], GenericTableComponent.prototype, "globalFilter", void 0);
__decorate([
    Input({ required: true })
], GenericTableComponent.prototype, "columns", void 0);
__decorate([
    Input({ required: true })
], GenericTableComponent.prototype, "dataKey", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "data", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "totalRecords", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "loading", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "isLazy", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "config", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "toolbarStart", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "toolbarEnd", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "captionStart", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "captionEnd", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "actionsTemplate", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "actionsHeaderTemplate", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "customTemplates", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "selectedRows", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "visibleColumnFields", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "requireAtLeastOneColumn", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "filterControls", void 0);
__decorate([
    Input()
], GenericTableComponent.prototype, "activeFilters", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "filterControlChange", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "columnsVisibilityChange", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "clearAll", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "lazyLoad", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "rowEditInit", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "rowEditSave", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "rowEditCancel", void 0);
__decorate([
    Output()
], GenericTableComponent.prototype, "selectionChange", void 0);
GenericTableComponent = __decorate([
    Component({
        selector: 'app-generic-table',
        standalone: true,
        imports: [CommonModule, FormsModule, TableModule, IconFieldModule, InputIconModule, InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule, ToolbarModule, TagModule, TooltipModule, PopoverModule, ListboxModule, CheckboxModule],
        template: `
        <div class="card">
            <!-- Title -->
            @if (config.title) {
                <div class="font-semibold text-xl mb-4">{{ config.title }}</div>
            }

            <!-- Toolbar -->
            @if (config.showToolbar) {
                <p-toolbar class="mb-6">
                    <ng-template #start>
                        @if (toolbarStart) {
                            <ng-container [ngTemplateOutlet]="toolbarStart" [ngTemplateOutletContext]="toolbarCtx"></ng-container>
                        }
                    </ng-template>
                    <ng-template #end>
                        @if (toolbarEnd) {
                            <ng-container [ngTemplateOutlet]="toolbarEnd" [ngTemplateOutletContext]="toolbarCtx"></ng-container>
                        }
                    </ng-template>
                </p-toolbar>
            }

            <!-- Table -->
            <p-table
                #dt
                [value]="data"
                [dataKey]="dataKey"
                [loading]="loading"
                [lazy]="isLazy"
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
                [globalFilterFields]="globalFilterFields"
                [editMode]="config.editType === 'cell' ? 'cell' : 'row'"
                sortMode="single"
                [resizableColumns]="true"
                columnResizeMode="fit"
                [tableStyle]="{ 'table-layout': 'fixed', width: '100%' }"
                (onLazyLoad)="lazyLoad.emit($event)"
                (onRowEditInit)="onTableRowEditInit($event)"
                (onRowEditSave)="onTableRowEditSave($event)"
                (onRowEditCancel)="onTableRowEditCancel($event)"
            >
                <!-- Caption -->
                <ng-template #caption>
                    <div class="flex justify-between items-center flex-col sm:flex-row gap-2">
                        <!-- Left: quick filters -->
                        <div class="flex items-center gap-2">
                            @if (config.showClearButton !== false) {
                                <button pButton label="Clear" class="p-button-outlined" icon="pi pi-filter-slash" (click)="clear(dt)"></button>
                            }

                            @if (captionStart) {
                                <ng-container [ngTemplateOutlet]="captionStart" [ngTemplateOutletContext]="captionCtx"></ng-container>
                            }

                            @for (ctl of filterControls; track ctl.id) {
                                <p-button
                                    [label]="computeLabel(ctl)"
                                    [icon]="computeIcon(ctl)"
                                    [outlined]="ctl.outlined !== false"
                                    [severity]="isActive(ctl) ? ctl.severityOn || 'primary' : ctl.severityOff || 'secondary'"
                                    (onClick)="onFilterClick(ctl)"
                                    [pTooltip]="ctl.tooltip || ''"
                                >
                                </p-button>
                            }
                        </div>

                        <!-- Right: column picker + global search -->
                        <div class="flex items-center gap-2 ml-auto">
                            @if (config.showColumnPicker !== false) {
                                <button pButton class="p-button-outlined" label="Select Columns" icon="pi pi-bars" (click)="colsPop.toggle($event)"></button>
                            }

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
                                        [listStyle]="{ 'max-height': '280px' }"
                                    >
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

                            @if (config.showGlobalSearch !== false) {
                                <p-iconfield iconPosition="left">
                                    <p-inputicon><i class="pi pi-search"></i></p-inputicon>
                                    <input #globalFilter pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Global Search" />
                                </p-iconfield>
                            }

                            @if (captionEnd) {
                                <ng-container [ngTemplateOutlet]="captionEnd" [ngTemplateOutletContext]="captionCtx"></ng-container>
                            }
                        </div>
                    </div>
                </ng-template>

                <!-- Header -->
                <ng-template pTemplate="header">
                    <tr>
                        @if (config.selectable) {
                            <th class="gt-sticky" [style.left.px]="0" style="width:5rem;min-width:5rem">
                                @if (config.selectionMode === 'multiple' && config.showSelectAll !== false) {
                                    <p-tableHeaderCheckbox></p-tableHeaderCheckbox>
                                }
                            </th>
                        }

                        @for (col of viewColumns; track col.field) {
                            @if (col.sortable !== false) {
                                <th pResizableColumn [style.min-width]="col.width || '4rem'" [style.width]="col.width || null" [pSortableColumn]="col.field" [class.gt-sticky]="col.frozen" [style.left.px]="col.frozen ? stickyLeftPx(col) : null">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;">
                                        <span style="display:flex;align-items:center;gap:.5rem;flex:1 1 0%;min-width:0;">
                                            <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ col.header }}</span>
                                            <p-sortIcon [field]="col.field"></p-sortIcon>
                                        </span>
                                        @if (col.filterable !== false) {
                                            <p-columnFilter style="flex-shrink:0;" type="text" [field]="col.field" display="menu" [placeholder]="'Search by ' + col.header.toLowerCase()" [showOperator]="false" [showAddButton]="false">
                                            </p-columnFilter>
                                        }
                                    </div>
                                </th>
                            } @else {
                                <th pResizableColumn [style.min-width]="col.width || '4rem'" [style.width]="col.width || null" [class.gt-sticky]="col.frozen" [style.left.px]="col.frozen ? stickyLeftPx(col) : null">
                                    <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;">
                                        <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ col.header }}</span>
                                        @if (col.filterable !== false) {
                                            <p-columnFilter type="text" [field]="col.field" display="menu" [placeholder]="'Search by ' + col.header.toLowerCase()" [showOperator]="false" [showAddButton]="false"> </p-columnFilter>
                                        }
                                    </div>
                                </th>
                            }
                        }

                        @if (showActionsCol()) {
                            <th pResizableColumn style="min-width:10rem;width:10rem">
                                @if (actionsHeaderTemplate) {
                                    <ng-container [ngTemplateOutlet]="actionsHeaderTemplate" [ngTemplateOutletContext]="{ api: publicApi }"></ng-container>
                                } @else {
                                    Actions
                                }
                            </th>
                        }
                    </tr>
                </ng-template>

                <!-- Body -->
                <ng-template pTemplate="body" let-row let-editing="editing" let-ri="rowIndex">
                    <tr [pEditableRow]="row">
                        @if (config.selectable) {
                            <td class="gt-sticky" [style.left.px]="0" style="width:5rem;min-width:5rem">
                                <p-tableCheckbox [value]="row"></p-tableCheckbox>
                            </td>
                        }

                        @for (col of viewColumns; track col.field) {
                            <td [class.gt-sticky]="col.frozen" [style.left.px]="col.frozen ? stickyLeftPx(col) : null" [style.min-width]="col.width || '4rem'" [style.width]="col.width || null">
                                <div style="min-width:0;max-width:100%;">
                                    @if (isColumnEditable(col) && isEditingEnabled()) {
                                        <!-- Editable cell -->
                                        <p-cellEditor>
                                            <ng-template pTemplate="input">
                                                @switch (col.editorType || 'text') {
                                                    @case ('text') {
                                                        <input pInputText class="w-full" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" />
                                                    }
                                                    @case ('number') {
                                                        <input type="number" pInputText class="w-full" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" />
                                                    }
                                                    @case ('textarea') {
                                                        <textarea pInputText rows="2" class="w-full" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)"></textarea>
                                                    }
                                                    @case ('date') {
                                                        <p-datepicker
                                                            class="w-full"
                                                            [showIcon]="true"
                                                            [iconDisplay]="'input'"
                                                            [appendTo]="'body'"
                                                            [dateFormat]="fmt(col.dateFormat)"
                                                            [ngModel]="getDate(row, col.field)"
                                                            (ngModelChange)="setDate(row, col.field, $event)"
                                                        ></p-datepicker>
                                                    }
                                                    @case ('time') {
                                                        <p-datepicker
                                                            class="w-full"
                                                            [timeOnly]="true"
                                                            [showIcon]="true"
                                                            [iconDisplay]="'input'"
                                                            [appendTo]="'body'"
                                                            [showOnFocus]="false"
                                                            [ngModel]="getTime(row, col.field)"
                                                            (ngModelChange)="setTime(row, col.field, $event)"
                                                        ></p-datepicker>
                                                    }
                                                    @case ('autocomplete') {
                                                        <p-autocomplete
                                                            class="w-full"
                                                            appendTo="body"
                                                            [suggestions]="ac[col.field] || []"
                                                            (completeMethod)="acFill(col, $event)"
                                                            [optionLabel]="'label'"
                                                            [dropdown]="true"
                                                            [forceSelection]="true"
                                                            [ngModel]="acSel(row, col)"
                                                            (ngModelChange)="acSet(row, col, $event)"
                                                        >
                                                            <ng-template pTemplate="item" let-opt>{{ opt.label }}</ng-template>
                                                        </p-autocomplete>
                                                    }
                                                }
                                            </ng-template>

                                            <ng-template pTemplate="output">
                                                @if (col.customTemplate && custom(col.field)) {
                                                    <div class="gt-cell" [style.max-width]="maxW(col)">
                                                        <ng-container [ngTemplateOutlet]="custom(col.field)!" [ngTemplateOutletContext]="{ $implicit: row, rowIndex: ri, field: col.field, value: val(row, col.field) }"></ng-container>
                                                    </div>
                                                } @else {
                                                    <span class="gt-cell" [style.max-width]="maxW(col)" [pTooltip]="col.showTooltip ? display(row, col) : undefined">
                                                        {{ display(row, col) }}
                                                    </span>
                                                }
                                            </ng-template>
                                        </p-cellEditor>
                                    } @else {
                                        <!-- Readonly cell -->
                                        @if (col.customTemplate && custom(col.field)) {
                                            <div class="gt-cell" [style.max-width]="maxW(col)">
                                                <ng-container [ngTemplateOutlet]="custom(col.field)!" [ngTemplateOutletContext]="{ $implicit: row, rowIndex: ri, field: col.field, value: val(row, col.field) }"></ng-container>
                                            </div>
                                        } @else {
                                            <span class="gt-cell" [style.max-width]="maxW(col)" [pTooltip]="col.showTooltip ? display(row, col) : undefined">
                                                {{ display(row, col) }}
                                            </span>
                                        }
                                    }
                                </div>
                            </td>
                        }

                        <!-- Actions column -->
                        @if (showActionsCol()) {
                            <td class="text-center">
                                @if (actionsTemplate) {
                                    <ng-container [ngTemplateOutlet]="actionsTemplate" [ngTemplateOutletContext]="{ $implicit: row, rowIndex: ri, editing: editing, api: publicApi, selected: selectedRows }"></ng-container>
                                } @else {
                                    @if (isEditingEnabled() && hasEditableColumns()) {
                                        <div class="flex items-center justify-center gap-2">
                                            @if (!editing) {
                                                <p-button icon="pi pi-pencil" severity="secondary" size="small" text pInitEditableRow pTooltip="Edit"></p-button>
                                            } @else {
                                                <p-button icon="pi pi-check" severity="success" size="small" text pSaveEditableRow pTooltip="Save"></p-button>
                                                <p-button icon="pi pi-times" severity="danger" size="small" text pCancelEditableRow pTooltip="Cancel"></p-button>
                                            }
                                        </div>
                                    }
                                }
                            </td>
                        }
                    </tr>
                </ng-template>

                <!-- Empty -->
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

                <!-- Loading -->
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

            <!-- Footer summary -->
            @if (!loading && config.showResultsSummary !== false) {
                <div class="mt-4 text-sm text-gray-600">
                    <div class="flex justify-between items-center">
                        <span>Showing {{ data.length || 0 }} of {{ totalRecords | number }} records</span>
                        @if (config.selectable && selectedRows.length) {
                            <span>{{ selectedRows.length }} item(s) selected</span>
                        }
                    </div>
                </div>
            }
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
            :host ::ng-deep .p-datatable-wrapper {
                overflow-x: auto;
            }

            :host ::ng-deep .gt-cell {
                display: block;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            :host ::ng-deep th.gt-sticky,
            :host ::ng-deep td.gt-sticky {
                position: sticky;
                left: 0;
                z-index: 2;
                background: var(--p-datatable-sticky-bg, var(--p-surface-0));
            }
            :host ::ng-deep th.gt-sticky {
                z-index: 3;
            }
        `
        ]
    })
], GenericTableComponent);
export { GenericTableComponent };
