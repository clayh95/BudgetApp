import { Component,  Inject } from '@angular/core';
import { ITransaction } from '../core/dataTypes'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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

  tmpDate:Moment[];
  origTotal:number;
  newTotal:number;
  dummyCopy = new Array<ITransaction>();

  constructor(public ATsvc: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ITransaction[]) {
                this.tmpDate = this.data.map(x => moment(x.date, "MM/DD/YYYY"));
                // this.origTotal = +data[0].amount;
                this.origTotal = parseFloat(data.map(x => x.amount).reduce((pv, v) => +pv + +v, 0).toFixed(2));
                this.newTotal = +this.origTotal;
                history.pushState(null, null, location.href);
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
      if (this.dummyCopy.length > 0) {
        tr.xId = this.data[0].id;
        tr.xIndex = index;
      }
      tr.date = this.tmpDate[index].format('MM/DD/YYYY');
      if (tr.id == null) {
        this.ATsvc.AddOrUpdateTransaction(tr, tAction.add);
      }
      else {
        this.ATsvc.AddOrUpdateTransaction(tr, tAction.update);
      }
    });
    this.dialogRef.close();
  }

  Split() {
    if (this.data[0].xId == null) {
      this.data[0].xId = this.data[0].id;
      this.data[0].xIndex = 0;
    }
    this.tmpDate.push(this.tmpDate[0]); //set the date to the orig date
    let t = <ITransaction>{
      date:this.data[0].date, 
      description:this.data[0].description, 
      amount:"0.00", 
      category:"", 
      notes: "", 
      status: this.data[0].status,
      xId: this.data[0].id,
      xIndex: this.data.length
    }
    this.data.push(t);
  }

  UpdateTotal(idx:number) {
    if (this.data.length > 1) {
      if (idx !== null) {
        const newIdx:number = (idx + 1) % this.data.length;
        let tmp = new Array<ITransaction>();
        tmp.push(...this.data);
        tmp.splice(newIdx, 1);
        let remainingTAmount = tmp.map(t => t.amount).reduce((pv, v) => +pv + +v, 0);
        this.data[newIdx].amount = (this.origTotal - remainingTAmount).toFixed(2);
      }
      this.newTotal = parseFloat(this.data.map(tr => tr.amount).reduce((pv, v) => +pv + +v, 0).toFixed(2));
    }
  }

  deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.ATsvc.transactionCollection.doc(id).delete();
      this.dialogRef.close();
    }
  }

  getTitle() { 
    return (this.data[0].id === undefined ? 'New Transaction' : this.data[0].description);
  }

}
