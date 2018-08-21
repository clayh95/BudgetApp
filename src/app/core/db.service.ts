import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { ITransaction, IUser, ICategory } from './dataTypes';
import { ObserveOnSubscriber } from '../../../node_modules/rxjs/internal/operators/observeOn';
import { Observable, BehaviorSubject } from '../../../node_modules/rxjs';
import { map } from '../../../node_modules/rxjs/operators';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment

@Injectable({
  providedIn: 'root'
})
export class DbService {
  transactionCollection: AngularFirestoreCollection<ITransaction>;
  userCollection: AngularFirestoreCollection<IUser>;
  monthsCollection: AngularFirestoreCollection;
  categoriesCollection: AngularFirestoreCollection;
  monthYear: BehaviorSubject<string>
  categories = new BehaviorSubject<ICategory[]>([])

  constructor(private afs: AngularFirestore) {
    this.transactionCollection = this.afs.collection('dataTransactions');
    this.userCollection = this.afs.collection('users');
    this.monthsCollection = this.afs.collection('monthsPK');

    let startingMY = `${moment().format('MM')}\/${moment().format('YYYY')}`
    this.monthYear = new BehaviorSubject<string>("");
    this.monthYear.next(startingMY);

    this.monthYear.subscribe(m => {
      let monthPK = m.replace(/\//g,"")
      this.CreateMonthIfNotExists(monthPK) //TODO: do we need await?
      this.categoriesCollection = this.afs.collection(`monthsPK/${monthPK}/categories`)
      this.categoriesCollection.snapshotChanges().subscribe(ref => {
        let tmp = new Array();
        if (ref.length == 0) this.categories.next([])
        ref.forEach(a => {
          let data = a.payload.doc.data(); //TODO: should this be ICategory or are we past that?
          let id = a.payload.doc.id;
          tmp.push({ id, ...data })
          this.categories.next( tmp ); //The reason we do snapshot is to get the doc id...valueChanges() does not do that, sadly
        })
      })
    })
  }

  CreateMonthIfNotExists(monthPK) {
    this.monthsCollection.ref.doc(monthPK).get().then(snap => {
      if (!snap.exists) {
        this.monthsCollection.ref.doc(monthPK).set({'name': monthPK});
        this.monthsCollection.doc(monthPK).ref.collection('categories').doc().set({name: ''})
      }
    })
  }

  CopyCagetories(copyToPK) {
    let copyColl = this.categoriesCollection.ref;
    let numCopied: number = 0;
    copyColl.get().then(docs => {
      docs.forEach(doc => {
        let newCat = this.monthsCollection.doc(copyToPK).ref.collection('categories').doc();
        newCat.set(doc.data())
        numCopied ++;
      })
    })
  }


  //we'll want to bring the all the CRUD functions here so we validate them
  //perhaps create a pseudokey for the transactions
}
