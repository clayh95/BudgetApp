import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment
import { collectionType, ITransaction } from '../core/dataTypes';
import { DbService } from '../core/db.service';

@Component({
  selector: 'app-carry-balances-modal',
  templateUrl: './carry-balances-modal.component.html',
  styleUrls: ['./carry-balances-modal.component.scss']
})
export class CarryBalancesModalComponent {

  newMonthDate:Moment;

  constructor(public service: DbService, 
              public dialogRef: MatDialogRef<CarryBalancesModalComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ITransaction[]) {

                this.newMonthDate = moment(this.data[0].date);
  
  }

  carryAmounts() {
    const mPK = moment(this.newMonthDate, "MM/DD/YYYY").format('MMYYYY');
    this.data.map(t => {
      this.service.addDocument(t, collectionType.transactions, mPK);
    });
  }

}

