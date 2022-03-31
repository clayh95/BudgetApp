import { Component,  Inject } from '@angular/core';
import { collectionType, ITransaction } from '../core/dataTypes'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { DbService, tAction } from '../core/db.service';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment
import { deleteEnterLeave } from '../animations/template.animations';

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

const tmpId:string = 'tmp_';

export interface addEditTrans {
  type: number;
  transaction: ITransaction
}

@Component({
  selector: 'app-add-transaction',
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
  providers: [{provide: MAT_DATE_FORMATS, useValue: MMDDYYYY_FORMAT}],
  animations: [deleteEnterLeave]
})
export class AddTransactionComponent {

  tmpDate:Moment[];
  origTotal:number;
  newTotal:number;
  dummyCopy = new Array<ITransaction>();
  pendingDeletes: ITransaction[] = new Array<ITransaction>();

  constructor(public ATsvc: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>,
              @Inject(MAT_DIALOG_DATA) public data: ITransaction[]) {
                this.tmpDate = this.data.map(x => moment(x.date, "MM/DD/YYYY"));
                // this.origTotal = +data[0].amount;
                this.origTotal = parseFloat(data.map(x => x.amount).reduce((pv, v) => +pv + +v, 0).toFixed(2));
                this.newTotal = +this.origTotal;
                history.pushState(null, null, location.href);
              }

  add() {
    this.data.map((tr, index) => {
      tr.date = this.tmpDate[index].format('MM/DD/YYYY')
      if (this.movingMonthsCheck(this.tmpDate[index])) {
        if (this.movingMonthsConfirm(this.tmpDate[index])) {
          this.ATsvc.addDocument(tr, collectionType.transactions, this.ATsvc.getMonthPKFromMoment(this.tmpDate[index]));
        }
      }
      else {
        this.ATsvc.addDocument(tr, collectionType.transactions);
      }
    })
    this.dialogRef.close();
  }

  update() {
    this.data.map((tr, index) => {
      tr.date = this.tmpDate[index].format('MM/DD/YYYY');
      let monthPK:string = this.ATsvc.getMonthPKFromMoment(this.tmpDate[index]);

      // not sure this logic is totally sound
      if (this.movingMonthsCheck(this.tmpDate[index])) {
        if (this.movingMonthsConfirm(this.tmpDate[index])) {
          this.ATsvc.deleteDocument(tr, collectionType.transactions);
          this.ATsvc.addDocument(tr, collectionType.transactions, monthPK);
        }
      }
      else if (tr.id.startsWith(tmpId)) {
        this.ATsvc.addDocument(tr, collectionType.transactions);
      }
      else {
        this.ATsvc.updateDocument(tr.id, collectionType.transactions, tr);
      }
    });
    this.pendingDeletes.map((tr, index) => {
      if (!tr.id.startsWith(tmpId)) {
        this.ATsvc.deleteDocument(tr, collectionType.transactions);
      }
    });
    this.dialogRef.close();
  }

  movingMonthsCheck(checkDate:_rollupMoment.Moment) {
    return checkDate.format('MM') != this.ATsvc.getMonthYearValue().substring(0,2);
  }

  movingMonthsConfirm(checkDate:_rollupMoment.Moment) {
    if (confirm(`Are you sure you want to move this transaction from 
                  to ${moment(this.ATsvc.getMonthYearValue().substring(0,2), 'M').format('MMMM')}?
                  ${checkDate.format('MMMM')}`)) {
      return true;
    }
    return false;
  }

  split() {
    this.setXID();
    this.tmpDate.push(this.tmpDate[0]); //set the date to the orig date
    let t = <ITransaction>{
      id: `${tmpId}${this.data.length}`,
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

  updateTotal(idx:number) {
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

  deleteTransaction(t:ITransaction, idx:number) {
    this.data.splice(idx, 1);
    this.pendingDeletes.push(t);
    if (this.data.length == 0) return;
    this.data[0].amount = (+this.data[0].amount + +t.amount).toFixed(2);
    if (this.data.length == 1) {
      this.data[0].xId = null;
      this.data[0].xIndex = null;
    }
    else {
      this.reassignIndexes();
    }
  }

  pendingDeletesIncludesId(tr:ITransaction) {
    return this.pendingDeletes.map(t => t.id).includes(tr.id);
  }

  reassignIndexes() {
    this.data.map((t, index) => {
        t.xIndex = index;
    });
  }

  undoDelete(t:ITransaction, i:number) {

    this.pendingDeletes.splice(i, 1);
    t.xIndex = this.data.length;
    this.data.push(t);
    this.updateTotal(t.xIndex);
    this.setXID();
    this.reassignIndexes();

    // // pendingDeletes has the original amount 
    // let dataTr = this.data.find(tr => tr.id == t.id);
    // let dataIdx = this.data.indexOf(dataTr);

    // let deleteTr = this.pendingDeletes.find(tr => tr.id == t.id);
    // let deleteIdx = this.pendingDeletes.indexOf(deleteTr);

    // this.data[dataIdx] = Object.assign({}, this.pendingDeletes[deleteIdx]);
    
    // this.pendingDeletes.splice(deleteIdx, 1);
    // this.updateTotal(dataIdx);
    // this.setXID();

    // if (this.data.length - this.pendingDeletes.length > 1) {
    //   this.reassignIndexes();
    // }
  }

  private setXID() {
    if (this.data[0].xId == null) {
      this.data[0].xId = this.data[0].id;
      this.data[0].xIndex = 0;
    }
  }

  dataHasTransactions() {
    return this.data.length > 0;
  }

  isAdd() {
    return this.dataHasTransactions() && this.data[0].id === undefined;
  }

  isSplit() {
    return this.dataHasTransactions() && this.data[0].xId !== undefined;
  }

  getTitle() { 
    if (!this.dataHasTransactions()) {
      return '';
    }
    else {
      return (this.isAdd() ? 'New Transaction' : this.data[0].description);
    }
  }

}
