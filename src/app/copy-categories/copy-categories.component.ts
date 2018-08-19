import { Component, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { DbService } from '../core/db.service';
import {MomentDateAdapter} from '@angular/material-moment-adapter';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {MatDatepicker} from '@angular/material/datepicker';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment
import { FormControl } from '@angular/forms';
import { MMYY_FORMAT } from '../month-year-picker/month-year-picker.component';

@Component({
  selector: 'app-copy-categories',
  templateUrl: './copy-categories.component.html',
  styleUrls: ['./copy-categories.component.scss'],
  providers: [{provide: MAT_DATE_FORMATS, useValue: MMYY_FORMAT}]
})
export class CopyCategoriesComponent {

  dp_copyForm = new FormControl(moment());
  numCopied: number;

  constructor(private service: DbService,  
              public dialogRef: MatDialogRef<CopyCategoriesComponent>) { }

  chosenYearHandler(normalizedYear: Moment) {
    // const ctrlValue = this.dp_copy.value;
    // ctrlValue.year(normalizedYear.year());
    // this.dp_copy.setValue(ctrlValue);
    // this.service.monthYear.next(moment(this.date.value).format(MY_FORMATS.display.dateInput))
  }

  chosenMonthHandler(normlizedMonth: Moment, datepicker: MatDatepicker<Moment>) {
    const ctrlValue = this.dp_copyForm.value;
    ctrlValue.month(normlizedMonth.month());
    this.dp_copyForm.setValue(ctrlValue);
    datepicker.close();
    // this.service.monthYear.next(moment(this.date.value).format(MY_FORMATS.display.dateInput))
  }

  copyCategories() {
    let copyToMonthYear: string = `${this.dp_copyForm.value.format('MM')}\/${this.dp_copyForm.value.format('YYYY')}`
    let copyToMonthYearNoSlash: string = copyToMonthYear.replace(/\//g,"")
    if (copyToMonthYear == this.service.monthYear.getValue()) {
      alert("You probably don't want to copy those to the same month...")
    }
    else {
      this.service.CreateMonthIfNotExists(copyToMonthYearNoSlash);
      this.service.CopyCagetories(copyToMonthYearNoSlash);
      this.service.monthYear.next(copyToMonthYear);
      this.dialogRef.close();
    }
  }

    onNoClick(): void {
      this.dialogRef.close();
    }

}
