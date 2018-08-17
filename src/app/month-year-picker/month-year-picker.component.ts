import { Component } from '@angular/core';
import { DbService } from '../core/db.service';
import {MomentDateAdapter} from '@angular/material-moment-adapter';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {MatDatepicker} from '@angular/material/datepicker';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment
import { FormControl } from '@angular/forms';

//TODO: Provide more formats for the All Transactions Screen
export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-month-year-picker',
  templateUrl: './month-year-picker.component.html',
  styleUrls: ['./month-year-picker.component.scss']
})
export class MonthYearPickerComponent {

  date = new FormControl(moment());

  constructor(private service: DbService) {}

  chosenYearHandler(normalizedYear: Moment) {
    const ctrlValue = this.date.value;
    ctrlValue.year(normalizedYear.year());
    this.date.setValue(ctrlValue);
    // console.log(this.date.value)
    this.service.monthYear.next(moment(this.date.value).format(MY_FORMATS.display.dateInput))
  }

  chosenMonthHandler(normlizedMonth: Moment, datepicker: MatDatepicker<Moment>) {
    const ctrlValue = this.date.value;
    ctrlValue.month(normlizedMonth.month());
    this.date.setValue(ctrlValue);
    datepicker.close();
    // console.log(this.date.value)
    this.service.monthYear.next(moment(this.date.value).format(MY_FORMATS.display.dateInput))
  }

}
