import { Component } from '@angular/core';
import { DbService } from '../core/db.service';
import {MomentDateAdapter} from '@angular/material-moment-adapter';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {MatDatepicker} from '@angular/material/datepicker';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment
import { FormControl } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';

export const MMYY_FORMAT = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
    noSlash: 'MMYYYY'
  },
};

@Component({
  selector: 'app-month-year-picker',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './month-year-picker.component.html',
  styleUrls: ['./month-year-picker.component.scss'],
  providers: [{provide: MAT_DATE_FORMATS, useValue: MMYY_FORMAT}]
})
export class MonthYearPickerComponent {

  date = new FormControl(moment());

  constructor(private service: DbService) {
      const d = new Date(`${this.service.monthYear.getValue().split('\/')[0]}\/01\/${this.service.monthYear.getValue().split('\/')[1]}`)
      this.date.setValue(moment(d))
  }

  chosenMonthHandler(normlizedMonth: Moment, datepicker: MatDatepicker<Moment>) {
    const ctrlValue = this.date.value;
    ctrlValue.month(normlizedMonth.month());
    ctrlValue.year(normlizedMonth.year());
    this.date.setValue(ctrlValue);
    datepicker.close();
    this.service.monthYear.next(moment(this.date.value).format(MMYY_FORMAT.display.dateInput))
  }

  NavigateMonth(increment: number) {
    const d = moment(this.date.value).add(increment, 'month');
    this.service.monthYear.next(d.format(MMYY_FORMAT.display.dateInput));
    this.date.setValue(d);
  }

}
