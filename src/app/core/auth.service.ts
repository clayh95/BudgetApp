import { Injectable } from '@angular/core';
import { collectionType, IUser } from './dataTypes';
import {Router} from '@angular/router';

import { BehaviorSubject, Observable ,  of } from 'rxjs';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/compat/firestore';
import { DbService } from './db.service';
import { map } from 'rxjs/operators';
import { T } from '@angular/cdk/keycodes';

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
    this.afAuth.signOut().then(x => {
      this.dbService.signOut();
    });
  }

  private oAuthLogin(provider: firebase.auth.AuthProvider) {
    return this.afAuth.signInWithPopup(provider)
      .then((credential) => {
        return this.checkUserState(credential.user);
      })
  }

  private checkUserState(user: firebase.User) {
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

}


