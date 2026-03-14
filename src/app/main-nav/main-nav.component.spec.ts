import { MainNavComponent } from './main-nav.component';

describe('MainNavComponent', () => {
  it('should compile', () => {
    const component = Object.create(MainNavComponent.prototype) as MainNavComponent;
    expect(component).toBeTruthy();
  });
});
