import { Component, OnInit } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { map } from '../../../node_modules/rxjs/operators';

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.scss']
})
export class UserLoginComponent implements OnInit {

  constructor(public authService: AuthService) {}
  user: string;

  ngOnInit() {
    this.authService.user.subscribe((u) =>
      this.user = u.displayName
    )
  }

}
