import { Routes } from '@angular/router';
import { CsvImportComponent } from './csv-import/csv-import.component';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { EditCategoriesComponent } from './edit-categories/edit-categories.component';
import { ReportsComponent } from './reports/reports.component';
import { SummaryComponent } from './summary/summary.component';

export const routes: Routes = [
  { path: '', component: TransactionTableComponent },
  { path: 'transactions', component: TransactionTableComponent },
  { path: 'csv', component: CsvImportComponent},
  { path: 'categories', component: EditCategoriesComponent},
  { path: 'reports', component: ReportsComponent},
  { path: 'summary', component: SummaryComponent}
];
