import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

  it('renders review amounts with currency formatting and grouped transactions', () => {
    component.status = 1 as any;
    component.importSummary.title = 'Selected file: transactions.csv';
    component.importSummary.readyTransactions = [
      {
        date: '05/15/2026',
        amount: -22.12,
        description: 'READY TRANSACTION DESCRIPTION',
        category: '',
        notes: '',
        status: ITransactionStatus.posted
      }
    ] as any;
    component.importSummary.duplicateTransactions = [
      {
        date: '05/14/2026',
        amount: 45,
        description: 'DUPLICATE TRANSACTION DESCRIPTION',
        category: '',
        notes: '',
        status: ITransactionStatus.posted
      }
    ] as any;

    fixture.detectChanges();

    const pageText = fixture.nativeElement.textContent;
    const amountEls = fixture.debugElement.queryAll(By.css('.transaction-amount'));
    const sectionLabels = fixture.debugElement.queryAll(By.css('.section-label'));

    expect(pageText).toContain('Selected file: transactions.csv');
    expect(pageText).toContain('Ready');
    expect(pageText).toContain('Duplicates');
    expect(sectionLabels.map(el => el.nativeElement.textContent.trim())).toEqual([
      'Ready to import',
      'Possible duplicates'
    ]);
    expect(amountEls.map(el => el.nativeElement.textContent.trim())).toEqual(['-$22.12', '$45.00']);
  });

  it('shows the import button with the selected count when ready transactions are present', () => {
    component.status = 1 as any;
    component.importSummary.readyTransactions = [
      {
        date: '05/15/2026',
        amount: -22.12,
        description: 'READY TRANSACTION DESCRIPTION',
        category: '',
        notes: '',
        status: ITransactionStatus.posted
      }
    ] as any;
    component.importSummary.duplicateTransactions = [] as any;

    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.import-action-bar button'));
    const selectionCount = fixture.debugElement.query(By.css('.selection-count'));

    expect(button).not.toBeNull();
    expect(button.nativeElement.textContent).toContain('Import 1 charge(s)');
    expect(selectionCount.nativeElement.textContent.trim()).toBe('1');
  });

  it('hides the import button when no transactions are preselected', () => {
    component.status = 1 as any;
    component.importSummary.readyTransactions = [] as any;
    component.importSummary.duplicateTransactions = [
      {
        date: '05/14/2026',
        amount: 45,
        description: 'DUPLICATE TRANSACTION DESCRIPTION',
        category: '',
        notes: '',
        status: ITransactionStatus.posted
      }
    ] as any;

    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.import-action-bar button'));
    const hint = fixture.debugElement.query(By.css('.selection-hint'));

    expect(button).toBeNull();
    expect(hint.nativeElement.textContent).toContain('Select at least one transaction to continue.');
  });

  it('renders transaction descriptions with the truncation hook class', () => {
    component.status = 1 as any;
    component.importSummary.readyTransactions = [
      {
        date: '05/15/2026',
        amount: -22.12,
        description: 'A VERY LONG READY TRANSACTION DESCRIPTION',
        category: '',
        notes: '',
        status: ITransactionStatus.posted
      }
    ] as any;
    component.importSummary.duplicateTransactions = [] as any;

    fixture.detectChanges();

    const description = fixture.debugElement.query(By.css('.transaction-description'));

    expect(description).not.toBeNull();
    expect(description.nativeElement.textContent.trim()).toBe('A VERY LONG READY TRANSACTION DESCRIPTION');
  });
});
