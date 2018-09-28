import { Component, OnInit, Inject } from '@angular/core';
import { ITransaction } from '../core/dataTypes'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { DbService, tAction } from '../core/db.service';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment

export const MMDDYYYY_FORMAT = {
  parse: {
    dateInput: 'MM/DD/YYYY',
  },
  display: {
    dateInput: 'MM/DD/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export interface addEditTrans {
  type: number;
  transaction: ITransaction
}

@Component({
  selector: 'app-add-transaction',
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
  providers: [{provide: MAT_DATE_FORMATS, useValue: MMDDYYYY_FORMAT}]
})
export class AddTransactionComponent {

  tmpDate:Moment

  constructor(public ATsvc: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ITransaction) {

                if (this.data.date !== undefined) {
                  this.tmpDate = moment(this.data.date)
                }
              }

  Add() {
    this.data.date = this.tmpDate.format('MM/DD/YYYY')
    this.ATsvc.AddOrUpdateTransaction(this.data, tAction.add)
    this.dialogRef.close();
  }

  Update() {
    this.data.date = this.tmpDate.format('MM/DD/YYYY')
    this.ATsvc.AddOrUpdateTransaction(this.data, tAction.update)
    this.dialogRef.close();
  }

  // Commit(doc:firebase.firestore.DocumentReference) {
  //   this.data.date = this.tmpDate.format('MM/DD/YYYY')
  //   doc.set({date: this.data.date, description: this.data.description, amount: this.data.amount, notes:this.data.notes, category: this.data.category}) //Doing this so as not to add the ID property
  //   this.dialogRef.close();
  // }

}
