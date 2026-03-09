import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TransactionTableComponent } from './transaction-table.component';
import { DbService } from '../core/db.service';

class DbServiceStub {
  transactions = new BehaviorSubject<any[]>([]);
  categories = new BehaviorSubject<any[]>([]);
  updateDocument = jasmine.createSpy('updateDocument');
  getTransactionsForEdit = jasmine.createSpy('getTransactionsForEdit').and.resolveTo([]);
}

describe('TransactionTableComponent', () => {
  let component: TransactionTableComponent;
  let fixture: ComponentFixture<TransactionTableComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TransactionTableComponent],
      providers: [
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
        { provide: DbService, useClass: DbServiceStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should compile', () => {
    expect(component).toBeTruthy();
  });
});
