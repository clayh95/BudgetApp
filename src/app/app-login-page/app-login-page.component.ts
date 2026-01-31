import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { SharedModule } from '../shared/shared.module';


@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './app-login-page.component.html',
  styleUrls: ['./app-login-page.component.scss']
})
export class AppLoginPageComponent implements OnInit {

  bShowLoginButton = new BehaviorSubject<boolean>(false);

  constructor(public authService: AuthService) { }

  ngOnInit(): void {
    this.checkLoginState();
  }

  async checkLoginState() {
    await this.delay(2000);
    this.bShowLoginButton.next(true);
  }

  delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
  }


}
