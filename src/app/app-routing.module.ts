import { inject } from '@angular/core';
import { EditorDrawerService } from './section-drawer/editor-drawer.service';
import { Routes } from '@angular/router';
import { CsvImportComponent } from './csv-import/csv-import.component';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { EditCategoriesComponent } from './edit-categories/edit-categories.component';
import { ReportsComponent } from './reports/reports.component';
import { SummaryComponent } from './summary/summary.component';

export const routes: Routes = [
  { path: '', redirectTo: 'summary', pathMatch: 'full' },
  { path: 'transactions', component: TransactionTableComponent, canDeactivate: [() => inject(EditorDrawerService).requestClose()] },
  { path: 'csv', component: CsvImportComponent},
  { path: 'categories', component: EditCategoriesComponent, canDeactivate: [() => inject(EditorDrawerService).requestClose()] },
  { path: 'reports', component: ReportsComponent},
  { path: 'summary', component: SummaryComponent, canDeactivate: [(component: SummaryComponent) => component.canDeactivate()] }
];
