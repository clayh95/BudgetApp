import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../shared/shared.module';

export interface IDashboardWatchCategoryModalData {
  categoryOptions: string[];
}

@Component({
  selector: 'app-dashboard-watch-category-modal',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dashboard-watch-category-modal.component.html',
  styleUrls: ['./dashboard-watch-category-modal.component.scss']
})
export class DashboardWatchCategoryModalComponent {
  data = inject<IDashboardWatchCategoryModalData>(MAT_DIALOG_DATA);
  selectedCategoryName = '';

  constructor(public dialogRef: MatDialogRef<DashboardWatchCategoryModalComponent>) {}

  close() {
    this.dialogRef.close();
  }

  save() {
    if (!this.selectedCategoryName) { return; }
    this.dialogRef.close(this.selectedCategoryName);
  }
}
