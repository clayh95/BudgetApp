import { AddTransactionComponent } from './add-transaction.component';

describe('AddTransactionComponent', () => {
  it('should create', () => {
    const component = Object.create(AddTransactionComponent.prototype) as AddTransactionComponent;
    expect(component).toBeTruthy();
  });
});
