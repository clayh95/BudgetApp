import { Component, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { collectionType, ConfirmModalButtons, ITransaction } from '../core/dataTypes';
import { MatDialog } from '@angular/material/dialog';
import { DbService } from '../core/db.service';
import { MAT_DATE_FORMATS } from '@angular/material/core';
import { default as _rollupMoment, Moment } from 'moment';
const moment = _rollupMoment;
import { deleteEnterLeave } from '../animations/template.animations';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { parseMoney } from '../core/utilities';
import { firstValueFrom } from 'rxjs';
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

const tmpId: string = 'tmp_';

export interface addEditTrans {
  type: number;
  transaction: ITransaction;
}

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MMDDYYYY_FORMAT }],
  animations: [deleteEnterLeave],
})
export class AddTransactionComponent implements AfterViewInit {
  tmpDate: Moment[];
  origTotal: number;
  newTotal: number;
  dummyCopy = new Array<ITransaction>();
  pendingDeletes: ITransaction[] = new Array<ITransaction>();
  data: ITransaction[] = [];
  @Input() set initialData(value: ITransaction[]) {
    if (value) {
      this.data = structuredClone(value);
      this.initialize();
    }
  }
  @Output() saved = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
  saving = false;
  error = '';
  private baseline = '';
  private sourceMonth = '';
  private order: string[] = [];
  private groupId: string | null = null;
  private allocationRecipient: string | null = null;
  private stagedTotal: number | null = null;
  private locations = new Map<string, string>();
  get totalsMatch() {
    return this.data.length < 2 || Math.round(this.origTotal * 100) === Math.round(this.newTotal * 100);
  }
  private signature() {
    return JSON.stringify([
      this.data,
      this.tmpDate?.map((d) => d.format('MM/DD/YYYY')),
      this.amountDisplay,
      this.pendingDeletes,
    ]);
  }
  get dirty() {
    return this.signature() !== this.baseline;
  }
  private initialize() {
    this.data = structuredClone(Array.isArray(this.data) ? this.data : []);
    this.pendingDeletes = [];
    this.allocationRecipient = null;
    this.stagedTotal = null;
    this.tmpDate = this.data.map((t) => moment(t.date, 'MM/DD/YYYY'));
    this.origTotal = +this.data.reduce((s, t) => s + Number(t.amount), 0).toFixed(2);
    this.newTotal = this.origTotal;
    this.sourceMonth = this.ATsvc.getMonthPKValue?.() || '';
    this.order = this.data.map((t) => t.id);
    this.groupId = this.data.find((t) => t.xId != null)?.xId || null;
    this.locations.clear();
    this.refreshAmountDisplay();
    this.baseline = this.signature();
  }
  private finish() {
    this.baseline = this.signature();
    this.saved.emit();
  }
  private requireSaved(result: boolean | void) {
    if (result === false) throw new Error('Save failed');
  }
  disableDeleteAnimations = true;
  amountDisplay: string[] = [];
  amountNegative: boolean[] = [];

  constructor(
    public ATsvc: DbService,
    public dialog: MatDialog,
  ) {
    this.initialize();
  }

  ngAfterViewInit(): void {
    setTimeout(() => (this.disableDeleteAnimations = false));
  }

  async add() {
    return this.saveTransactions();
  }
  async checkDeletesThenUpdate() {
    return this.saveTransactions();
  }
  async update() {
    return this.saveTransactions();
  }

  private async confirm(title: string, message: string): Promise<boolean> {
    const ref = this.dialog.open(ConfirmModalComponent, {
      width: '420px',
      maxWidth: '90vw',
      autoFocus: false,
      disableClose: true,
      data: { title, message, buttons: [ConfirmModalButtons.yes, ConfirmModalButtons.no], matIconName: 'help_outline' },
    });
    return !!(await firstValueFrom(ref.afterClosed()));
  }

  private async saveTransactions() {
    if (this.saving || !this.normalizeAndValidateAmounts() || !this.totalsMatch) return;
    if (this.tmpDate.some((d) => !d?.isValid())) {
      this.error = 'Enter a valid date for every transaction.';
      return;
    }
    this.saving = true;
    this.error = '';
    try {
      if (
        this.pendingDeletes.length &&
        !(await this.confirm('Delete transactions?', 'Delete the staged transaction lines?'))
      )
        return;
      const records = this.data.map((t, index) => ({ ...t, date: this.tmpDate[index].format('MM/DD/YYYY') }));
      const sourceLabel = `${this.sourceMonth.slice(0, 2)}/${this.sourceMonth.slice(2)}`;
      const moved = records.filter((t, i) => this.ATsvc.getMonthPKFromMoment(this.tmpDate[i]) !== this.sourceMonth);
      if (
        moved.length &&
        !(await this.confirm(
          'Move transactions?',
          `Move the dated entries out of ${sourceLabel} into their corresponding budget months?`,
        ))
      )
        return;
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const targetMonth = this.ATsvc.getMonthPKFromMoment(this.tmpDate[i]);
        const isNew = !record.id || record.id.startsWith(tmpId);
        if (isNew) {
          const id = this.ATsvc.createDocumentId(collectionType.transactions, targetMonth);
          this.requireSaved(await this.ATsvc.addDocument(record, collectionType.transactions, targetMonth, id));
          const orderIndex = this.order.indexOf(this.data[i].id);
          if (orderIndex >= 0) this.order[orderIndex] = id;
          this.data[i].id = id;
          this.locations.set(id, targetMonth);
        } else {
          const source = this.locations.get(record.id) || this.sourceMonth;
          this.requireSaved(
            source === targetMonth
              ? await this.ATsvc.updateDocument(record.id, collectionType.transactions, record, targetMonth)
              : await this.ATsvc.moveTransaction(record, source, targetMonth),
          );
          this.locations.set(record.id, targetMonth);
        }
      }
      for (const record of [...this.pendingDeletes]) {
        if (record.id && !record.id.startsWith(tmpId))
          this.requireSaved(
            await this.ATsvc.deleteDocument(
              record,
              collectionType.transactions,
              this.locations.get(record.id) || this.sourceMonth,
            ),
          );
        this.pendingDeletes.splice(this.pendingDeletes.indexOf(record), 1);
      }
      this.finish();
    } catch {
      this.error = 'Changes could not be fully saved. Your remaining edits are still here; retry saving.';
    } finally {
      this.saving = false;
    }
  }

  movingMonthsCheck(checkDate: Moment) {
    return this.ATsvc.getMonthPKFromMoment(checkDate) !== this.sourceMonth;
  }

  split() {
    if (!this.data.length) return;
    if (this.data.length === 1 && this.data[0].xId == null) this.origTotal = Number(this.data[0].amount);
    this.setXID();
    this.tmpDate.push(this.tmpDate[0].clone()); //set the date to the orig date
    const t = <ITransaction>{
      id: `${tmpId}${Date.now()}_${this.order.length}`,
      date: this.data[0].date,
      description: this.data[0].description,
      amount: 0,
      category: '',
      notes: '',
      status: this.data[0].status,
      xId: this.groupId,
      xIndex: this.data.length,
    };
    this.data.push(t);
    this.order.push(t.id);
    this.refreshAmountDisplay();
  }

  updateTotal(idx: number) {
    if (this.data.length === 1) this.newTotal = Number(this.data[0].amount);
    if (this.data.length > 1) {
      if (idx !== null) {
        const currentParsed = parseMoney(this.data[idx].amount);
        if (currentParsed === null) {
          return;
        }
        this.data[idx].amount = currentParsed;
      }
      if (idx !== null) {
        const newIdx: number = (idx + 1) % this.data.length;
        const tmp = new Array<ITransaction>();
        tmp.push(...this.data);
        tmp.splice(newIdx, 1);
        const remainingTAmount = tmp.map((t) => t.amount).reduce((pv, v) => +pv + +v, 0);
        this.data[newIdx].amount = +(this.origTotal - remainingTAmount).toFixed(2);
      }
      this.newTotal = parseFloat(
        this.data
          .map((tr) => tr.amount)
          .reduce((pv, v) => +pv + +v, 0)
          .toFixed(2),
      );
      this.refreshAmountDisplay();
    }
  }

  deleteTransaction(t: ITransaction, idx: number) {
    if (this.saving || (idx === 0 && this.data.length > 1)) return;
    if (!this.pendingDeletes.length) this.stagedTotal = this.data.reduce((sum, line) => sum + Number(line.amount), 0);
    const allocated =
      t.id === this.allocationRecipient ? this.pendingDeletes.reduce((sum, line) => sum + Number(line.amount), 0) : 0;
    const removedAmount = Number(t.amount);
    const restoreData = {
      ...t,
      date: this.tmpDate[idx].format('MM/DD/YYYY'),
      amount: +(removedAmount - allocated).toFixed(2),
    };
    this.data.splice(idx, 1);
    this.tmpDate.splice(idx, 1);
    this.pendingDeletes.push(restoreData);
    if (this.data.length) {
      const recipient = this.data.find((line) => line.id === this.allocationRecipient) || this.data[0];
      recipient.amount = +(Number(recipient.amount) + removedAmount).toFixed(2);
      this.allocationRecipient = recipient.id;
      if (this.data.length === 1) {
        this.data[0].xId = null;
        this.data[0].xIndex = null;
      } else this.reassignIndexes();
    } else this.allocationRecipient = null;
    this.newTotal = +this.data.reduce((sum, line) => sum + Number(line.amount), 0).toFixed(2);
    this.refreshAmountDisplay();
  }

  pendingDeletesIncludesId(tr: ITransaction) {
    return this.pendingDeletes.map((t) => t.id).includes(tr.id);
  }

  reassignIndexes() {
    this.data.map((t, index) => {
      t.xIndex = index;
    });
  }

  undoDelete(t: ITransaction, index: number) {
    this.pendingDeletes.splice(index, 1);
    if (this.data.length) {
      const recipient = this.data.find((line) => line.id === this.allocationRecipient) || this.data[0];
      recipient.amount = +(Number(recipient.amount) - Number(t.amount)).toFixed(2);
    } else {
      t.amount = this.stagedTotal ?? this.origTotal;
      this.allocationRecipient = t.id;
    }
    const dates = new Map(this.data.map((record, i) => [record.id, this.tmpDate[i]]));
    this.data.push(t);
    this.data.sort((a, b) => this.order.indexOf(a.id) - this.order.indexOf(b.id));
    this.tmpDate = this.data.map((record) => dates.get(record.id) || moment(record.date, 'MM/DD/YYYY'));
    if (this.data.length > 1) {
      this.setXID();
      this.reassignIndexes();
    } else if (!this.pendingDeletes.length) {
      this.data[0].xId = null;
      this.data[0].xIndex = null;
    }
    if (!this.pendingDeletes.length) {
      this.allocationRecipient = null;
      this.stagedTotal = null;
    }
    this.newTotal = +this.data.reduce((sum, record) => sum + Number(record.amount), 0).toFixed(2);
    this.refreshAmountDisplay();
  }

  private setXID() {
    if (!this.data.length) return;
    this.groupId ||= this.data[0].xId || this.data[0].id || `${tmpId}${Date.now()}`;
    this.data.forEach((t, i) => {
      t.xId = this.groupId;
      t.xIndex = i;
    });
  }

  dataHasTransactions() {
    return this.data.length > 0;
  }

  isAdd() {
    return this.dataHasTransactions() && this.data[0].id === undefined;
  }

  isSplit() {
    return this.dataHasTransactions() && this.data[0].xId != null;
  }

  getTitle() {
    if (!this.dataHasTransactions()) {
      return '';
    } else {
      return this.isAdd() ? 'New Transaction' : this.data[0].description;
    }
  }

  close() {
    this.dismiss.emit();
  }

  onAmountInput(value: string, idx: number) {
    this.amountDisplay[idx] = value;
  }

  onAmountSignChange(idx: number, value: 'neg' | 'pos') {
    this.amountNegative[idx] = value === 'neg';
    const current = parseMoney(this.amountDisplay[idx]);
    if (current === null) {
      this.amountDisplay[idx] = this.amountNegative[idx] ? '-0.00' : '0.00';
    } else {
      const abs = Math.abs(current).toFixed(2);
      this.amountDisplay[idx] = this.amountNegative[idx] ? `-${abs}` : abs;
    }
    this.commitAmount(idx);
  }

  commitAmount(idx: number) {
    const parsed = parseMoney(this.amountDisplay[idx]);
    if (parsed === null) {
      window.alert('Please enter a valid amount.');
      return;
    }
    const signed = this.amountNegative[idx] ? -Math.abs(parsed) : Math.abs(parsed);
    this.data[idx].amount = signed;
    const displayAmount = Math.abs(parsed).toFixed(2);
    this.amountDisplay[idx] = this.amountNegative[idx] ? `-${displayAmount}` : displayAmount;
    this.updateTotal(idx);
  }

  private normalizeAndValidateAmounts(): boolean {
    for (let i = 0; i < this.data.length; i++) {
      const tr = this.data[i];
      const displayed = parseMoney(this.amountDisplay[i]);
      const parsed = displayed === null ? null : this.amountNegative[i] ? -Math.abs(displayed) : Math.abs(displayed);
      if (parsed === null) {
        window.alert('Please enter a valid amount for all transactions.');
        return false;
      }
      tr.amount = parsed;
    }
    this.newTotal = +this.data.reduce((s, t) => s + Number(t.amount), 0).toFixed(2);
    this.refreshAmountDisplay();
    return true;
  }

  private refreshAmountDisplay() {
    this.amountDisplay = this.data.map((t) => {
      const parsed = parseMoney(t.amount);
      if (parsed === null) {
        return '';
      }
      const abs = Math.abs(parsed).toFixed(2);
      return parsed < 0 ? `-${abs}` : abs;
    });
    this.amountNegative = this.data.map((t) => {
      const parsed = parseMoney(t.amount);
      if (parsed === null) {
        return true;
      }
      if (parsed === 0 && (this.isAdd() || (t.id && t.id.startsWith(tmpId)))) {
        return true;
      }
      return parsed < 0;
    });
  }
}
