import { Injectable } from '@angular/core';
import { IUser } from './dataTypes';
import {Router} from '@angular/router';

import { BehaviorSubject, Observable ,  of } from 'rxjs';
import * as firebase from 'firebase/app';
import { AngularFireAuth } from '../../../node_modules/angularfire2/auth';
import { AngularFirestore, AngularFirestoreDocument } from '../../../node_modules/angularfire2/firestore';
import { DbService } from './db.service';
import { map } from '../../../node_modules/rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user: Observable<firebase.User>;
  loginState: BehaviorSubject<string>;
  
  constructor(private afAuth: AngularFireAuth,
              private afs: AngularFirestore,
              private dbService: DbService,
              private router: Router) {

     this.user = this.afAuth.authState;
     this.loginState = new BehaviorSubject<string>("");
  }

  googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.oAuthLogin(provider);
  }

  logOut() {
    this.afAuth.auth.signOut().then(x => {
      this.dbService.signOut();
    });
  }

  private oAuthLogin(provider: firebase.auth.AuthProvider) {
    return this.afAuth.auth.signInWithPopup(provider)
      .then((credential) => {
        return this.checkUserState(credential.user);
      })
  }

  private checkUserState(user: firebase.User) {
    this.dbService.userCollection.ref.where("uid", "==", user.uid)
      .get()
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

}


