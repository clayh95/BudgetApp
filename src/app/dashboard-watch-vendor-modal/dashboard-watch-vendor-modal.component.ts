import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
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
  @ViewChild('autocompleteInput') input!: ElementRef<HTMLInputElement>;
  vendorNameControl = new FormControl<string>('');
  @ViewChild(MatAutocompleteTrigger) private trigger?: MatAutocompleteTrigger;
  private optionsLookup: Map<string, string> | null = null;

  constructor(public dialogRef: MatDialogRef<DashboardWatchVendorModalComponent>) {}

  close() {
    this.dialogRef.close();
  }

  filterVendorOptions(): string[] {
    return this.filteredVendorOptions;
  }

  get filteredVendorOptions(): string[] {
    const term = (this.input?.nativeElement.value || '').trim().toLowerCase();
    const options = this.sortedVendorOptions();
    if (!term) {
      return options;
    }
    return options.filter(v => (v || '').toLowerCase().includes(term));
  }

  private getVendorOptionsLowercaseMap(): Map<string, string> {
    if (this.optionsLookup) {
      return this.optionsLookup;
    }
    const map = new Map<string, string>();
    (this.data?.vendorOptions || []).forEach(option => {
      const trimmed = (option || '').trim();
      if (!trimmed) { return; }
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    });
    this.optionsLookup = map;
    return map;
  }

  private sortedVendorOptions(): string[] {
    const map = this.getVendorOptionsLowercaseMap();
    const out = Array.from(map.values());
    out.sort((a, b) => a.localeCompare(b));
    return out;
  }

  save() {
    this.dialogRef.close(this.vendorNameControl.value?.trim());
  }
}
