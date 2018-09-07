import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CsvImportComponent } from './csv-import/csv-import.component';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { EditCategoriesComponent } from './edit-categories/edit-categories.component';
import { ReportsComponent } from './reports/reports.component';

const routes: Routes = [
  { path: '', component: TransactionTableComponent }, //Full list of transactions
  { path: 'csv', component: CsvImportComponent},
  { path: 'categories', component: EditCategoriesComponent},
  { path: 'reports', component: ReportsComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
