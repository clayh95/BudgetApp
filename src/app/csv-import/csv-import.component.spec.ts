import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { ITransactionStatus } from '../core/dataTypes';
import { DbService } from '../core/db.service';
import { CsvImportComponent } from './csv-import.component';

describe('CsvImportComponent', () => {
  let component: CsvImportComponent;
  let fixture: ComponentFixture<CsvImportComponent>;

  const dbServiceStub = {
    categories: new BehaviorSubject([])
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CsvImportComponent],
      providers: [
        { provide: DbService, useValue: dbServiceStub }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CsvImportComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('parses an old-format transaction row', () => {
    const transaction = component.ConvertCSVToTransaction([
      '05/15/2026',
      '-22.12',
      '*',
      '',
      'PURCHASE AUTHORIZED ON 05/15 COSTCO WHSE #2121 TIMBUCKTU TX P523456789654321 CARD 1234'
    ]);

    expect(transaction).toEqual(expect.objectContaining({
      date: '05/15/2026',
      amount: -22.12,
      description: 'PURCHASE AUTHORIZED ON 05/15 COSTCO WHSE #2121 TIMBUCKTU TX P523456789654321 CARD 1234',
      status: ITransactionStatus.posted
    }));
  });

  it('parses a new-format transaction row', () => {
    const transaction = component.ConvertCSVToTransaction([
      '05/15/2026',
      'PURCHASE AUTHORIZED ON 05/15 COSTCO WHSE #2121 TIMBUCKTU TX P523456789654321 CARD 1234',
      '-22.12',
      '',
      'Posted'
    ]);

    expect(transaction).toEqual(expect.objectContaining({
      date: '05/15/2026',
      amount: -22.12,
      description: 'PURCHASE AUTHORIZED ON 05/15 COSTCO WHSE #2121 TIMBUCKTU TX P523456789654321 CARD 1234',
      status: ITransactionStatus.posted
    }));
  });

  it('skips the new-format header row', () => {
    expect(component.ConvertCSVToTransaction([
      'DATE',
      'DESCRIPTION',
      'AMOUNT',
      'CHECK #',
      'STATUS'
    ])).toBeNull();
  });

  it('normalizes repeated spaces in imported descriptions', () => {
    const transaction = component.ConvertCSVToTransaction([
      '05/15/2026',
      'PURCHASE                                AUTHORIZED ON   05/15 COSTCO WHSE #2121         TIMBUCKTU TX  P523456789654321   CARD 1234',
      '-22.12',
      '',
      'Posted'
    ]);

    expect(transaction?.description).toBe(
      'PURCHASE AUTHORIZED ON 05/15 COSTCO WHSE #2121 TIMBUCKTU TX P523456789654321 CARD 1234'
    );
  });

  it('returns null for rows that do not match either format', () => {
    expect(component.ConvertCSVToTransaction([
      'not-a-date',
      'DESCRIPTION',
      'AMOUNT'
    ])).toBeNull();
  });

  it('preserves posted status for both formats', () => {
    const oldFormatTransaction = component.ConvertCSVToTransaction([
      '05/15/2026',
      '-22.12',
      '*',
      '',
      'OLD FORMAT DESCRIPTION'
    ]);
    const newFormatTransaction = component.ConvertCSVToTransaction([
      '05/15/2026',
      'NEW FORMAT DESCRIPTION',
      '-22.12',
      '',
      'Pending'
    ]);

    expect(oldFormatTransaction?.status).toBe(ITransactionStatus.posted);
    expect(newFormatTransaction?.status).toBe(ITransactionStatus.posted);
  });

  it('parses old-format rows with commas inside quoted descriptions', () => {
    const row = component.parseCsvLine(
      '"05/15/2026","-22.12","*","","TRANSFER TO SMITH, JOHN HOUSE ACCOUNT"'
    );

    const transaction = component.ConvertCSVToTransaction(row);

    expect(row[4]).toBe('TRANSFER TO SMITH, JOHN HOUSE ACCOUNT');
    expect(transaction?.description).toBe('TRANSFER TO SMITH, JOHN HOUSE ACCOUNT');
    expect(transaction?.amount).toBe(-22.12);
  });

  it('parses new-format rows with commas inside quoted descriptions', () => {
    const row = component.parseCsvLine(
      '"05/15/2026","PURCHASE AUTHORIZED ON 05/15 HEB, COLLEGE STATION TX","-22.12","","Posted"'
    );

    const transaction = component.ConvertCSVToTransaction(row);

    expect(row[1]).toBe('PURCHASE AUTHORIZED ON 05/15 HEB, COLLEGE STATION TX');
    expect(transaction?.description).toBe('PURCHASE AUTHORIZED ON 05/15 HEB, COLLEGE STATION TX');
    expect(transaction?.amount).toBe(-22.12);
  });
});
