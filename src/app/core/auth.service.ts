import { Injectable } from '@angular/core';
import { IUser } from './dataTypes';
import {Router} from '@angular/router';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/switchMap';
import { of } from 'rxjs';
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
  //TODO: Should I just set up an admin part of the page that allows user management? for FTNRO, probably yes
  
  constructor(private afAuth: AngularFireAuth,
              private afs: AngularFirestore,
              private dbService: DbService,
              private router: Router) {

     this.user = this.afAuth.authState
                // .switchMap(user => {
                //   console.log(user);
                //   if (user) {
                //     // return this.afs.doc<IUser>(`users/${user.uid}`).valueChanges();
                //     return user;
                //   } else {
                //     return of(null);
                //   }
                // });

  }

  googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.oAuthLogin(provider);
  }

  logOut() {
    this.afAuth.auth.signOut().then(x => {
      this.dbService.signOut();
    })
  }

  private oAuthLogin(provider) {
    return this.afAuth.auth.signInWithPopup(provider)
      .then((credential) => {
        return this.checkUserState(credential.user);
      })
  }

  private checkUserState(user) {
    this.dbService.userCollection.ref.where("uid", "==", user.uid)
      .get()
      .then(querySnapshot => {
        if (querySnapshot.docs.length == 0) {
          this.logOut();
        }
        else {
          console.log('welcome ' +  user.displayName);
          //reinitialize subscriptions?
          //let's add a logged out route
        }
      })
  }

}


