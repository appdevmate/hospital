import { Table } from 'primeng/table';

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
    frozen?: boolean;
    editorType?: 'text' | 'number' | 'date' | 'textarea' | 'autocomplete' | 'time';
    editorOptions?: ReadonlyArray<{ label: string; value: any }>;
    filterType?: 'text' | 'dropdown';
    filterOptions?: Array<{ label: string; value: any }>;
    filterMatchMode?: 'contains' | 'equals' | 'startsWith' | 'endsWith';
    showTooltip?: boolean;
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
    showColumnPicker?: boolean;
    selectable?: boolean;
    selectionMode?: 'single' | 'multiple';
    showSelectAll?: boolean;
    editType?: 'row' | 'cell' | 'none';
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

export interface ExportOptions {
    selectionOnly?: boolean;
    filename?: string;
    separator?: string;
    includeHeaders?: boolean;
    applyPipes?: boolean;
    columns?: string[];
}

export interface TableApi<T = any> {
    clear(): void;
    exportCSV(opts?: ExportOptions): void;
    table(): Table;
    getSelected(): T[];
    setVisibleColumns(fields: string[]): void;
    beginRowEdit(row: T, rowIndex?: number): void;
    saveRowEdit(row: T, rowIndex?: number): void;
    cancelRowEdit(row: T, rowIndex?: number): void;
}
