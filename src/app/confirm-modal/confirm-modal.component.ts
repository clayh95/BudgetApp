import { Component, inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmModalConfig, ConfirmModalButtons } from '../core/dataTypes';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent implements OnInit {

  config = inject<ConfirmModalConfig>(MAT_DIALOG_DATA);

  constructor(
    public dialogRef: MatDialogRef<ConfirmModalComponent>) {
    }

  ngOnInit(): void {
  }

  ok() {
    this.dialogRef.close(true);
  }

  yes() {
    this.dialogRef.close(true);
  }

  no() {
    this.dialogRef.close(false);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
