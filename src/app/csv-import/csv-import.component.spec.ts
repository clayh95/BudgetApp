import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CsvImportComponent } from './csv-import.component';

describe('CsvImportComponent', () => {
  let component: CsvImportComponent;
  let fixture: ComponentFixture<CsvImportComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CsvImportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CsvImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
