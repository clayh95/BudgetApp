import { Component, OnInit } from '@angular/core';
import { AuthService } from './core/auth.service';
import { AppLoginPageComponent } from './app-login-page/app-login-page.component';
import { MainNavComponent } from './main-nav/main-nav.component';
import { SharedModule } from './shared/shared.module';
import { DbService } from './core/db.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SharedModule, AppLoginPageComponent, MainNavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(service: DbService, public authService: AuthService) {

  }

  ngOnInit() {
    
  }

  }
