import { Component, OnInit, Inject } from '@angular/core';
import { ITransaction } from '../core/dataTypes'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { DbService, tAction } from '../core/db.service';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import {default as _rollupMoment, Moment} from 'moment';
import { database } from 'firebase';
import { AngularFireAuth } from 'angularfire2/auth';
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

  tmpDate:Moment[];
  origTotal:number;
  newTotal:number;
  dummyCopy = new Array<ITransaction>();

  constructor(public ATsvc: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ITransaction[]) {

                //IInitial date should always be the first one
                if (this.data[0].date !== undefined) {
                  this.tmpDate = [moment(this.data[0].date)];
                }
                this.origTotal = +data[0].amount;
                this.newTotal = +data[0].amount;
              }

  Add() {
    this.data.map((tr, index) => {
      tr.date = this.tmpDate[index].format('MM/DD/YYYY')
      this.ATsvc.AddOrUpdateTransaction(tr, tAction.add)
    })
    this.dialogRef.close();
  }

  //The first transaction should be an update; any additional ones are from SPLIT so we're adding them
  Update() {
    this.data.map((tr, index) => {
      tr.date = this.tmpDate[index].format('MM/DD/YYYY')
      if (index == 0) {
        this.ATsvc.AddOrUpdateTransaction(tr, tAction.update);
      }
      else {
        this.ATsvc.AddOrUpdateTransaction(tr, tAction.add);
      }
    })
    this.dialogRef.close();
  }

  Split() {
    if (this.data.length == 1) {
      this.data[0].notes += ' [1 of 2]'
      this.dummyCopy.push({...this.data[0]});
    }
    this.tmpDate.push(this.tmpDate[0]); //set the date to the orig date
    let t = <ITransaction>{date:this.data[0].date, description:this.data[0].description, amount:"0", category:"", notes: `[${this.data.length} of ${this.data.length}]`}
    this.data.push(t);
    this.data.map((tr, index) => {tr.notes = tr.notes.replace(/\[[0-9] of [0-9]\]$/gi, `[${index+1} of ${this.data.length}]`)});
    this.UpdateTotal();
  }

  UpdateTotal() {
    if (this.data.length > 1) {
      this.newTotal = this.data.map(tr => tr.amount).reduce((pv, v) => +pv + +v, 0);
    }
  }


  // Commit(doc:firebase.firestore.DocumentReference) {
  //   this.data.date = this.tmpDate.format('MM/DD/YYYY')
  //   doc.set({date: this.data.date, description: this.data.description, amount: this.data.amount, notes:this.data.notes, category: this.data.category}) //Doing this so as not to add the ID property
  //   this.dialogRef.close();
  // }

}
