import { Component, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, withLatestFrom, filter } from 'rxjs/operators';
import { Router, NavigationEnd } from '@angular/router';
import { MatSidenav } from '@angular/material/sidenav';
import { DbService } from '../core/db.service';
import { saveState } from '../core/dataTypes';
import { SharedModule } from '../shared/shared.module';
import { MonthYearPickerComponent } from '../month-year-picker/month-year-picker.component';
import { UserLoginComponent } from '../user-login/user-login.component';

@Component({
  selector: 'app-main-nav',
  standalone: true,
  imports: [SharedModule, MonthYearPickerComponent, UserLoginComponent],
  templateUrl: './main-nav.component.html',
  styleUrls: ['./main-nav.component.scss']
})
export class MainNavComponent {

  @ViewChild('drawer', {static: false}) drawer: MatSidenav;

  //can this be put into a service?
  isHandset$: Observable<boolean>;
    
  constructor(private breakpointObserver: BreakpointObserver, router: Router, public service: DbService) {
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches)
      );
    router.events.pipe(
      withLatestFrom(this.isHandset$),
      filter(([a, b]) => b && a instanceof NavigationEnd)
    ).subscribe(_ => this.drawer.close());
  }

  undo() {
    this.service.undo();
  }

  redo() {
    this.service.redo();
  }
  
  }
