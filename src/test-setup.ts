import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { DbService } from './app/core/db.service';
import { AuthService } from './app/core/auth.service';

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);

beforeEach(() => {
  const dbServiceStub = {
    transactions: new BehaviorSubject<any[]>([]),
    categories: new BehaviorSubject<any[]>([]),
    monthYear: new BehaviorSubject<string>('01/2026'),
    monthSummary: new BehaviorSubject<string>(''),
    dashboardPreferences: new BehaviorSubject({ watchedCategoryKeys: [] }),
    saveState: new BehaviorSubject(0),
    addDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    signOut: vi.fn(),
    signIn: vi.fn(),
    addNextMonthYear: vi.fn(),
    getMonthYearValue: vi.fn(() => '01/2026'),
    getMonthPKValue: vi.fn(() => '012026'),
    getSaveState: vi.fn(() => 'done'),
    getSaveStatusDescription: vi.fn(() => 'All changes saved'),
    getBalances: vi.fn().mockResolvedValue([]),
    getTransactionsForEdit: vi.fn().mockResolvedValue([]),
    saveDashboardPreferences: vi.fn().mockResolvedValue(undefined),
    checkIfTransactionExists: vi.fn().mockResolvedValue({ docs: [] })
  };
  const authServiceStub = {
    loginState: new BehaviorSubject<string>(''),
    user: of(null),
    googleLogin: vi.fn().mockResolvedValue(undefined),
    devLogin: vi.fn().mockResolvedValue(undefined),
    logOut: vi.fn(),
    isEmulatorEnabled: vi.fn(() => true)
  };
  getTestBed().configureTestingModule({
    providers: [
      { provide: DbService, useValue: dbServiceStub },
      { provide: AuthService, useValue: authServiceStub },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
      { provide: MAT_DIALOG_DATA, useValue: { matIconName: '', message: '', buttons: [] } },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), snapshot: { queryParamMap: convertToParamMap({}) } } }
    ]
  });
});
