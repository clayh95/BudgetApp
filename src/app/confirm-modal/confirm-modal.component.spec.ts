import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent;
  let fixture: ComponentFixture<ConfirmModalComponent>;

  beforeEach(async () => {
    const dialogRefMock = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ ConfirmModalComponent ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { matIconName: '', message: '', buttons: [] } }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('returns expected values for all button paths', () => {
    const dialogRef = TestBed.inject(MatDialogRef);
    component.ok();
    expect(dialogRef.close).toHaveBeenCalledWith(true);

    vi.clearAllMocks();
    component.yes();
    expect(dialogRef.close).toHaveBeenCalledWith(true);

    vi.clearAllMocks();
    component.no();
    expect(dialogRef.close).toHaveBeenCalledWith(false);

    vi.clearAllMocks();
    component.cancel();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });
});
