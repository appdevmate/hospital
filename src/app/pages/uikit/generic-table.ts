// tableplugin.ts
import { Component as NgComponent, Input, Output, EventEmitter, ViewChild, ElementRef, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import type { TableColumn, TableConfig, RowEditEvent, FilterControl, ExportOptions, TableApi } from '../../interfaces/tableplugin.interfaces';
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

@NgComponent({
    selector: 'app-generic-table',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, IconFieldModule, InputIconModule, InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule, ToolbarModule, TagModule, TooltipModule, PopoverModule, ListboxModule, CheckboxModule],
    template: `
  <div class="card">
    <!-- Title -->
    <div class="font-semibold text-xl mb-4" *ngIf="config?.title">
      {{ config.title }}
    </div>

    <!-- Toolbar -->
    <p-toolbar class="mb-6" *ngIf="config?.showToolbar">
      <ng-template #start>
        <ng-container *ngIf="toolbarStart" [ngTemplateOutlet]="toolbarStart" [ngTemplateOutletContext]="toolbarCtx"></ng-container>
      </ng-template>
      <ng-template #end>
        <ng-container *ngIf="toolbarEnd" [ngTemplateOutlet]="toolbarEnd" [ngTemplateOutletContext]="toolbarCtx"></ng-container>
      </ng-template>
    </p-toolbar>

    <!-- Table -->
    <p-table
      #dt
      [value]="data"
      [dataKey]="dataKey"
      [loading]="loading"
      [lazy]="isLazy"
      [paginator]="true"
      [rows]="pageSize"
      [rowsPerPageOptions]="config.pageSizeOptions || [5,10,15,25,50,100]"
      [totalRecords]="totalRecords"
      [rowHover]="config.rowHover !== false"
      [showGridlines]="config.showGridlines !== false"
      [(selection)]="selectedRows"
      [selectionMode]="getSelectionMode()"
      (selectionChange)="onSelectionChange()"
      [responsiveLayout]="config.responsive !== false ? 'scroll' : 'stack'"
      [scrollable]="true"
      [scrollHeight]="config.scrollHeight || '600px'"
      [editMode]="config.editType === 'cell' ? 'cell' : 'row'"
      sortMode="single"
      [tableStyle]="{ 'table-layout': 'fixed', 'width': 'max-content', 'min-width': '100%' }"
      (onLazyLoad)="lazyLoad.emit($event)"
      (onRowEditInit)="onTableRowEditInit($event)"
      (onRowEditSave)="onTableRowEditSave($event)"
      (onRowEditCancel)="onTableRowEditCancel($event)">

      <!-- Caption -->
      <ng-template #caption>
        <div class="flex justify-between items-center flex-col sm:flex-row gap-2">
          <!-- Left: quick filters -->
          <div class="flex items-center gap-2">
            <button *ngIf="config.showClearButton !== false" pButton label="Clear" class="p-button-outlined" icon="pi pi-filter-slash" (click)="clear(dt)"></button>

            <ng-container *ngIf="captionStart" [ngTemplateOutlet]="captionStart" [ngTemplateOutletContext]="captionCtx"></ng-container>

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

          <!-- Right: column picker + global search -->
          <div class="flex items-center gap-2 ml-auto">
            <button *ngIf="config.showColumnPicker !== false" pButton class="p-button-outlined" label="Select Columns" icon="pi pi-bars" (click)="colsPop.toggle($event)"></button>

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

            <ng-container *ngIf="captionEnd" [ngTemplateOutlet]="captionEnd" [ngTemplateOutletContext]="captionCtx"></ng-container>
          </div>
        </div>
      </ng-template>

      <!-- Header -->
      <ng-template pTemplate="header">
        <tr>
          <th
  *ngIf="config?.selectable"
  class="gt-sticky"
  [style.left.px]="0"
  style="width:5rem;min-width:5rem"
>
  <p-tableHeaderCheckbox
    *ngIf="config?.selectionMode === 'multiple' && config?.showSelectAll !== false">
  </p-tableHeaderCheckbox>
</th>


          <ng-container *ngFor="let col of viewColumns; trackBy: trackByField">
            <th *ngIf="col.sortable !== false; else noSort"
                [style.min-width]="col.width || '12rem'"
                [style.width]="col.width || '12rem'"
                [pSortableColumn]="col.field"
                [class.gt-sticky]="col.frozen"
                [style.left.px]="col.frozen ? stickyLeftPx(col) : null">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;">
                <!-- text + sort icon -->
                <span style="display:flex;align-items:center;gap:.5rem;flex:1 1 0%;min-width:0;">
                  <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    {{ col.header }}
                  </span>
                  <p-sortIcon [field]="col.field"></p-sortIcon>
                </span>

                <!-- filter stays visible -->
                <p-columnFilter
                  *ngIf="col.filterable !== false"
                  style="flex-shrink:0;"
                  type="text"
                  [field]="col.field"
                  display="menu"
                  [placeholder]="'Search by ' + col.header.toLowerCase()"
                  [showOperator]="false"
                  [showAddButton]="false">
                </p-columnFilter>
              </div>
            </th>

            <ng-template #noSort>
              <th [style.min-width]="col.width || '12rem'"
                  [style.width]="col.width || '12rem'"
                  [class.gt-sticky]="col.frozen"
                  [style.left.px]="col.frozen ? stickyLeftPx(col) : null">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;">
                  <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ col.header }}</span>
                  <p-columnFilter
                    *ngIf="col.filterable !== false"
                    type="text"
                    [field]="col.field"
                    display="menu"
                    [placeholder]="'Search by ' + col.header.toLowerCase()"
                    [showOperator]="false"
                    [showAddButton]="false">
                  </p-columnFilter>
                </div>
              </th>
            </ng-template>
          </ng-container>

          <th style="min-width: 8rem" *ngIf="showActionsCol()">
            <ng-container *ngIf="actionsHeaderTemplate; else defaultActionsHeader" [ngTemplateOutlet]="actionsHeaderTemplate" [ngTemplateOutletContext]="{ api: publicApi }"></ng-container>
            <ng-template #defaultActionsHeader>Actions</ng-template>
          </th>
        </tr>
      </ng-template>

      <!-- Body -->
      <ng-template pTemplate="body" let-row let-editing="editing" let-ri="rowIndex">
        <tr [pEditableRow]="row">
          <td
  *ngIf="config?.selectable"
  class="gt-sticky"
  [style.left.px]="0"
  style="width:5rem;min-width:5rem"
>
  <p-tableCheckbox [value]="row"></p-tableCheckbox>
</td>


          <td *ngFor="let col of viewColumns; trackBy: trackByField"
              [class.gt-sticky]="col.frozen"
              [style.left.px]="col.frozen ? stickyLeftPx(col) : null"
              [style.min-width]="col.width || '12rem'"
              [style.width]="col.width || '12rem'">
            <div style="min-width:0;max-width:100%;">
              <!-- Editable cell -->
              <ng-container *ngIf="isColumnEditable(col) && isEditingEnabled(); else readCell">
                <p-cellEditor>
                  <ng-template pTemplate="input">
                    <ng-container [ngSwitch]="col.editorType || 'text'">
                      <input *ngSwitchCase="'text'" pInputText class="w-full" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" />
                      <input *ngSwitchCase="'number'" type="number" pInputText class="w-full" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)" />
                      <textarea *ngSwitchCase="'textarea'" pInputText rows="2" class="w-full" [ngModel]="get(row, col.field)" (ngModelChange)="set(row, col.field, $event)"></textarea>
                      <p-datepicker *ngSwitchCase="'date'" class="w-full" [showIcon]="true" [iconDisplay]="'input'" [appendTo]="'body'" [dateFormat]="fmt(col.dateFormat)" [ngModel]="getDate(row, col.field)" (ngModelChange)="setDate(row, col.field, $event)"></p-datepicker>
                      <p-datepicker
                        *ngSwitchCase="'time'"
                        class="w-full"
                        [timeOnly]="true"
                        [showIcon]="true"
                        [iconDisplay]="'input'"
                        [appendTo]="'body'"
                        [showOnFocus]="false"
                        [ngModel]="getTime(row, col.field)"
                        (ngModelChange)="setTime(row, col.field, $event)">
                        </p-datepicker>
                  
                      <p-autocomplete
                      *ngSwitchCase="'autocomplete'"
                      class="w-full"
                      appendTo="body"
                      [suggestions]="ac[col.field] || []"
                      (completeMethod)="acFill(col, $event)"
                      [optionLabel]="'label'"
                      [dropdown]="true"
                      [forceSelection]="true"
                      [ngModel]="acSel(row, col)"
                      (ngModelChange)="acSet(row, col, $event)">
                      <ng-template pTemplate="item" let-opt>{{ opt.label }}</ng-template>
                    </p-autocomplete>
                    </ng-container>
                  </ng-template>

                  <ng-template pTemplate="output">
                    <ng-container *ngIf="col.customTemplate && custom(col.field); else textOut">
  <div class="gt-cell" [style.max-width]="maxW(col)">
    <ng-container *ngTemplateOutlet="custom(col.field)!; context: { $implicit: row, rowIndex: ri, field: col.field, value: val(row, col.field) }"></ng-container>
  </div>
</ng-container>

                    <ng-template #textOut>
  <span class="gt-cell"
      [style.max-width]="maxW(col)"
      [pTooltip]="col.showTooltip ? display(row, col) : undefined">
  {{ display(row, col) }}
</span>

</ng-template>

                  </ng-template>
                </p-cellEditor>
              </ng-container>

              <!-- Readonly cell -->
              <ng-template #readCell>
                <ng-container *ngIf="col.customTemplate && custom(col.field); else plain">
  <div class="gt-cell" [style.max-width]="maxW(col)">
    <ng-container *ngTemplateOutlet="custom(col.field)!; context: { $implicit: row, rowIndex: ri, field: col.field, value: val(row, col.field) }"></ng-container>
  </div>
</ng-container>

<ng-template #plain>
  <span class="gt-cell"
      [style.max-width]="maxW(col)"
      [pTooltip]="col.showTooltip ? display(row, col) : undefined">
  {{ display(row, col) }}
</span>

</ng-template>

              </ng-template>
            </div>
          </td>

          <!-- Actions -->
          <td *ngIf="showActionsCol()" class="text-center">
            <ng-container *ngIf="actionsTemplate; else builtInActions" [ngTemplateOutlet]="actionsTemplate" [ngTemplateOutletContext]="{ $implicit: row, rowIndex: ri, editing: editing, api: publicApi, selected: selectedRows }"></ng-container>

            <ng-template #builtInActions>
              <div class="flex items-center justify-center gap-2" *ngIf="isEditingEnabled() && hasEditableColumns()">
                <ng-container *ngIf="!editing; else editControls">
                  <p-button icon="pi pi-pencil" severity="secondary" size="small" text pInitEditableRow pTooltip="Edit"></p-button>
                </ng-container>

                <ng-template #editControls>
                  <p-button icon="pi pi-check" severity="success" size="small" text pSaveEditableRow pTooltip="Save"></p-button>
                  <p-button icon="pi pi-times" severity="danger" size="small" text pCancelEditableRow pTooltip="Cancel"></p-button>
                </ng-template>
              </div>
            </ng-template>
          </td>
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
    <div class="mt-4 text-sm text-gray-600" *ngIf="!loading && config.showResultsSummary !== false">
      <div class="flex justify-between items-center">
        <span>Showing {{ data.length || 0 }} of {{ totalRecords | number }} records</span>
        <span *ngIf="config?.selectable && selectedRows?.length">{{ selectedRows.length }} item(s) selected</span>
      </div>
    </div>
  </div>
`,
    styles: [
        `
      :host ::ng-deep .p-autocomplete, :host ::ng-deep .p-datepicker{width:100%}
      :host ::ng-deep .p-button.p-button-text{padding:.25rem;min-width:auto}
      :host ::ng-deep .p-datatable-wrapper{overflow-x:auto}

      /* Ellipsis clamp for long values */
      :host ::ng-deep .gt-cell{
        display:block;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      /* Frozen columns */
      :host ::ng-deep th.gt-sticky, :host ::ng-deep td.gt-sticky{
        position:sticky;
        left:0;
        z-index:2;
        background:var(--p-datatable-sticky-bg, var(--p-surface-0));
      }
      :host ::ng-deep th.gt-sticky{ z-index:3 }
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
    @Input() toolbarStart?: TemplateRef<any>;
    @Input() toolbarEnd?: TemplateRef<any>;
    @Input() captionStart?: TemplateRef<any>;
    @Input() captionEnd?: TemplateRef<any>;
    @Input() actionsTemplate?: TemplateRef<any>;
    @Input() actionsHeaderTemplate?: TemplateRef<any>;
    @Input() customTemplates: { [field: string]: TemplateRef<any> } = {};
    @Input() selectedRows: T[] = [];
    @Input() visibleColumnFields?: string[];
    @Input() requireAtLeastOneColumn = true;
    @Input() filterControls: FilterControl[] = [];
    @Input() activeFilters: Record<string, any> = {};
    @Output() filterControlChange = new EventEmitter<{ id: string; value: any }>();
    @Output() columnsVisibilityChange = new EventEmitter<string[]>();
    @Output() clearAll = new EventEmitter<void>();
    @Output() lazyLoad = new EventEmitter<any>();
    @Output() rowEditInit = new EventEmitter<RowEditEvent<T>>();
    @Output() rowEditSave = new EventEmitter<RowEditEvent<T>>();
    @Output() rowEditCancel = new EventEmitter<RowEditEvent<T>>();
    @Output() selectionChange = new EventEmitter<T[]>();
    pageSize = 15;
    columnFilter = '';
    columnHeaderMap: Record<string, string> = {};
    private visibleFields: string[] = [];
    columnOptions: { header: string; field: string }[] = [];
    selectedColumnOptions: { header: string; field: string }[] = [];
    ac: Record<string, { label: string; value: any }[]> = {};
    private dateCache = new WeakMap<any, Map<string, Date | null>>();
    private clonedRows: { [s: string]: T } = {};
    private readonly SELECT_COL_WIDTH = '5rem';

    // trackBy
    trackByField = (_: number, c: TableColumn) => c.field;

    ngOnChanges(ch: SimpleChanges) {
        if (ch['config']) this.pageSize = this.config?.defaultPageSize ?? 15;
        if (ch['columns'] || ch['visibleColumnFields']) this.ensureVisibleInit();
        this.refreshContexts();
    }
    private refreshContexts() {
        this.toolbarCtx = { api: this.publicApi, selected: this.selectedRows, config: this.config, columns: this.columns, viewColumns: this.viewColumns, total: this.totalRecords };
        this.captionCtx = { api: this.publicApi, selected: this.selectedRows, config: this.config };
    }

    getTime(row: any, f: string): Date | null {
        if (!row) return null;

        const m = this.ref(row); // same cache used by getDate

        if (m.has(f)) {
            return m.get(f) ?? null;
        }

        const v = row[f];
        if (!v) {
            m.set(f, null);
            return null;
        }

        let d: Date | null = null;

        if (v instanceof Date) {
            d = v;
        } else if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) {
            const [hh, mm] = v.split(':').map(Number);
            d = new Date();
            d.setHours(hh, mm, 0, 0);
        }

        m.set(f, d);
        return d;
    }

    setTime(row: any, f: string, v: Date | null) {
        if (!row) return;

        this.ref(row).set(f, v);

        if (!v) {
            row[f] = null;
            return;
        }

        const hh = String(v.getHours()).padStart(2, '0');
        const mm = String(v.getMinutes()).padStart(2, '0');
        row[f] = `${hh}:${mm}`;
    }

    private rowElementAt(index?: number) {
        if (index == null || index < 0) return null;
        const host: HTMLElement | null = (this.dt as any)?.el?.nativeElement ?? null;
        if (!host) return null;
        const trs = host.querySelectorAll('tbody tr');
        return trs?.[index] || null;
    }
    private _beginRowEdit(row: T, rowIndex?: number) {
        const el = this.rowElementAt(rowIndex);
        if (el && (this.dt as any)?.initRowEdit) (this.dt as any).initRowEdit(row, el);
    }
    private _saveRowEdit(row: T, rowIndex?: number) {
        const el = this.rowElementAt(rowIndex);
        if (el && (this.dt as any)?.saveRowEdit) (this.dt as any).saveRowEdit(row, el);
    }
    private _cancelRowEdit(row: T, rowIndex?: number) {
        const el = this.rowElementAt(rowIndex);
        if (el && (this.dt as any)?.cancelRowEdit) (this.dt as any).cancelRowEdit(row, el);
    }

    toMutable<T>(arr?: ReadonlyArray<T> | null): T[] {
        return arr ? arr.slice() : [];
    }

    private selectionColWidthPx(): number {
        return this.cssSizeToPx('5rem'); // keep in sync with template width
    }

    toolbarCtx: any = {};
    captionCtx: any = {};
    public readonly publicApi: TableApi<T> = {
        clear: () => this.clear(this.dt),
        exportCSV: (o?: ExportOptions) => this.exportCSV(o),
        table: () => this.dt,
        getSelected: () => this.selectedRows,
        setVisibleColumns: (f: string[]) => this.setVisibleColumns(f),
        beginRowEdit: (r: T, i?: number) => this._beginRowEdit(r, i),
        saveRowEdit: (r: T, i?: number) => this._saveRowEdit(r, i),
        cancelRowEdit: (r: T, i?: number) => this._cancelRowEdit(r, i)
    };

    // width helpers for sticky calc & ellipsis
    private rootFontSizePx(): number {
        if (typeof window === 'undefined') return 16;
        const fs = getComputedStyle(document.documentElement).fontSize;
        return parseFloat(fs) || 16;
    }
    private cssSizeToPx(size?: string): number {
        if (!size) return 0;
        const s = String(size).trim();
        if (s.endsWith('px')) return parseFloat(s);
        if (s.endsWith('rem')) return parseFloat(s) * this.rootFontSizePx();
        if (s.endsWith('em')) return parseFloat(s) * this.rootFontSizePx();
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }
    private colWidthPx(c: TableColumn): number {
        return this.cssSizeToPx(c.width || '12rem');
    }
    /** Sum widths of preceding frozen columns */
    stickyLeftPx(col: TableColumn): number {
        let left = 0;

        // selection checkbox column is first and sticky
        if (this.config?.selectable) {
            left += this.cssSizeToPx(this.SELECT_COL_WIDTH);
        }

        for (const c of this.viewColumns) {
            if (c === col) break;
            if (c.frozen) left += this.colWidthPx(c);
        }
        return left;
    }

    /** Safe max width resolver (allows ad-hoc maxWidth without typing it in TableColumn) */
    maxW(col: TableColumn): string {
        const anyCol = col as any;
        return anyCol.maxWidth || col.width || '20rem';
    }

    isActive = (ctl: FilterControl) => (ctl.type === 'toggle' ? !!this.activeFilters?.[ctl.id] : this.activeFilters?.[ctl.id] !== undefined && this.activeFilters?.[ctl.id] !== null && this.activeFilters?.[ctl.id] !== '');
    computeLabel = (ctl: FilterControl) =>
        ctl.getLabel ? ctl.getLabel(this.activeFilters?.[ctl.id]) : ctl.type === 'cycle' ? ctl.label || 'Filter' : ctl.type === 'toggle' ? (this.isActive(ctl) ? ctl.label || 'On' : ctl.label || 'Off') : ctl.label || 'Action';
    computeIcon = (ctl: FilterControl) => (ctl.getIcon ? ctl.getIcon(this.activeFilters?.[ctl.id]) : ctl.icon);
    onFilterClick(ctl: FilterControl) {
        const cur = this.activeFilters?.[ctl.id];
        let next: any = cur;
        if (ctl.type === 'toggle') next = cur ? null : true;
        else if (ctl.type === 'cycle') {
            const arr = ctl.values ?? [null, true, false];
            const idx = arr.findIndex((x) => JSON.stringify(x) === JSON.stringify(cur));
            next = arr[(idx + 1) % arr.length];
        } else next = true;
        this.filterControlChange.emit({ id: ctl.id, value: next });
    }

    private ensureVisibleInit() {
        this.columnOptions = (this.columns || []).map((c) => ({ header: c.header || c.field, field: c.field }));
        this.columnHeaderMap = Object.fromEntries(this.columnOptions.map((o) => [o.field, o.header]));
        const all = this.columnOptions.map((o) => o.field);
        let seed = this.visibleColumnFields ? this.visibleColumnFields.filter((f) => all.includes(f)) : all.slice();
        if (this.requireAtLeastOneColumn && seed.length === 0 && this.columnOptions[0]) seed = [this.columnOptions[0].field];
        this.visibleFields = seed.slice();
        this.selectedColumnOptions = this.columnOptions.filter((o) => seed.includes(o.field));
    }
    setVisibleFromOptions(list: { header: string; field: string }[]) {
        const want = list || [];
        this.selectedColumnOptions = this.requireAtLeastOneColumn && want.length === 0 ? (this.columnOptions[0] ? [this.columnOptions[0]] : []) : want;
        this.visibleFields = this.selectedColumnOptions.map((o) => o.field);
        this.columnsVisibilityChange.emit(this.visibleFields);
        this.refreshContexts();
    }
    setVisibleColumns(fields: string[]) {
        const all = new Set(this.columnOptions.map((o) => o.field));
        const safe = (fields || []).filter((f) => all.has(f));
        if (this.requireAtLeastOneColumn && safe.length === 0 && this.columnOptions[0]) safe.push(this.columnOptions[0].field);
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
    isSelectedField = (field: string) => (this.selectedColumnOptions || []).some((o) => o.field === field);
    isAllSelected = () => this.selectedColumnOptions?.length === this.columnOptions?.length;
    toggleAll(checked: boolean) {
        this.selectedColumnOptions = checked ? [...this.columnOptions] : [];
        this.setVisibleFromOptions(this.selectedColumnOptions);
    }

    isEditingEnabled = () => this.config?.editType === 'row' || this.config?.editType === 'cell';
    isColumnEditable = (col: TableColumn) => col.editable === true;
    hasEditableColumns = () => this.columns.some((col) => col.editable === true);

    onTableRowEditInit(event: any) {
        const rowData = event.data || event,
            rowIndex = event.index,
            key = rowData[this.dataKey];
        this.clonedRows[key] = { ...rowData };
        this.rowEditInit.emit({ data: rowData, index: rowIndex });
    }
    onTableRowEditSave(event: any) {
        const rowData = event.data || event,
            rowIndex = event.index,
            key = rowData[this.dataKey];
        delete this.clonedRows[key];
        this.rowEditSave.emit({ data: rowData, index: rowIndex });
    }
    onTableRowEditCancel(event: any) {
        const rowData = event.data || event,
            rowIndex = event.index,
            key = rowData[this.dataKey];
        if (this.clonedRows[key]) {
            const idx = this.data.findIndex((item) => (item as any)[this.dataKey] === key);
            if (idx !== -1) this.data[idx] = this.clonedRows[key];
            delete this.clonedRows[key];
        }
        this.rowEditCancel.emit({ data: rowData, index: rowIndex });
    }
    onRowEditInit(row: T, index: number) {
        const key = (row as any)[this.dataKey];
        if (key !== undefined && key !== null) this.clonedRows[key] = { ...(row as any) };
        this.rowEditInit.emit({ data: row, index });
    }
    onRowEditSave(row: T, index: number) {
        const key = (row as any)[this.dataKey];
        if (key !== undefined && key !== null) delete this.clonedRows[key];
        this.rowEditSave.emit({ data: row, index });
    }
    onRowEditCancel(row: T, index: number) {
        const key = (row as any)[this.dataKey];
        if (key !== undefined && key !== null && this.clonedRows[key]) {
            const i = this.data.findIndex((r) => (r as any)[this.dataKey] === key);
            if (i !== -1) this.data[i] = this.clonedRows[key];
            delete this.clonedRows[key];
        }
        this.rowEditCancel.emit({ data: row, index });
    }

    onSelectionChange() {
        this.selectionChange.emit(this.selectedRows);
        this.refreshContexts();
    }
    getSelectionMode(): 'single' | 'multiple' | null {
        return !this.config?.selectable ? null : this.config.selectionMode === 'single' ? 'single' : 'multiple';
    }
    get viewColumns(): TableColumn[] {
        return (this.columns || []).filter((c) => this.visibleFields.includes(c.field));
    }
    getColSpan(): number {
        let base = this.viewColumns.length + (this.showActionsCol() ? 1 : 0);
        if (this.config?.selectable) base += 1;
        return base;
    }
    showActionsCol = () => !!this.actionsTemplate || (this.isEditingEnabled() && this.hasEditableColumns());

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

    get = (row: any, f: string) => row?.[f];
    set = (row: any, f: string, v: any) => {
        if (row) row[f] = v;
    };
    val = (row: any, f: string) => f.split('.').reduce((o, p) => (o ? (o as any)[p] : undefined), row);
    acFill(col: TableColumn, e: { query?: string }) {
        const all = col.editorOptions || [];
        const q = (e.query || '').toLowerCase();
        this.ac[col.field] = q ? all.filter((o) => String(o.label).toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)) : all.slice(0, 50);
    }
    acSel(row: any, col: TableColumn) {
        const v = row?.[col.field];
        return (col.editorOptions || []).find((o) => o.value === v) || null;
    }
    acSet(row: any, col: TableColumn, sel: any) {
        row[col.field] = sel && typeof sel === 'object' && 'value' in sel ? sel.value : (sel ?? null);
    }

    private ref(row: any) {
        let m = this.dateCache.get(row);
        if (!m) {
            m = new Map<string, Date | null>();
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

    display(row: T, col: TableColumn): string {
        const v = this.val(row, col.field);
        if (v == null) return '-';

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

    toValidDate(val: unknown): Date | null {
        if (val instanceof Date && !isNaN(val.getTime())) return val;

        if (typeof val === 'number') {
            const ms = val < 1e12 ? val * 1000 : val; // support seconds or ms
            const d = new Date(ms);
            return isNaN(d.getTime()) ? null : d;
        }

        if (typeof val === 'string') {
            const s = val.trim();
            if (!s || s.toLowerCase() === 'invalid date') return null;

            // ISO or native-parsable
            const d1 = new Date(s);
            if (!isNaN(d1.getTime())) return d1;

            // dd/MM/yy or dd-MM-yyyy
            const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
            if (m) {
                const dd = +m[1],
                    mm = +m[2],
                    y = +m[3];
                const yyyy = m[3].length === 2 ? 2000 + y : y;
                const d2 = new Date(yyyy, mm - 1, dd);
                return isNaN(d2.getTime()) ? null : d2;
            }
        }

        return null;
    }

    private csvEscape(v: any): string {
        const s = v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
    }
    private raw(row: any, col: TableColumn): any {
        const v = this.val(row, col.field);
        return v instanceof Date ? v.toISOString() : (v ?? '');
    }
    exportCSV(opts?: ExportOptions) {
        const { selectionOnly = false, filename = (this.config?.title || 'export').replace(/\s+/g, '_').toLowerCase(), separator = ',', includeHeaders = true, applyPipes = true, columns } = opts || {};
        const rows: any[] = selectionOnly ? this.selectedRows || [] : this.data || [];
        if (!rows.length || !this.columns?.length) return;
        const cols = columns && columns.length ? this.columns.filter((c) => columns.includes(c.field)) : this.viewColumns;
        const header = includeHeaders ? cols.map((c) => this.csvEscape(c.header || c.field)).join(separator) + '\r\n' : '';
        const body = rows
            .map((r) =>
                cols
                    .map((c) => {
                        const v = applyPipes ? this.display(r as any, c) : this.raw(r as any, c);
                        return this.csvEscape(v);
                    })
                    .join(separator)
            )
            .join('\r\n');
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

    custom(f: string): TemplateRef<any> | null {
        return this.customTemplates && this.customTemplates[f] ? this.customTemplates[f] : null;
    }
}
