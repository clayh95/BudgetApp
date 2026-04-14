import { SummaryComponent } from './summary.component';

describe('SummaryComponent', () => {
  it('should create', () => {
    const component = Object.create(SummaryComponent.prototype) as SummaryComponent;
    expect(component).toBeTruthy();
  });
});
