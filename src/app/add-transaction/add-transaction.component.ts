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

  tmpDate:Moment[]

  constructor(public ATsvc: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ITransaction[]) {

                //IInitial date should always be the first one
                if (this.data[0].date !== undefined) {
                  this.tmpDate = [moment(this.data[0].date)];
                }
              }

  Add() {
    this.data.map((tr, index) => {
      tr.date = this.tmpDate[index].format('MM/DD/YYYY')
      this.ATsvc.AddOrUpdateTransaction(tr, tAction.add)
    })
    this.dialogRef.close();
  }

  Update() {
    this.data.map((tr, index) => {
      tr.date = this.tmpDate[index].format('MM/DD/YYYY')
      this.ATsvc.AddOrUpdateTransaction(tr, tAction.update)
    })
    this.dialogRef.close();
  }

  Split() {
    let t = <ITransaction>{date:"", description:"", amount:"", category:"", notes: ""}
    this.data.push(t);
    //data should be a list of iTransaction. Each split adds an object. On save, you update the original and add each new one
    //Show the total on split. Don't show a Submit Split button until the totals match
  }


  // Commit(doc:firebase.firestore.DocumentReference) {
  //   this.data.date = this.tmpDate.format('MM/DD/YYYY')
  //   doc.set({date: this.data.date, description: this.data.description, amount: this.data.amount, notes:this.data.notes, category: this.data.category}) //Doing this so as not to add the ID property
  //   this.dialogRef.close();
  // }

}
