import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MonthYearPickerComponent } from './month-year-picker.component';

describe('MonthYearPickerComponent', () => {
  let component: MonthYearPickerComponent;
  let fixture: ComponentFixture<MonthYearPickerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ MonthYearPickerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthYearPickerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
