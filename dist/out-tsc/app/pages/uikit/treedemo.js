import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { TreeModule } from 'primeng/tree';
import { FormsModule } from '@angular/forms';
import { TreeTableModule } from 'primeng/treetable';
import { CommonModule } from '@angular/common';
import { NodeService } from '@/pages/service/node.service';
let TreeDemo = class TreeDemo {
    treeValue = [];
    treeTableValue = [];
    selectedTreeValue = [];
    selectedTreeTableValue = {};
    cols = [];
    nodeService = inject(NodeService);
    ngOnInit() {
        this.nodeService.getFiles().then((files) => (this.treeValue = files));
        this.nodeService.getTreeTableNodes().then((files) => (this.treeTableValue = files));
        this.cols = [
            { field: 'name', header: 'Name' },
            { field: 'size', header: 'Size' },
            { field: 'type', header: 'Type' }
        ];
    }
};
TreeDemo = __decorate([
    Component({
        selector: 'app-tree-demo',
        standalone: true,
        imports: [CommonModule, FormsModule, TreeModule, TreeTableModule],
        template: `
        <div class="card">
            <div class="font-semibold text-xl">Tree</div>
            <p-tree [value]="treeValue" selectionMode="checkbox" [(selection)]="selectedTreeValue"></p-tree>
        </div>

        <div class="card">
            <div class="font-semibold text-xl mb-4">TreeTable</div>
            <p-treetable [value]="treeTableValue" [columns]="cols" selectionMode="checkbox" [(selectionKeys)]="selectedTreeTableValue" dataKey="key" [scrollable]="true" [tableStyle]="{ 'min-width': '50rem' }">
                <ng-template #header let-columns>
                    <tr>
                        <th *ngFor="let col of columns">
                            {{ col.header }}
                        </th>
                    </tr>
                </ng-template>
                <ng-template #body let-rowNode let-rowData="rowData" let-columns="columns">
                    <tr [ttRow]="rowNode" [ttSelectableRow]="rowNode">
                        <td *ngFor="let col of columns; let i = index">
                            <span class="flex items-center gap-2">
                                <p-treeTableToggler [rowNode]="rowNode" *ngIf="i === 0" />
                                <p-treeTableCheckbox [value]="rowNode" *ngIf="i === 0" />
                                {{ rowData[col.field] }}
                            </span>
                        </td>
                    </tr>
                </ng-template>
            </p-treetable>
        </div>
    `,
        providers: [NodeService]
    })
], TreeDemo);
export { TreeDemo };
