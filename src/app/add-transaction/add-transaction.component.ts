import { Component, inject, AfterViewInit } from '@angular/core';
import { collectionType, ConfirmModalButtons, ConfirmModalConfig, ITransaction } from '../core/dataTypes'
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DbService, tAction } from '../core/db.service';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment
import { deleteEnterLeave } from '../animations/template.animations';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { parseMoney } from '../core/utilities';
import { SharedModule } from '../shared/shared.module';

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
  standalone: true,
  imports: [SharedModule],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
  providers: [{provide: MAT_DATE_FORMATS, useValue: MMDDYYYY_FORMAT}],
  animations: [deleteEnterLeave]
})
export class AddTransactionComponent implements AfterViewInit {

  tmpDate:Moment[];
  origTotal:number;
  newTotal:number;
  dummyCopy = new Array<ITransaction>();
  pendingDeletes: ITransaction[] = new Array<ITransaction>();
  data = inject<ITransaction[]>(MAT_DIALOG_DATA);
  disableDeleteAnimations = true;
  amountDisplay: string[] = [];


  constructor(public ATsvc: DbService, 
              public dialogRef: MatDialogRef<AddTransactionComponent>,
              public dialog: MatDialog) {
                this.tmpDate = this.data.map(x => moment(x.date, "MM/DD/YYYY"));
                // this.origTotal = +data[0].amount;
                this.origTotal = parseFloat(this.data.map(x => x.amount).reduce((pv, v) => +pv + +v, 0).toFixed(2));
                this.newTotal = +this.origTotal;
                this.refreshAmountDisplay();
                history.pushState(null, null, location.href);
              }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.disableDeleteAnimations = false;
    });
  }

  add() {
    if (!this.normalizeAndValidateAmounts()) { return; }
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
    });
    this.dialogRef.close();
  }

  checkDeletesThenUpdate() {
    if (!this.normalizeAndValidateAmounts()) { return; }
    if (this.pendingDeletes.length > 0) {
      let list = this.pendingDeletes.map(t => `${t.description} - ${t.amount}`).join('\n');
      
      const elem = document.getElementById("updateButton");
      const rect = elem.getBoundingClientRect();
      const x:number = rect.right;
      const y:number = rect.top;
      let controlConfig: ConfirmModalConfig = {
        title: "Delete Transactions?",
        matIconName: "chevron_left",
        message: `Delete transaction(s)?`, 
        buttons:[ConfirmModalButtons.yes, ConfirmModalButtons.no]
      };
      let dialogConfig: MatDialogConfig = {
        position: {
          left: `${x.toString()}px`,
          top: `${y.toString()}px`,
        },
        data: controlConfig,
        autoFocus: false,
        disableClose: true
      }
      let dialogRef = this.dialog.open(ConfirmModalComponent, dialogConfig);
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.update();
        }
      });
    }
    else {
      this.update();
    }
  }

  update() {
    let bClose:boolean = true;

    this.data.map((tr, index) => {
      tr.date = this.tmpDate[index].format('MM/DD/YYYY');
      let monthPK:string = this.ATsvc.getMonthPKFromMoment(this.tmpDate[index]);

      if (this.movingMonthsCheck(this.tmpDate[index])) {
        bClose = false;
        let monthConfirmDialogRef = this.movingMonthsConfirm(this.tmpDate[index]);
        monthConfirmDialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.ATsvc.deleteDocument(tr, collectionType.transactions);
            this.ATsvc.addDocument(tr, collectionType.transactions, monthPK);
            this.dialogRef.close();
          }
        });
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
    if (bClose) this.dialogRef.close();
  }

  movingMonthsCheck(checkDate:_rollupMoment.Moment) {
    return checkDate.format('MM') != this.ATsvc.getMonthYearValue().substring(0,2);
  }

  movingMonthsConfirm(checkDate:_rollupMoment.Moment) {
    const elem = document.getElementById("updateButton");
    const rect = elem.getBoundingClientRect();
    const x:number = rect.right;
    const y:number = rect.top;
    let controlConfig: ConfirmModalConfig = {
      title: "Delete Transaction?",
      matIconName: "chevron_left",
      message: `Move this transaction from 
                ${moment(this.ATsvc.getMonthYearValue().substring(0,2), 'M').format('MMMM')}
                to ${checkDate.format('MMMM')}?`, 
      buttons:[ConfirmModalButtons.yes, ConfirmModalButtons.no]
    };
    let dialogConfig: MatDialogConfig = {
      maxWidth: '55%',
      position: {
        left: `${x.toString()}px`,
        top: `${y.toString()}px`,
      },
      data: controlConfig,
      autoFocus: false,
      disableClose: true
    }
    let dialogRef = this.dialog.open(ConfirmModalComponent, dialogConfig);
    return dialogRef;
  }

  split() {
    this.setXID();
    this.tmpDate.push(this.tmpDate[0]); //set the date to the orig date
    let t = <ITransaction>{
      id: `${tmpId}${this.data.length}`,
      date:this.data[0].date, 
      description:this.data[0].description, 
      amount: 0, 
      category:"", 
      notes: "", 
      status: this.data[0].status,
      xId: this.data[0].id,
      xIndex: this.data.length
    }
    this.data.push(t);
    this.refreshAmountDisplay();
  }

  updateTotal(idx:number) {
    if (this.data.length > 1) {
      if (idx !== null) {
        const currentParsed = parseMoney(this.data[idx].amount);
        if (currentParsed === null) { return; }
        this.data[idx].amount = currentParsed;
      }
      if (idx !== null) {
        const newIdx:number = (idx + 1) % this.data.length;
        let tmp = new Array<ITransaction>();
        tmp.push(...this.data);
        tmp.splice(newIdx, 1);
        let remainingTAmount = tmp.map(t => t.amount).reduce((pv, v) => +pv + +v, 0);
        this.data[newIdx].amount = +(this.origTotal - remainingTAmount).toFixed(2);
      }
      this.newTotal = parseFloat(this.data.map(tr => tr.amount).reduce((pv, v) => +pv + +v, 0).toFixed(2));
      this.refreshAmountDisplay();
    }
  }

  deleteTransaction(t:ITransaction, idx:number) {
    this.data.splice(idx, 1);
    this.pendingDeletes.push(t);
    if (this.data.length == 0) return;
    this.data[0].amount = +(this.data[0].amount + t.amount).toFixed(2);
    this.refreshAmountDisplay();
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
    this.refreshAmountDisplay();

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

  close() {
    this.dialogRef.close();
  }

  onAmountInput(value: string, idx: number) {
    this.amountDisplay[idx] = value;
  }

  commitAmount(idx: number) {
    const parsed = parseMoney(this.amountDisplay[idx]);
    if (parsed === null) {
      window.alert('Please enter a valid amount.');
      return;
    }
    this.data[idx].amount = parsed;
    this.amountDisplay[idx] = parsed.toFixed(2);
    this.updateTotal(idx);
  }

  private normalizeAndValidateAmounts(): boolean {
    for (const tr of this.data) {
      const parsed = parseMoney(tr.amount);
      if (parsed === null) {
        window.alert('Please enter a valid amount for all transactions.');
        return false;
      }
      tr.amount = parsed;
    }
    this.refreshAmountDisplay();
    return true;
  }

  private refreshAmountDisplay() {
    this.amountDisplay = this.data.map(t => {
      const parsed = parseMoney(t.amount);
      return parsed === null ? '' : parsed.toFixed(2);
    });
  }

}
