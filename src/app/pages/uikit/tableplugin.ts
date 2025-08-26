import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  TemplateRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Table, TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

// Interfaces for configuration
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
}

@Component({
  selector: 'app-generic-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ButtonModule
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
        [paginator]="true"
        [rows]="pageSize"
        [rowsPerPageOptions]="config.pageSizeOptions || [5, 10, 15, 25, 50, 100]"
        [totalRecords]="totalRecords"
        [rowHover]="config.rowHover !== false"
        [showGridlines]="config.showGridlines !== false"
        (onLazyLoad)="onLazyLoad($event)"
        [responsiveLayout]="config.responsive !== false ? 'scroll' : 'stack'"
        [scrollable]="true"
        [scrollHeight]="config.scrollHeight || '600px'"
      >
        <ng-template #caption>
          <div class="flex justify-between items-center flex-col sm:flex-row">
            <button
              *ngIf="config.showClearButton !== false"
              pButton
              label="Clear"
              class="p-button-outlined mb-2"
              icon="pi pi-filter-slash"
              (click)="clear(dt)"
            ></button>

            <p-iconfield *ngIf="config.showGlobalSearch !== false" iconPosition="left" class="ml-auto">
              <p-inputicon>
                <i class="pi pi-search"></i>
              </p-inputicon>
              <input #globalFilter pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Global Search" />
            </p-iconfield>
          </div>
        </ng-template>

        <ng-template pTemplate="header">
          <tr>
            <th *ngFor="let col of columns" [style.min-width]="col.width || '12rem'">
              <div class="flex justify-between items-center">
                {{ col.header }}
                <p-columnFilter
                  *ngIf="col.filterable !== false"
                  type="text"
                  [field]="col.field"
                  display="menu"
                  [placeholder]="'Search by ' + col.header.toLowerCase()"
                  [showOperator]="false"
                  [showAddButton]="false"
                ></p-columnFilter>
              </div>
            </th>
            <th *ngIf="hasActionsSlot" style="min-width: 8rem">Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-rowData let-rowIndex="rowIndex">
          <tr>
            <td *ngFor="let col of columns">
              <ng-container *ngIf="col.customTemplate && getCustomTemplate(col.field); else defaultCell">
                <ng-container
                  *ngTemplateOutlet="
                    getCustomTemplate(col.field);
                    context: {
                      $implicit: rowData,
                      rowIndex: rowIndex,
                      field: col.field,
                      value: getFieldValue(rowData, col.field)
                    }
                  "
                ></ng-container>
              </ng-container>

              <ng-template #defaultCell>
                {{ formatCellValue(rowData, col) }}
              </ng-template>
            </td>

            <td *ngIf="hasActionsSlot">
              <ng-container
                *ngTemplateOutlet="
                  actionsTemplate;
                  context: { $implicit: rowData, rowIndex: rowIndex }
                "
              ></ng-container>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td [colSpan]="getTotalColumns()" class="text-center py-8">
              <div class="text-gray-500">
                <i class="pi pi-search text-3xl mb-2"></i>
                <div>{{ config.emptyMessage || 'No records found matching your criteria.' }}</div>
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="loadingbody">
          <tr>
            <td [colSpan]="getTotalColumns()" class="text-center py-8">
              <div class="text-gray-500">
                <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
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
    :host ::ng-deep .p-calendar { width: 100%; }
    :host ::ng-deep .p-dropdown { width: 100%; }
  `]
})
export class GenericTableComponent<T = any> implements OnChanges {
  @ViewChild('dt') dt!: Table;
  @ViewChild('globalFilter') globalFilter!: ElementRef;

  // required
  @Input({ required: true }) columns: TableColumn[] = [];
  @Input({ required: true }) dataKey: string = 'id';

  // optional
  @Input() data: T[] = [];
  @Input() totalRecords = 0;
  @Input() loading = false;
  @Input() isLazy = true;
  @Input() config: TableConfig = {};

  // templates passed as inputs
  @Input() actionsTemplate?: TemplateRef<any>;
  @Input() customTemplates: { [fieldName: string]: TemplateRef<any> } = {};

  @Output() lazyLoad = new EventEmitter<any>();

  pageSize = 15; // will sync from config

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.pageSize = this.config?.defaultPageSize ?? 15;
    }
  }

  get hasActionsSlot(): boolean {
    return !!this.actionsTemplate;
  }

  getTotalColumns(): number {
    return this.columns.length + (this.hasActionsSlot ? 1 : 0);
  }

  onLazyLoad(event: any): void {
    this.lazyLoad.emit(event);
  }

  onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  clear(table: Table): void {
    table.clear();
    if (this.globalFilter?.nativeElement) {
      this.globalFilter.nativeElement.value = '';
    }
  }

  formatCellValue(rowData: T, column: TableColumn): string {
    const value = this.getFieldValue(rowData, column.field);
    if (value === null || value === undefined) return '-';

    switch (column.pipe) {
      case 'date': {
        if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
          const date = value instanceof Date ? value : new Date(value);
          const fmt = column.dateFormat || 'MM/dd/yyyy';
          return new DatePipe('en-US').transform(date, fmt) || '-';
        }
        return '-';
      }
      case 'titlecase':
        return typeof value === 'string' ? this.toTitleCase(value) : String(value);
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value));
      default:
        return String(value);
    }
  }

  getFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
  }

  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  getCustomTemplate(field: string): TemplateRef<any> | null {
    return this.customTemplates[field] || null;
  }
}
