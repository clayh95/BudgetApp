import { Component, OnInit, Inject } from '@angular/core';
import { ITransaction } from '../core/dataTypes'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { DbService } from '../core/db.service';
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

  constructor(private service: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ITransaction) {

                if (this.data.date !== undefined) {
                  this.tmpDate = moment(this.data.date)
                }
              }

  Add() {
    let newTransactionRef = this.service.transactionCollection.ref.doc();
    this.Commit(newTransactionRef)
  }

  Update() {
    let transactionRef = this.service.transactionCollection.doc(this.data.id).ref
    this.Commit(transactionRef)
  }

  Commit(doc:firebase.firestore.DocumentReference) {
    this.data.date = this.tmpDate.format('MM/DD/YYYY')
    doc.set(this.data)
    this.dialogRef.close();
  }

}
