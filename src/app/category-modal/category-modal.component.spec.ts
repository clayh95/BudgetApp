import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { CategoryModalComponent } from './category-modal.component';
import { DbService } from '../core/db.service';

describe('CategoryModalComponent', () => {
  let component: CategoryModalComponent;
  let fixture: ComponentFixture<CategoryModalComponent>;

  beforeEach(waitForAsync(() => {
    const dbStub = {
      addDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
      getQuerySnapshot: vi.fn(),
      dashboardPreferences: new BehaviorSubject({ watchedCategoryKeys: [], watchedVendorKeys: [] }),
      saveDashboardPreferences: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      imports: [ CategoryModalComponent ],
      providers: [
        { provide: DbService, useValue: dbStub },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: {
          id: 'cat-1',
          name: 'Groceries',
          keywords: ['food'],
          budgeted: 10.00,
          notes: '',
          emoji: ''
        }}
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoryModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('commits budgeted values with proper signed display', () => {
    component.budgetedDisplay = '99.50';
    component.budgetedNegative = false;
    component.commitBudgeted();

    expect(component.data.budgeted).toBe(99.5);
    expect(component.budgetedDisplay).toBe('99.50');

    component.onBudgetedSignChange('neg');
    expect(component.budgetedNegative).toBe(true);
    expect(component.budgetedDisplay).toBe('-99.50');
    expect(component.data.budgeted).toBe(-99.5);

    component.onBudgetedSignChange('pos');
    expect(component.budgetedNegative).toBe(false);
    expect(component.budgetedDisplay).toBe('99.50');
    expect(component.data.budgeted).toBe(99.5);
  });

  it('keeps state and alerts when budgeted value is invalid', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const startingBudgeted = component.data.budgeted;

    component.budgetedDisplay = 'bad-value';
    component.commitBudgeted();

    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid budgeted amount.');
    expect(component.data.budgeted).toBe(startingBudgeted);
    expect(component.budgetedDisplay).toBe('bad-value');
  });

});
