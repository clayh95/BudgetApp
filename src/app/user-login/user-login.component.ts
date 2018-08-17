import { Component, OnInit } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { map } from '../../../node_modules/rxjs/operators';
// import { bypassSanitizationTrustStyle } from '../../../node_modules/@angular/core/src/sanitization/bypass';
import { DomSanitizer } from '@angular/platform-browser'

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.scss']
})
export class UserLoginComponent implements OnInit {

  constructor(public authService: AuthService, private sanitized: DomSanitizer) {}
  user:firebase.User;
  image;

  ngOnInit() {
    this.authService.user.subscribe((u) => {
      this.user = u
      if (u) {
        this.image = this.sanitized.bypassSecurityTrustUrl(u.photoURL);
      }
      else {
        this.image = "assets/images/baseline_face_white_48dp.png";
      }
    })
  }

}
