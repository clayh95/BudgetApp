import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MainNavComponent } from './main-nav/main-nav.component';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule, MatButtonModule, MatSidenavModule, MatIconModule, MatListModule, 
         MatTableModule, MatPaginatorModule, MatSortModule, MatDatepickerModule, MatFormFieldModule, MatNativeDateModule, MatInputModule  } from '@angular/material';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../environments/environment';
import { AngularFireModule } from 'angularfire2';
import { AngularFirestore } from 'angularfire2/firestore';
import { CsvImportComponent } from './csv-import/csv-import.component';
import { CoreModule } from './core/core.module';
import { TransactionTableComponent } from './transaction-table/transaction-table.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { FormsModule } from '../../node_modules/@angular/forms';
import { BasePageComponent } from './base-page/base-page.component';
import { EditCategoriesComponent } from './edit-categories/edit-categories.component';
import { CategoryTableComponent } from './category-table/category-table.component';

@NgModule({
  declarations: [
    AppComponent,
    MainNavComponent,
    CsvImportComponent,
    TransactionTableComponent,
    UserLoginComponent,
    BasePageComponent,
    EditCategoriesComponent,
    CategoryTableComponent
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
    FormsModule
  ],
  providers: [AngularFirestore],
  bootstrap: [AppComponent]
})
export class AppModule { }
