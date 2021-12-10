import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CsvImportComponent } from './csv-import/csv-import.component';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { EditCategoriesComponent } from './edit-categories/edit-categories.component';
import { ReportsComponent } from './reports/reports.component';
import { SummaryComponent } from './summary/summary.component';

const routes: Routes = [
  { path: '', component: TransactionTableComponent },
  { path: 'csv', component: CsvImportComponent},
  { path: 'categories', component: EditCategoriesComponent},
  { path: 'reports', component: ReportsComponent},
  { path: 'summary', component: SummaryComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
