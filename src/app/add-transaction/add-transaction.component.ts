import { Component, OnInit } from '@angular/core';
import { ITransaction } from '../core/dataTypes'
import { MatDialogRef } from '@angular/material';
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

@Component({
  selector: 'app-add-transaction',
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
  providers: [{provide: MAT_DATE_FORMATS, useValue: MMDDYYYY_FORMAT}]
})
export class AddTransactionComponent implements OnInit {

  t:ITransaction;
  tmpDate:Moment

  constructor(private service: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>) { }

  ngOnInit() {
    this.t = <ITransaction>{date:"", description:"", amount:"", category:"", notes: ""}
  }

  Add() {
    let newTransactionRef = this.service.transactionCollection.ref.doc();
    this.t.date = this.tmpDate.format('MM/DD/YYYY')
    newTransactionRef.set(this.t)
    this.dialogRef.close();
  }

}
