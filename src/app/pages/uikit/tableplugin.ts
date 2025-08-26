import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef, TemplateRef, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';

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
  title?: string; showGlobalSearch?: boolean; showClearButton?: boolean;
  pageSizeOptions?: number[]; defaultPageSize?: number; scrollHeight?: string;
  showGridlines?: boolean; rowHover?: boolean; responsive?: boolean;
  emptyMessage?: string; loadingMessage?: string; showResultsSummary?: boolean;
}
export interface RowEditEvent<T = any> { data: T; index?: number; }

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, IconFieldModule, InputIconModule,
    InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule
  ],
  template: `
    <div class="card">
      <div class="font-semibold text-xl mb-4" *ngIf="config?.title">{{ config.title }}</div>

      <p-table
        #dt
        [value]="data"
        [dataKey]="dataKey"
        [loading]="loading"
        [lazy]="isLazy"
        editMode="row"
        [paginator]="true"
        [rows]="pageSize"
        [rowsPerPageOptions]="config.pageSizeOptions || [5,10,15,25,50,100]"
        [totalRecords]="totalRecords"
        [rowHover]="config.rowHover !== false"
        [showGridlines]="config.showGridlines !== false"
        (onLazyLoad)="lazyLoad.emit($event)"
        (onRowEditInit)="emitRowEditInit($event)"
        (onRowEditSave)="emitRowEditSave($event)"
        (onRowEditCancel)="emitRowEditCancel($event)"
        [responsiveLayout]="config.responsive !== false ? 'scroll' : 'stack'"
        [scrollable]="true"
        [scrollHeight]="config.scrollHeight || '600px'"
        sortMode="single"
        [tableStyle]="{ 'table-layout': 'fixed', width:'100%' }"
      >
        <ng-template #caption>
          <div class="flex justify-between items-center flex-col sm:flex-row">
            <button *ngIf="config.showClearButton !== false" pButton label="Clear" class="p-button-outlined mb-2" icon="pi pi-filter-slash" (click)="clear(dt)"></button>
            <p-iconfield *ngIf="config.showGlobalSearch !== false" iconPosition="left" class="ml-auto">
              <p-inputicon><i class="pi pi-search"></i></p-inputicon>
              <input #globalFilter pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Global Search"/>
            </p-iconfield>
          </div>
        </ng-template>

<ng-template pTemplate="header">
  <tr>
    <ng-container *ngFor="let col of columns">
      <!-- Sortable by default -->
      <th *ngIf="col.sortable !== false; else noSort"
          [style.min-width]="col.width || '12rem'"
          [pSortableColumn]="col.field">
        <div class="flex justify-between items-center">
          <span class="flex items-center gap-2">
            {{ col.header }}
            <p-sortIcon [field]="col.field"></p-sortIcon>
          </span>
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

      <!-- Non-sortable -->
      <ng-template #noSort>
        <th [style.min-width]="col.width || '12rem'">
          <div class="flex justify-between items-center">
            {{ col.header }}
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

    <th style="min-width:8rem">Actions</th>
  </tr>
</ng-template>



        <ng-template pTemplate="body" let-row let-editing="editing" let-ri="rowIndex">
          <tr [pEditableRow]="row">
            <td *ngFor="let col of columns">
              <ng-container *ngIf="col.editable === true; else readCell">
                <p-cellEditor>
                  <ng-template pTemplate="input">
                    <ng-container [ngSwitch]="col.editorType || 'text'">
                      <input *ngSwitchCase="'text'" pInputText
                        [ngModel]="get(row,col.field)" (ngModelChange)="set(row,col.field,$event)" [attr.placeholder]="col.header"/>
                      <input *ngSwitchCase="'number'" type="number" pInputText
                        [ngModel]="get(row,col.field)" (ngModelChange)="set(row,col.field,$event)"/>
                      <textarea *ngSwitchCase="'textarea'" pInputText rows="2"
                        [ngModel]="get(row,col.field)" (ngModelChange)="set(row,col.field,$event)"></textarea>
                      <p-datepicker *ngSwitchCase="'date'" [showIcon]="true" [iconDisplay]="'input'" [appendTo]="'body'"
                        [dateFormat]="fmt(col.dateFormat)" [ngModel]="getDate(row,col.field)" (ngModelChange)="setDate(row,col.field,$event)" class="w-full">
                      </p-datepicker>
                      <p-autocomplete *ngSwitchCase="'autocomplete'"
                        [suggestions]="ac[col.field] || []" (completeMethod)="acFill(col,$event)"
                        [optionLabel]="'label'" [dropdown]="true" [forceSelection]="true" class="w-full"
                        [ngModel]="acSel(row,col)" (ngModelChange)="acSet(row,col,$event)">
                        <ng-template pTemplate="item" let-opt>{{ opt.label }}</ng-template>
                      </p-autocomplete>
                    </ng-container>
                  </ng-template>
                  <ng-template pTemplate="output">
                    <ng-container *ngIf="col.customTemplate && custom(col.field); else textOut">
                      <ng-container *ngTemplateOutlet="custom(col.field)!; context:{ $implicit: row, rowIndex: ri, field: col.field, value: val(row,col.field) }"></ng-container>
                    </ng-container>
                    <ng-template #textOut>{{ display(row,col) }}</ng-template>
                  </ng-template>
                </p-cellEditor>
              </ng-container>

              <ng-template #readCell>
                <ng-container *ngIf="col.customTemplate && custom(col.field); else plain">
                  <ng-container *ngTemplateOutlet="custom(col.field)!; context:{ $implicit: row, rowIndex: ri, field: col.field, value: val(row,col.field) }"></ng-container>
                </ng-container>
                <ng-template #plain>{{ display(row,col) }}</ng-template>
              </ng-template>
            </td>

            <td>
              <div class="flex items-center justify-center gap-2">
                <button *ngIf="!editing" pButton type="button" pInitEditableRow icon="pi pi-pencil" text rounded severity="secondary"></button>
                <button *ngIf="editing" pButton type="button" pSaveEditableRow icon="pi pi-check" text rounded severity="secondary"></button>
                <button *ngIf="editing" pButton type="button" pCancelEditableRow icon="pi pi-times" text rounded severity="secondary"></button>
                <ng-container *ngIf="actionsTemplate" [ngTemplateOutlet]="actionsTemplate" [ngTemplateOutletContext]="{ $implicit: row, rowIndex: ri }"></ng-container>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td [colSpan]="columns.length + 1" class="text-center py-8">
              <div class="text-gray-500"><i class="pi pi-search text-3xl mb-2"></i>
                <div>{{ config.emptyMessage || 'No records found matching your criteria.' }}</div>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="loadingbody">
          <tr>
            <td [colSpan]="columns.length + 1" class="text-center py-8">
              <div class="text-gray-500"><i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
                <div>{{ config.loadingMessage || 'Loading data...' }}</div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <div class="mt-4 text-sm text-gray-600" *ngIf="!loading && config.showResultsSummary !== false">
        Showing {{ data.length || 0 }} of {{ totalRecords | number }} records
      </div>
    </div>
  `,
  styles: [`
    :host ::ng-deep .p-autocomplete, :host ::ng-deep .p-datepicker { width: 100%; }
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
  @Input() actionsTemplate?: TemplateRef<any>;
  @Input() customTemplates: { [field: string]: TemplateRef<any> } = {};

  @Output() lazyLoad = new EventEmitter<any>();
  @Output() rowEditInit = new EventEmitter<RowEditEvent<T>>();
  @Output() rowEditSave = new EventEmitter<RowEditEvent<T>>();
  @Output() rowEditCancel = new EventEmitter<RowEditEvent<T>>();

  pageSize = 15;
  ac: Record<string, { label: string; value: any }[]> = {};
  private dateCache = new WeakMap<any, Map<string, Date | null>>();

  ngOnChanges(ch: SimpleChanges) {
    if (ch['config']) this.pageSize = this.config?.defaultPageSize ?? 15;
  }

  // table utils
  onGlobalFilter(t: Table, e: Event) { t.filterGlobal((e.target as HTMLInputElement).value, 'contains'); }
  clear(t: Table) { t.clear(); if (this.globalFilter?.nativeElement) this.globalFilter.nativeElement.value = ''; }

  // model helpers
  get = (row: any, f: string) => row?.[f];
  set = (row: any, f: string, v: any) => { if (row) row[f] = v; };
  val = (row: any, f: string) => f.split('.').reduce((o, p) => (o ? o[p] : undefined), row);

  // autocomplete
  acFill(col: TableColumn, e: { query?: string }) {
    const all = col.editorOptions || [];
    const q = (e.query || '').toLowerCase();
    this.ac[col.field] = q ? all.filter(o => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q)) : all.slice(0, 50);
  }
  acSel(row: any, col: TableColumn) { const v = row?.[col.field]; return (col.editorOptions || []).find(o => o.value === v) || null; }
  acSet(row: any, col: TableColumn, sel: any) { row[col.field] = sel?.value ?? null; }

  // datepicker (stable reference)
  private ref(row: any) { let m = this.dateCache.get(row); if (!m) { m = new Map(); this.dateCache.set(row, m); } return m; }
  getDate(row: any, f: string): Date | null {
    if (!row) return null; const m = this.ref(row);
    if (m.has(f)) return m.get(f) ?? null;
    const v = row[f]; const d = v == null ? null : (v instanceof Date ? v : new Date(v));
    m.set(f, d); return d;
  }
  setDate(row: any, f: string, v: Date | null) { if (!row) return; this.ref(row).set(f, v); row[f] = v; }
  fmt = (pipeFmt?: string) => !pipeFmt ? 'mm/dd/yy' : pipeFmt.replace(/yyyy/g, 'yy').replace(/MM/g, 'mm').replace(/dd/g, 'dd');

  // display
  display(row: T, col: TableColumn): string {
    const v = this.val(row, col.field); if (v == null) return '-';
    switch (col.pipe) {
      case 'date': {
        const d = v instanceof Date ? v : new Date(v);
        return new DatePipe('en-US').transform(d, col.dateFormat || 'MM/dd/yyyy') || '-';
      }
      case 'titlecase': return typeof v === 'string' ? v.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()) : String(v);
      case 'uppercase': return String(v).toUpperCase();
      case 'lowercase': return String(v).toLowerCase();
      case 'currency': return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v));
      case 'number': return new Intl.NumberFormat('en-US').format(Number(v));
      default: return String(v);
    }
  }

  // templates
  custom = (f: string) => this.customTemplates[f] || null;

  // row edit events
  emitRowEditInit = (e: any) => this.rowEditInit.emit({ data: e.data, index: e.index });
  emitRowEditSave = (e: any) => this.rowEditSave.emit({ data: e.data, index: e.index });
  emitRowEditCancel = (e: any) => this.rowEditCancel.emit({ data: e.data, index: e.index });
}
// import {
//   Component,
//   Input,
//   Output,
//   EventEmitter,
//   ViewChild,
//   ElementRef,
//   TemplateRef,
//   OnChanges,
//   SimpleChanges
// } from '@angular/core';
// import { CommonModule, DatePipe } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { Table, TableModule } from 'primeng/table';
// import { IconFieldModule } from 'primeng/iconfield';
// import { InputIconModule } from 'primeng/inputicon';
// import { InputTextModule } from 'primeng/inputtext';
// import { AutoCompleteModule } from 'primeng/autocomplete';
// import { ButtonModule } from 'primeng/button';
// import { DatePickerModule } from 'primeng/datepicker';

// export interface TableColumn {
//   field: string;
//   header: string;
//   type?: 'text' | 'date' | 'number' | 'boolean' | 'custom';
//   pipe?: 'date' | 'currency' | 'number' | 'titlecase' | 'uppercase' | 'lowercase';
//   dateFormat?: string;
//   filterable?: boolean;
//   sortable?: boolean;
//   width?: string;
//   customTemplate?: boolean;
//   editable?: boolean;
//   editorType?: 'text' | 'date' | 'number' | 'textarea' | 'autocomplete';
//   editorOptions?: ReadonlyArray<{ label: string; value: any }>;
// }

// export interface TableConfig {
//   title?: string;
//   showGlobalSearch?: boolean;
//   showClearButton?: boolean;
//   pageSizeOptions?: number[];
//   defaultPageSize?: number;
//   scrollHeight?: string;
//   showGridlines?: boolean;
//   rowHover?: boolean;
//   responsive?: boolean;
//   emptyMessage?: string;
//   loadingMessage?: string;
//   showResultsSummary?: boolean;
// }

// export interface RowEditEvent<T = any> {
//   data: T;
//   index?: number;
// }

// @Component({
//   selector: 'app-generic-table',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     TableModule,
//     IconFieldModule,
//     InputIconModule,
//     InputTextModule,
//     AutoCompleteModule,
//     DatePickerModule,
//     ButtonModule
//   ],
//   template: `
//     <div class="card">
//       <div class="font-semibold text-xl mb-4" *ngIf="config?.title">{{ config.title }}</div>

//       <p-table
//         #dt
//         [value]="data"
//         [dataKey]="dataKey"
//         [loading]="loading"
//         [lazy]="isLazy"
//         editMode="row"
//         [paginator]="true"
//         [rows]="pageSize"
//         [rowsPerPageOptions]="config.pageSizeOptions || [5, 10, 15, 25, 50, 100]"
//         [totalRecords]="totalRecords"
//         [rowHover]="config.rowHover !== false"
//         [showGridlines]="config.showGridlines !== false"
//         (onLazyLoad)="onLazyLoad($event)"
//         (onRowEditInit)="emitRowEditInit($event)"
//         (onRowEditSave)="emitRowEditSave($event)"
//         (onRowEditCancel)="emitRowEditCancel($event)"
//         [responsiveLayout]="config.responsive !== false ? 'scroll' : 'stack'"
//         [scrollable]="true"
//         [scrollHeight]="config.scrollHeight || '600px'"
//         [tableStyle]="{ 'table-layout': 'fixed', width: '100%' }"
//       >
//         <ng-template #caption>
//           <div class="flex justify-between items-center flex-col sm:flex-row">
//             <button
//               *ngIf="config.showClearButton !== false"
//               pButton
//               label="Clear"
//               class="p-button-outlined mb-2"
//               icon="pi pi-filter-slash"
//               (click)="clear(dt)"
//             ></button>

//             <p-iconfield *ngIf="config.showGlobalSearch !== false" iconPosition="left" class="ml-auto">
//               <p-inputicon><i class="pi pi-search"></i></p-inputicon>
//               <input #globalFilter pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Global Search" />
//             </p-iconfield>
//           </div>
//         </ng-template>

//         <ng-template pTemplate="header">
//           <tr>
//             <th *ngFor="let col of columns" [style.min-width]="col.width || '12rem'">
//               <div class="flex justify-between items-center">
//                 {{ col.header }}
//                 <p-columnFilter
//                   *ngIf="col.filterable !== false"
//                   type="text"
//                   [field]="col.field"
//                   display="menu"
//                   [placeholder]="'Search by ' + col.header.toLowerCase()"
//                   [showOperator]="false"
//                   [showAddButton]="false"
//                 ></p-columnFilter>
//               </div>
//             </th>
//             <th style="min-width: 8rem">Actions</th>
//           </tr>
//         </ng-template>

//         <ng-template pTemplate="body" let-rowData let-editing="editing" let-rowIndex="rowIndex">
//           <tr [pEditableRow]="rowData">
//             <td *ngFor="let col of columns">
//               <ng-container *ngIf="col.editable === true; else nonEditableCell">
//                 <p-cellEditor>
//                   <ng-template pTemplate="input">
//                     <input
//                       *ngIf="(col.editorType || 'text') === 'text'"
//                       pInputText
//                       [ngModel]="getCellModel(rowData, col.field)"
//                       (ngModelChange)="setCellModel(rowData, col.field, $event)"
//                       [attr.placeholder]="col.header"
//                     />
//                     <p-datepicker
//                       *ngIf="col.editorType === 'date'"
//                       [showIcon]="true"
//                       [iconDisplay]="'input'"
//                       [appendTo]="'body'"
//                       [dateFormat]="toPickerFormat(col.dateFormat)"
//                       [ngModel]="getDateModel(rowData, col.field)"
//                       (ngModelChange)="setDateModel(rowData, col.field, $event)"
//                       class="w-full"
//                     ></p-datepicker>
//                     <input
//                       *ngIf="col.editorType === 'number'"
//                       type="number"
//                       pInputText
//                       [ngModel]="getCellModel(rowData, col.field)"
//                       (ngModelChange)="setCellModel(rowData, col.field, $event)"
//                     />
//                     <textarea
//                       *ngIf="col.editorType === 'textarea'"
//                       pInputText
//                       rows="2"
//                       [ngModel]="getCellModel(rowData, col.field)"
//                       (ngModelChange)="setCellModel(rowData, col.field, $event)"
//                     ></textarea>
//                     <p-autocomplete
//                       *ngIf="col.editorType === 'autocomplete'"
//                       [suggestions]="acSuggestions[col.field] || []"
//                       (completeMethod)="completeAC(col, $event)"
//                       [optionLabel]="'label'"
//                       [dropdown]="true"
//                       [forceSelection]="true"
//                       class="w-full"
//                       [ngModel]="getACSelected(rowData, col)"
//                       (ngModelChange)="setACSelected(rowData, col, $event)"
//                     >
//                       <ng-template pTemplate="item" let-opt>
//                         {{ opt.label }}
//                       </ng-template>
//                     </p-autocomplete>
//                   </ng-template>

//                   <ng-template pTemplate="output">
//                     <ng-container *ngIf="col.customTemplate && getCustomTemplate(col.field); else formattedValue">
//                       <ng-container
//                         *ngTemplateOutlet="
//                           getCustomTemplate(col.field);
//                           context: {
//                             $implicit: rowData,
//                             rowIndex: rowIndex,
//                             field: col.field,
//                             value: getFieldValue(rowData, col.field)
//                           }
//                         "
//                       ></ng-container>
//                     </ng-container>
//                     <ng-template #formattedValue>
//                       {{ formatCellValue(rowData, col) }}
//                     </ng-template>
//                   </ng-template>
//                 </p-cellEditor>
//               </ng-container>

//               <ng-template #nonEditableCell>
//                 <ng-container *ngIf="col.customTemplate && getCustomTemplate(col.field); else nonEditableText">
//                   <ng-container
//                     *ngTemplateOutlet="
//                       getCustomTemplate(col.field);
//                       context: {
//                         $implicit: rowData,
//                         rowIndex: rowIndex,
//                         field: col.field,
//                         value: getFieldValue(rowData, col.field)
//                       }
//                     "
//                   ></ng-container>
//                 </ng-container>
//                 <ng-template #nonEditableText>
//                   {{ formatCellValue(rowData, col) }}
//                 </ng-template>
//               </ng-template>
//             </td>

//             <td>
//               <div class="flex items-center justify-center gap-2">
//                 <button
//                   *ngIf="!editing"
//                   pButton
//                   type="button"
//                   pInitEditableRow
//                   icon="pi pi-pencil"
//                   text
//                   rounded
//                   severity="secondary"
//                 ></button>
//                 <button
//                   *ngIf="editing"
//                   pButton
//                   type="button"
//                   pSaveEditableRow
//                   icon="pi pi-check"
//                   text
//                   rounded
//                   severity="secondary"
//                 ></button>
//                 <button
//                   *ngIf="editing"
//                   pButton
//                   type="button"
//                   pCancelEditableRow
//                   icon="pi pi-times"
//                   text
//                   rounded
//                   severity="secondary"
//                 ></button>

//                 <ng-container
//                   *ngIf="actionsTemplate"
//                   [ngTemplateOutlet]="actionsTemplate"
//                   [ngTemplateOutletContext]="{ $implicit: rowData, rowIndex: rowIndex }"
//                 ></ng-container>
//               </div>
//             </td>
//           </tr>
//         </ng-template>

//         <ng-template pTemplate="emptymessage">
//           <tr>
//             <td [colSpan]="getTotalColumns()" class="text-center py-8">
//               <div class="text-gray-500">
//                 <i class="pi pi-search text-3xl mb-2"></i>
//                 <div>{{ config.emptyMessage || 'No records found matching your criteria.' }}</div>
//               </div>
//             </td>
//           </tr>
//         </ng-template>

//         <ng-template pTemplate="loadingbody">
//           <tr>
//             <td [colSpan]="getTotalColumns()" class="text-center py-8">
//               <div class="text-gray-500">
//                 <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
//                 <div>{{ config.loadingMessage || 'Loading data...' }}</div>
//               </div>
//             </td>
//           </tr>
//         </ng-template>
//       </p-table>

//       <div class="mt-4 text-sm text-gray-600" *ngIf="!loading && config.showResultsSummary !== false">
//         Showing {{ data.length || 0 }} of {{ totalRecords | number }} records
//       </div>
//     </div>
//   `,
//   styles: [`
//     :host ::ng-deep .p-autocomplete,
//     :host ::ng-deep .p-datepicker { width: 100%; }
//   `]
// })
// export class GenericTableComponent<T = any> implements OnChanges {
//   @ViewChild('dt') dt!: Table;
//   @ViewChild('globalFilter') globalFilter!: ElementRef;

//   @Input({ required: true }) columns: TableColumn[] = [];
//   @Input({ required: true }) dataKey: string = 'id';

//   @Input() data: T[] = [];
//   @Input() totalRecords = 0;
//   @Input() loading = false;
//   @Input() isLazy = true;
//   @Input() config: TableConfig = {};

//   @Input() actionsTemplate?: TemplateRef<any>;
//   @Input() customTemplates: { [fieldName: string]: TemplateRef<any> } = {};

//   @Output() lazyLoad = new EventEmitter<any>();
//   @Output() rowEditInit = new EventEmitter<RowEditEvent<T>>();
//   @Output() rowEditSave = new EventEmitter<RowEditEvent<T>>();
//   @Output() rowEditCancel = new EventEmitter<RowEditEvent<T>>();

//   pageSize = 15;

//   acSuggestions: Record<string, { label: string; value: any }[]> = {};

//   ngOnChanges(changes: SimpleChanges): void {
//     if (changes['config']) {
//       this.pageSize = this.config?.defaultPageSize ?? 15;
//     }
//   }

//   getTotalColumns(): number {
//     return this.columns.length + 1; // + Actions
//   }

//   onLazyLoad(event: any): void {
//     this.lazyLoad.emit(event);
//   }

//   emitRowEditInit(e: any)   { this.rowEditInit.emit({ data: e.data, index: e.index }); }
//   emitRowEditSave(e: any)   { this.rowEditSave.emit({ data: e.data, index: e.index }); }
//   emitRowEditCancel(e: any) { this.rowEditCancel.emit({ data: e.data, index: e.index }); }

//   onGlobalFilter(table: Table, event: Event): void {
//     table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
//   }

//   clear(table: Table): void {
//     table.clear();
//     if (this.globalFilter?.nativeElement) {
//       this.globalFilter.nativeElement.value = '';
//     }
//   }

//   getCellModel(row: any, field: string) {
//     return row?.[field];
//   }
//   setCellModel(row: any, field: string, value: any) {
//     if (row) row[field] = value;
//   }

//   completeAC(col: TableColumn, event: { query?: string }) {
//     const all = col.editorOptions || [];
//     const q = (event?.query || '').toLowerCase();
//     this.acSuggestions[col.field] = q
//       ? all.filter(o => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q))
//       : all.slice(0, 50);
//   }
//   getACSelected(row: any, col: TableColumn) {
//     const val = row?.[col.field];
//     return (col.editorOptions || []).find(o => o.value === val) || null;
//   }
//   setACSelected(row: any, col: TableColumn, selected: any) {
//     row[col.field] = selected?.value ?? null;
//   }

//   formatCellValue(rowData: T, column: TableColumn): string {
//     const value = this.getFieldValue(rowData, column.field);
//     if (value === null || value === undefined) return '-';

//     switch (column.pipe) {
//       case 'date': {
//         if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
//           const d = value instanceof Date ? value : new Date(value);
//           const fmt = column.dateFormat || 'MM/dd/yyyy';
//           return new DatePipe('en-US').transform(d, fmt) || '-';
//         }
//         return '-';
//       }
//       case 'titlecase':
//         return typeof value === 'string' ? this.toTitleCase(value) : String(value);
//       case 'uppercase':
//         return String(value).toUpperCase();
//       case 'lowercase':
//         return String(value).toLowerCase();
//       case 'currency':
//         return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
//       case 'number':
//         return new Intl.NumberFormat('en-US').format(Number(value));
//       default:
//         return String(value);
//     }
//   }

//   getFieldValue(obj: any, path: string): any {
//     return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
//   }

//   private toTitleCase(str: string): string {
//     return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
//   }

//   getCustomTemplate(field: string): TemplateRef<any> | null {
//     return this.customTemplates[field] || null;
//   }

//   private dateCache = new WeakMap<any, Map<string, Date | null>>();
//   getDateModel(row: any, field: string): Date | null {
//     if (!row) return null;
//     let map = this.dateCache.get(row);
//     if (!map) { map = new Map<string, Date | null>(); this.dateCache.set(row, map); }
//     if (map.has(field)) return map.get(field) ?? null;
//     const v = row[field];
//     const d = v == null ? null : (v instanceof Date ? v : new Date(v));
//     map.set(field, d);
//     return d;
//   }
//   setDateModel(row: any, field: string, value: Date | null) {
//     if (!row) return;
//     let map = this.dateCache.get(row);
//     if (!map) { map = new Map<string, Date | null>(); this.dateCache.set(row, map); }
//     map.set(field, value);
//     row[field] = value;
//   }

//   toPickerFormat(pipeFmt?: string): string {
//     if (!pipeFmt) return 'mm/dd/yy';
//     return pipeFmt.replace(/yyyy/g, 'yy').replace(/MM/g, 'mm').replace(/dd/g, 'dd');
//   }
// }