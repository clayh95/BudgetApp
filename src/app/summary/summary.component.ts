import { Component, OnInit, OnDestroy } from '@angular/core';
import { DbService, tAction } from '../core/db.service';
import { combineLatest, Subscription } from 'rxjs';
import { collectionType, ICategory, ITransaction, ITransactionStatus } from '../core/dataTypes';
import {default as _rollupMoment, Moment} from 'moment';
import { MatDialog } from '@angular/material/dialog';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { formatCurrency, getLocaleId } from '@angular/common';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
import { getIcon, getPosNegColor } from '../core/utilities';
import { CarryBalancesModalComponent } from '../carry-balances-modal/carry-balances-modal.component';
const moment = _rollupMoment

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit, OnDestroy {

  constructor(public service: DbService, public dialog: MatDialog) { }

  catsTrans: Subscription;
  actualIncome: number;
  spent: number;
  totalBudgeted: number;
  reportCats: IReportCategory[];
  incomeData: IReportCategory;
  pendingTransactions: ITransaction[];
  totalPending: number;
  expandedPanel: string;

  ngOnInit() {
    
    this.catsTrans = combineLatest([this.service.categories, this.service.transactions]).subscribe(([cats, trans]) => {

          if (cats.length === 0 || trans.length === 0) {
            this.reportCats = [];
            this.incomeData = undefined;
            this.totalBudgeted = undefined;
            this.actualIncome = undefined;
            return;
          }

          this.actualIncome = 0;
          this.spent = 0;

          this.reportCats = new Array();
          this.pendingTransactions = new Array();

          const uncategorized: ICategory = {id: '', name: '', budgeted: 0, spent: 0, keywords: [], notes: ''}
          this.createReportCat(uncategorized, trans);

          cats.map(c => this.createReportCat(c, trans));

          //Pull out the income category
          if (cats.length > 1) this.incomeData = this.reportCats.find(x => x.category.name.toUpperCase() === 'INCOME');
          if (this.incomeData) {
            let tmpIncome = this.incomeData.transactions.map(t => t.amount).reduce((pv, v) => +pv + +v, 0);
            this.actualIncome = +tmpIncome.toFixed(2);
            this.reportCats.splice(this.reportCats.indexOf(this.incomeData), 1);
          }

          // Pull out pending items
          this.reportCats.map(rc => {
            var bPending:boolean = false;
            rc.transactions.map(t => {
              if (t.status.toUpperCase() == ITransactionStatus.pending.toString().toUpperCase()) {
                this.pendingTransactions.push(t);
                bPending = true;
              }
            });
            if (!bPending) return;
            this.pendingTransactions.map(t => {
              if (rc.transactions.indexOf(t) > -1) {
                rc.transactions.splice(rc.transactions.indexOf(t), 1);
              }
            });
            rc.category.spent = 0;
            rc.transactions.map(t => this.calculateSpentAmount(t, rc.category));
            // anything where we pulled out pending, we need to redo the total
          });
          this.totalPending = this.pendingTransactions.map(t => +t.amount).reduce((pv, v) => pv + v, 0);

          this.spent = this.reportCats.map(c => c.category.spent).reduce((pv, v) => +pv + +v, 0); //Everything remaining is SPENT
          this.spent = +this.spent.toFixed(2);

          let tmp: number = this.reportCats.map(c => c.category.budgeted).reduce((pv, v) => +pv + +v, 0);
          this.totalBudgeted = +tmp.toFixed(2);
      }
    );

  }

  private createReportCat(c: ICategory, trans: ITransaction[]) {
    c.spent = 0;
    let t: ITransaction[] = this.getTransactionsForCategory(trans, c);
    c.spent = +c.spent.toFixed(2);
    if (c.name === '') { 
      c.name = 'Uncategorized'; 
      c.emoji = '?'
    }
    this.reportCats.push({
      category: c,
      transactions: t
    });
  }

  private getTransactionsForCategory(trans: ITransaction[], c: ICategory): ITransaction[] {
    return trans
      .filter(t => t.category === c.name)
      .map(t => this.calculateSpentAmount(t, c))
      .sort((a, b) => {
        return a.date > b.date ? 1 : -1;
      });
  }

  private calculateSpentAmount(t: ITransaction, c: ICategory) {
    if (c.name === 'INCOME') {
      c.spent += (1 * +t.amount);
    }
    else {
      c.spent += (-1 * +t.amount);
    }
    return t;
  }

  getColor(item: IReportCategory) {
    return getPosNegColor(item.category.budgeted, item.category.spent);
  }

  getIncomeColor() {
    if (this.actualIncome - this.incomeData.category.budgeted < 0) {
      return 'red'
    } else {
      return 'green'
    }
  }

  getEmoji():string[] {
    if (this.actualIncome === this.totalBudgeted) {
      return ['Everything is balanced!','🙌'];
    } else if (this.actualIncome > this.totalBudgeted) {
      return [`We have ${formatCurrency(this.actualIncome - this.totalBudgeted, getLocaleId('en-US'), '','USD')}  we can still budget!`,'😃'];
    } else if (this.actualIncome < this.totalBudgeted){
      return [`We are overbudgeted by ${formatCurrency(this.totalBudgeted - this.actualIncome, getLocaleId('en-US'), '','USD')}`,'😬'];
    } else {
      return ['', ''];
    }
  }

  getIconFromUtils(description:string):string {
    return getIcon(description);
  }

  SetExpandedPanel(id: string) {
    this.expandedPanel = id;
  }
  
  editTransaction(t:ITransaction) {
    this.service.getTransactionsForEdit(t).then(modalData => {
      const dialogRef = this.dialog.open(
        AddTransactionComponent, 
        {width:'1600px', maxWidth:'90vw', data: modalData, autoFocus: false}
      );
    });
  }

  editCategory(event, c) {
    event.stopPropagation();
    const catDialogRef = this.dialog.open(CategoryModalComponent, {width:'500px', maxWidth:'90vw', data: Object.assign({}, c), autoFocus: false})
  }

  updateSummaryNotes(value:string) {
    this.service.updateDocument(this.service.getMonthPKValue(), collectionType.monthsPK, {'summary': value});
  }
  
  trackById(index, item) {
    return item.category.id;
  }

  trackByIdPending(index, item) {
    return item.id;
  }
  
  carryAmounts() {
    let list:Array<ITransaction> = [];
    this.reportCats.filter(c => (c.category.budgeted - c.category.spent) != 0).map(c => {
      let m = this.service.monthYear.getValue();
      let d = new Date(`${m.split('/')[0]}/01/${m.split('/')[1]}`)
      let dPlus = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      let t = <ITransaction>{
          description: `${c.category.name} Starting Balance`, 
          amount: (c.category.budgeted-c.category.spent).toFixed(2), 
          category: c.category.name, 
          date: moment(dPlus).format('MM/DD/YYYY'),
          notes: "",
          status: "Posted"
        }
      list.push(t);
    });
    const carryBalancesRef = this.dialog.open(
      CarryBalancesModalComponent, 
      {width:'1600px', maxWidth:'90vw', data: list, autoFocus: false}
      );
  }

  getPercentage(budgeted:number):number {
    return (budgeted / this.totalBudgeted);
  }
  
  ngOnDestroy() {
    this.catsTrans.unsubscribe();
  }
}


interface IReportCategory {
  category: ICategory;
  transactions: ITransaction[];
}