import { TransactionTableComponent } from './transaction-table.component';

describe('TransactionTableComponent', () => {
  it('should compile', () => {
    const component = Object.create(TransactionTableComponent.prototype) as TransactionTableComponent;
    expect(component).toBeTruthy();
  });
});
