import { CategoryTableComponent } from './category-table.component';

describe('CategoryTableComponent', () => {
  it('should compile', () => {
    const component = Object.create(CategoryTableComponent.prototype) as CategoryTableComponent;
    expect(component).toBeTruthy();
  });
});
