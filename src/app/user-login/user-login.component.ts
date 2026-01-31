import { Component, OnInit } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { map } from '../../../node_modules/rxjs/operators';
// import { bypassSanitizationTrustStyle } from '../../../node_modules/@angular/core/src/sanitization/bypass';
import { DomSanitizer } from '@angular/platform-browser'
import { DbService } from '../core/db.service';
import firebase from 'firebase/compat/app';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.scss']
})
export class UserLoginComponent implements OnInit {

  constructor(public authService: AuthService, private sanitized: DomSanitizer, private db: DbService) {}
  user:firebase.User;
  image;
  balances;
  nonZeroBalance:boolean = false;

  ngOnInit() {
    this.authService.user.subscribe(async (u) => {
      this.user = u
      if (u) {
        this.image = this.sanitized.bypassSecurityTrustUrl(u.photoURL);
        this.balances = await this.db.getBalances();
        try {
          let b = this.balances.filter(k => k.key == "Credit Card")[0].value;
          if (Number(b.replace(/[^0-9.-]+/g,"")) > 0) {
            this.nonZeroBalance = true;
          }
        }
        catch {}
      }
      else {
        this.image = "assets/images/baseline_face_white_48dp.png";
      }
    })
  }

  goToLink(url: string){
    window.open(url, "_blank");
  }

}
