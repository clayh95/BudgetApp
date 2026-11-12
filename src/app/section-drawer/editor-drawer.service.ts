import { Injectable, signal } from '@angular/core';
import { ICategory, ITransaction } from '../core/dataTypes';

@Injectable({ providedIn: 'root' })
export class EditorDrawerService {
  private categoryState = signal<(ICategory & { watched?: boolean }) | null>(null);
  private transactionState = signal<ITransaction[] | null>(null);
  private openState = signal(false);
  requestClose: () => Promise<boolean> = async () => true;
  get category() {
    return this.categoryState();
  }
  set category(value: (ICategory & { watched?: boolean }) | null) {
    this.categoryState.set(value);
  }
  get transactions() {
    return this.transactionState();
  }
  set transactions(value: ITransaction[] | null) {
    this.transactionState.set(value);
  }
  get opened() {
    return this.openState();
  }

  async openCategory(category: ICategory & { watched?: boolean }) {
    if (!(await this.requestClose())) {
      return;
    }
    this.transactions = null;
    this.category = structuredClone(category);
    this.openState.set(true);
  }

  async openTransactions(transactions: ITransaction[]) {
    if (!(await this.requestClose())) {
      return;
    }
    this.category = null;
    this.transactions = structuredClone(transactions);
    this.openState.set(true);
  }

  finish() {
    this.openState.set(false);
  }

  clearClosedDraft() {
    if (this.opened) {
      return;
    }
    this.category = null;
    this.transactions = null;
  }
}
