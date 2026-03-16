import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../shared/shared.module';
import { IVendorLogoRule } from '../core/utilities';

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

  constructor(public dialogRef: MatDialogRef<DashboardVendorMappingModalComponent>) {
    if (this.data?.mapping) {
      this.pattern = this.data.mapping.pattern || '';
      this.vendorName = this.data.mapping.vendorName || '';
      this.logoUrl = this.data.mapping.logoUrl || '';
    }
  }

  close() {
    this.dialogRef.close();
  }

  save() {
    if (!this.pattern || !this.vendorName || !this.logoUrl) { return; }
    this.dialogRef.close({
      pattern: this.pattern.trim(),
      vendorName: this.vendorName.trim(),
      logoUrl: this.logoUrl.trim()
    });
  }
}
