import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MainNavComponent } from './main-nav/main-nav.component';
import { LayoutModule } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule, MatOptionModule, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../environments/environment';
import { AngularFireModule } from 'angularfire2';
import { AngularFirestore } from 'angularfire2/firestore';
import { CsvImportComponent } from './csv-import/csv-import.component';
import { CoreModule } from './core/core.module';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BasePageComponent } from './base-page/base-page.component';
import { EditCategoriesComponent } from './edit-categories/edit-categories.component';
import { CategoryTableComponent } from './category-table/category-table.component';
import { MMYY_FORMAT } from './month-year-picker/month-year-picker.component';
import { MomentDateModule } from '../../node_modules/@angular/material-moment-adapter';
import { MonthYearPickerComponent } from './month-year-picker/month-year-picker.component';
import { CopyCategoriesComponent } from './copy-categories/copy-categories.component';
import { AddTransactionComponent } from './add-transaction/add-transaction.component';
import { ReportsComponent } from './reports/reports.component';
import { SummaryComponent } from './summary/summary.component';
import { CategoryModalComponent } from './category-modal/category-modal.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppLoginPageComponent } from './app-login-page/app-login-page.component';


@NgModule({
  declarations: [
    AppComponent,
    MainNavComponent,
    CsvImportComponent,
    TransactionTableComponent,
    UserLoginComponent,
    BasePageComponent,
    EditCategoriesComponent,
    CategoryTableComponent,
    MonthYearPickerComponent,
    CopyCategoriesComponent,
    AddTransactionComponent,
    ReportsComponent,
    SummaryComponent,
    CategoryModalComponent,
    AppLoginPageComponent
  ],
  entryComponents: [
    CopyCategoriesComponent,
    AddTransactionComponent,
    CategoryModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    LayoutModule,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    AngularFireModule.initializeApp(environment.firebase),
    CoreModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatMenuModule,
    MatOptionModule,
    MatSelectModule,
    MomentDateModule,
    MatChipsModule,
    MatDialogModule,
    MatCardModule,
    MatExpansionModule,
    MatGridListModule,
    MatProgressBarModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
  ],
  providers: [
    AngularFirestore,
    {provide: MAT_DIALOG_DATA, useValue: {}}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
