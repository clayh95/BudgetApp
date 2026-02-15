import { Injectable } from '@angular/core';
import { collectionType, IUser } from './dataTypes';
import {Router} from '@angular/router';

import { BehaviorSubject, Observable } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { GoogleAuthProvider, User, signInAnonymously, signInWithPopup, signOut } from 'firebase/auth';
import { DbService } from './db.service';
import { map } from 'rxjs/operators';
import { T } from '@angular/cdk/keycodes';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user: Observable<User | null>;
  loginState: BehaviorSubject<string>;
  
  constructor(private auth: Auth,
              private dbService: DbService,
              private router: Router) {

     this.user = authState(this.auth);
     this.loginState = new BehaviorSubject<string>("");
  }

  googleLogin() {
    const provider = new GoogleAuthProvider();
    return this.oAuthLogin(provider);
  }

  devLogin() {
    return signInAnonymously(this.auth)
      .then((credential) => {
        return this.checkUserState(credential.user);
      });
  }

  logOut() {
    signOut(this.auth).then(x => {
      this.dbService.signOut();
    });
  }

  private oAuthLogin(provider: GoogleAuthProvider) {
    return signInWithPopup(this.auth, provider)
      .then((credential) => {
        return this.checkUserState(credential.user);
      })
  }

  private checkUserState(user: User) {
    if (this.isEmulatorEnabled()) {
      this.loginState.next("");
      this.dbService.signIn();
      return;
    }
    this.dbService.getQuerySnapshot(collectionType.users, 'uid', "==", user.uid)
      .then(querySnapshot => {
        if (querySnapshot.docs.length == 0) {
          this.loginState.next(`Sorry ${user.displayName}, you are not a valid user.`);
          this.logOut();
        }
        else {
          this.loginState.next("");
          this.dbService.signIn()
        }
      });
  }

  isEmulatorEnabled(): boolean {
    return !environment.production;
  }

}
