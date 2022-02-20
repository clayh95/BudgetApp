import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarryBalancesModalComponent } from './carry-balances-modal.component';

describe('CarryBalancesModalComponent', () => {
  let component: CarryBalancesModalComponent;
  let fixture: ComponentFixture<CarryBalancesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CarryBalancesModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CarryBalancesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
