import { Component, Input, Output, EventEmitter, OnDestroy, ViewChild, ElementRef, TemplateRef, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { Subject } from 'rxjs';
import { DatePipe, CommonModule } from '@angular/common';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ReactiveFormsModule } from '@angular/forms';

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
    imports: [CommonModule, TableModule, IconFieldModule, InputIconModule, InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule, ReactiveFormsModule],
    template: `
        <div class="card">
            <div class="font-semibold text-xl mb-4" *ngIf="config?.title">{{ config.title }}</div>

            <!-- Data Table -->
            <p-table
                #dt
                [value]="data"
                [dataKey]="dataKey"
                [loading]="loading"
                [lazy]="isLazy"
                [paginator]="true"
                [rows]="pageSize"
                [rowsPerPageOptions]="config.pageSizeOptions || [1, 2, 5, 10, 25, 50, 100]"
                [totalRecords]="totalRecords"
                [rowHover]="config.rowHover !== false"
                [showGridlines]="config.showGridlines !== false"
                (onLazyLoad)="onLazyLoad($event)"
                [responsiveLayout]="config.responsive !== false ? 'scroll' : 'stack'"
                [scrollable]="true"
                [scrollHeight]="config.scrollHeight || '600px'"
            >
                <!-- Caption with search and clear -->
                <ng-template #caption>
                    <div class="flex justify-between items-center flex-col sm:flex-row">
                        <button *ngIf="config.showClearButton !== false" pButton label="Clear" class="p-button-outlined mb-2" icon="pi pi-filter-slash" (click)="clear(dt)"></button>
                        <p-iconfield *ngIf="config.showGlobalSearch !== false" iconPosition="left" class="ml-auto">
                            <p-inputicon>
                                <i class="pi pi-search"></i>
                            </p-inputicon>
                            <input #globalFilter pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Global Search" />
                        </p-iconfield>
                    </div>
                </ng-template>

                <!-- Dynamic Header -->
                <ng-template pTemplate="header">
                    <tr>
                        <th *ngFor="let col of columns" [style.min-width]="col.width || '12rem'">
                            <div class="flex justify-between items-center">
                                {{ col.header }}
                                <p-columnFilter *ngIf="col.filterable !== false" type="text" [field]="col.field" display="menu" [placeholder]="'Search by ' + col.header.toLowerCase()" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
                            </div>
                        </th>
                        <!-- Actions column if actions slot is provided -->
                        <th *ngIf="hasActionsSlot" style="min-width: 8rem">Actions</th>
                    </tr>
                </ng-template>

                <!-- Dynamic Body -->
                <ng-template pTemplate="body" let-rowData let-rowIndex="rowIndex">
                    <tr>
                        <td *ngFor="let col of columns">
                            <!-- Custom template slot -->
                            <ng-container *ngIf="col.customTemplate && getCustomTemplate(col.field)">
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

                            <!-- Default cell rendering -->
                            <ng-container *ngIf="!col.customTemplate || !getCustomTemplate(col.field)">
                                {{ formatCellValue(rowData, col) }}
                            </ng-container>
                        </td>

                        <!-- Actions column -->
                        <td *ngIf="hasActionsSlot">
                            <ng-container
                                *ngTemplateOutlet="
                                    actionsTemplate;
                                    context: {
                                        $implicit: rowData,
                                        rowIndex: rowIndex
                                    }
                                "
                            ></ng-container>
                        </td>
                    </tr>
                </ng-template>

                <!-- Empty message -->
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

                <!-- Loading message -->
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

            <!-- Results Summary -->
            <div class="mt-4 text-sm text-gray-600" *ngIf="!loading && config.showResultsSummary !== false">Showing {{ data?.length || 0 }} of {{ totalRecords | number }} records</div>
        </div>

        <!-- Content projection for custom templates -->
        <ng-content></ng-content>
    `,
    styles: `
        .p-datatable-frozen-tbody {
            font-weight: bold;
        }

        .p-datatable-scrollable .p-frozen-column {
            font-weight: bold;
        }

        .field label {
            color: #6b7280;
        }

        :host ::ng-deep .p-calendar {
            width: 100%;
        }

        :host ::ng-deep .p-dropdown {
            width: 100%;
        }

        :host ::ng-deep .flex-1 .p-calendar {
            width: 100%;
        }
    `
})
export class GenericTableComponent<T = any> implements OnDestroy, AfterContentInit {
    @ViewChild('dt') dt!: Table;
    @ViewChild('globalFilter') globalFilter!: ElementRef;

    // Required inputs
    @Input({ required: true }) columns: TableColumn[] = [];
    @Input({ required: true }) dataKey: string = 'id';

    // Optional inputs with defaults
    @Input() data: T[] = [];
    @Input() totalRecords: number = 0;
    @Input() loading: boolean = false;
    @Input() isLazy: boolean = true;
    @Input() config: TableConfig = {};

    // Template inputs
    @Input() actionsTemplate?: TemplateRef<any>;
    @Input() customTemplates: { [fieldName: string]: TemplateRef<any> } = {};

    // Outputs
    @Output() lazyLoad = new EventEmitter<any>();
    @Output() rowSelect = new EventEmitter<T>();
    @Output() rowUnselect = new EventEmitter<T>();

    // Internal state
    pageSize: number = 3;
    private destroy$ = new Subject<void>();

    @ContentChildren(TemplateRef) templates!: QueryList<TemplateRef<any>>;

    constructor() {}

    ngAfterContentInit() {
        // Set default page size from config
        this.pageSize = this.config.defaultPageSize || 3;
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

        if (value === null || value === undefined) {
            return '-';
        }

        // Apply pipe formatting
        switch (column.pipe) {
            case 'date':
                if (value instanceof Date || typeof value === 'string') {
                    const date = value instanceof Date ? value : new Date(value);
                    const format = column.dateFormat || 'MM/dd/yyyy';
                    return new DatePipe('en-US').transform(date, format) || '-';
                }
                return '-';

            case 'titlecase':
                return typeof value === 'string' ? this.toTitleCase(value) : String(value);

            case 'uppercase':
                return String(value).toUpperCase();

            case 'lowercase':
                return String(value).toLowerCase();

            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(Number(value));

            case 'number':
                return new Intl.NumberFormat('en-US').format(Number(value));

            default:
                return String(value);
        }
    }

    getFieldValue(obj: any, path: string): any {
        return path.split('.').reduce((o, p) => o?.[p], obj);
    }

    private toTitleCase(str: string): string {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    getCustomTemplate(field: string): TemplateRef<any> | null {
        return this.customTemplates[field] || null;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
