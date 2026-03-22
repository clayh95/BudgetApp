import { Component, inject } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../shared/shared.module';
import { IVendorLogoRule } from '../core/utilities';
import { ConfirmModalButtons, ConfirmModalConfig } from '../core/dataTypes';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

export type DashboardVendorMappingModalResult =
  | { action: 'save'; mapping: IVendorLogoRule }
  | { action: 'delete' }
  | { action: 'close' };

export interface IDashboardVendorMappingModalData {
  mapping?: IVendorLogoRule;
  index?: number;
}

@Component({
  selector: 'app-dashboard-vendor-mapping-modal',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard-vendor-mapping-modal.component.html',
  styleUrls: ['./dashboard-vendor-mapping-modal.component.scss']
})
export class DashboardVendorMappingModalComponent {
  data = inject<IDashboardVendorMappingModalData>(MAT_DIALOG_DATA);
  pattern = '';
  vendorName = '';
  logoUrl = '';
  readonly regexErrorStateMatcher: ErrorStateMatcher = {
    isErrorState: (_control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean => this.showPatternError
  };

  constructor(
    public dialogRef: MatDialogRef<DashboardVendorMappingModalComponent>,
    private dialog: MatDialog
  ) {
    if (this.data?.mapping) {
      this.pattern = this.data.mapping.pattern || '';
      this.vendorName = this.data.mapping.vendorName || '';
      this.logoUrl = this.data.mapping.logoUrl || '';
    }
  }

  close() {
    this.dialogRef.close({ action: 'close' } as DashboardVendorMappingModalResult);
  }

  get isPatternValid(): boolean {
    const value = this.pattern.trim();
    if (!value) {
      return false;
    }
    try {
      new RegExp(value, 'i');
      return true;
    } catch {
      return false;
    }
  }

  get patternValidationIcon(): 'check_circle' | 'cancel' {
    return this.isPatternValid ? 'check_circle' : 'cancel';
  }

  get hasPatternValue(): boolean {
    return this.pattern.trim().length > 0;
  }

  get showPatternHint(): boolean {
    return this.hasPatternValue && this.isPatternValid;
  }

  get showPatternError(): boolean {
    return this.hasPatternValue && !this.isPatternValid;
  }

  get canSave(): boolean {
    return !!this.vendorName.trim() && !!this.logoUrl.trim() && this.isPatternValid;
  }

  save() {
    if (!this.canSave) { return; }
    this.dialogRef.close({
      action: 'save',
      mapping: {
      pattern: this.pattern.trim(),
      vendorName: this.vendorName.trim(),
      logoUrl: this.logoUrl.trim()
      }
    } as DashboardVendorMappingModalResult);
  }

  delete(event: MouseEvent) {
    const target = event?.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const controlConfig: ConfirmModalConfig = {
      title: 'Delete?',
      message: 'Delete this vendor mapping?',
      buttons: [ConfirmModalButtons.yes, ConfirmModalButtons.no],
      matIconName: 'chevron_left'
    };
    const dialogConfig: MatDialogConfig = {
      width: '420px',
      maxWidth: '90vw',
      data: controlConfig,
      autoFocus: false,
      disableClose: true,
      position: rect
        ? {
            left: `${rect.right}px`,
            top: `${rect.top}px`
          }
        : undefined
    };
    const dialogRef = this.dialog.open(ConfirmModalComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) { return; }
      this.dialogRef.close({ action: 'delete' } as DashboardVendorMappingModalResult);
    });
  }
}
