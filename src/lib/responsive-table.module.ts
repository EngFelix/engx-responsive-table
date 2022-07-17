import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsiveTableDirective } from './responsive-table.directive';
import { ResponsiveTableTdDirective } from './responsive-table-td.directive';
import { ResponsiveTableThDirective } from './responsive-table-th.directive';
import { TransposedTableRowComponent } from './transposed-table-row.component';
import { ResponsiveTableRowComponent } from './responsive-table-row.component';
import { ResponsiveTableTdHostComponent } from './responsive-table-td-host.component';


@NgModule({
  declarations: [
    ResponsiveTableDirective,
    ResponsiveTableTdDirective,
    ResponsiveTableThDirective,
    TransposedTableRowComponent,
    ResponsiveTableRowComponent,
    ResponsiveTableTdHostComponent,
  ],
  exports: [
    ResponsiveTableDirective,
    ResponsiveTableRowComponent,
    ResponsiveTableTdDirective,
    ResponsiveTableThDirective,
  ],
  imports: [
    CommonModule
  ]
})
export class ResponsiveTableModule { }
