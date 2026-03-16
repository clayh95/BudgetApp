import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../shared/shared.module';

export interface IDashboardWatchVendorModalData {
  vendorOptions: string[];
}

@Component({
  selector: 'app-dashboard-watch-vendor-modal',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard-watch-vendor-modal.component.html',
  styleUrls: ['./dashboard-watch-vendor-modal.component.scss']
})
export class DashboardWatchVendorModalComponent {
  data = inject<IDashboardWatchVendorModalData>(MAT_DIALOG_DATA);
  vendorName = '';

  constructor(public dialogRef: MatDialogRef<DashboardWatchVendorModalComponent>) {}

  close() {
    this.dialogRef.close();
  }

  save() {
    if (!this.vendorName) { return; }
    this.dialogRef.close(this.vendorName.trim());
  }
}
