import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { ITransaction, IUser, ICategory } from './dataTypes';
import { ObserveOnSubscriber } from '../../../node_modules/rxjs/internal/operators/observeOn';
import { Observable, BehaviorSubject } from '../../../node_modules/rxjs';
import { map } from '../../../node_modules/rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  transactionCollection: AngularFirestoreCollection<ITransaction>;
  userCollection: AngularFirestoreCollection<IUser>;
  monthsCollection: AngularFirestoreCollection;
  categoriesCollection: AngularFirestoreCollection;
  monthYear = new BehaviorSubject<string>("082018"); //TODO: Get current month
  categories = new BehaviorSubject<ICategory[]>([{id: "", name: "", keywords: [], budgeted: null}])

  constructor(private afs: AngularFirestore) {
    this.transactionCollection = this.afs.collection('dataTransactions');
    this.userCollection = this.afs.collection('users');
    this.monthsCollection = this.afs.collection('monthsPK');

    this.monthYear.subscribe(m => {
      this.categoriesCollection = this.afs.collection(`monthsPK/${m.replace(/\//g,"")}/categories`)

      this.categoriesCollection.snapshotChanges().subscribe(ref => {
        this.categories.next([{id: "", name: "", keywords: [], budgeted: null}]); //clear it out first
        let tmp = new Array();
        ref.forEach(a => {
          let data = a.payload.doc.data(); //TODO: should this be ICategory or are we past that?
          let id = a.payload.doc.id;
          tmp.push({ id, ...data })
          this.categories.next( tmp ); //The reason we do this funky chicken hoo-yah is to have an observable with the DOC id...valueChanges() does not do that, sadly
        })
      })

    })


  }


  //we'll want to bring the all the CRUD functions here so we validate them
  //perhaps create a pseudokey for the transactions
}
