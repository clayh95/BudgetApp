import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { ITransaction, IUser, ICategory } from './dataTypes';
import { ObserveOnSubscriber } from '../../../node_modules/rxjs/internal/operators/observeOn';
import { Observable, BehaviorSubject, Subscription } from '../../../node_modules/rxjs';
import { map, tap } from '../../../node_modules/rxjs/operators';
import {default as _rollupMoment, Moment} from 'moment';
import { COMMON_DIRECTIVES } from '../../../node_modules/@angular/common/src/directives';
const moment = _rollupMoment

export enum tAction {
  add = 1,
  update = 2
}

@Injectable({
  providedIn: 'root'
})
export class DbService {
  transactionCollection: AngularFirestoreCollection;
  tmpColl: AngularFirestoreCollection;
  userCollection: AngularFirestoreCollection<IUser>;
  monthsCollection: AngularFirestoreCollection;
  categoriesCollection: AngularFirestoreCollection;
  monthYear: BehaviorSubject<string>
  transactions = new BehaviorSubject<ITransaction[]>([])
  tranSub: Subscription;
  categories = new BehaviorSubject<ICategory[]>([])

  constructor(private afs: AngularFirestore) {
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
        console.log(`Categories - read ${ref.length} docs`)
        let tmp = new Array();
        if (ref.length == 0) this.categories.next([])
        ref.forEach(a => {
          let data = a.payload.doc.data(); //TODO: should this be ICategory or are we past that?
          let id = a.payload.doc.id;
          tmp.push({ id, ...data })
      })
        this.categories.next( tmp.sort((a, b) => {if (a.name > b.name) { return 1} else {return -1}}) ); //The reason we do snapshot is to get the doc id...valueChanges() does not do that, sadly
      })

      //not sure if i'm doing this quite right...if you change the monthyear it doesn't fire this until a value is changed
      this.transactionCollection = this.afs.collection(`monthsPK/${monthPK}/transactions`)
      this.tranSub = this.transactionCollection.snapshotChanges().subscribe(actions => this.processTransactions(actions))
    })
  }

  processTransactions(actions) {
    console.log(`Transactions - read ${actions.length} docs`)
    let tmp = new Array();
      actions.map(a => {
        let data = <ITransaction>a.payload.doc.data();
        let id = a.payload.doc.id;
        tmp.push({ id, ...data })
    })
    this.transactions.next( tmp );
  }

  CreateMonthIfNotExists(monthPK) {
    this.monthsCollection.ref.doc(monthPK).get().then(snap => {
      if (!snap.exists) {
        this.monthsCollection.ref.doc(monthPK).set({'name': monthPK});
        this.monthsCollection.doc(monthPK).ref.collection('categories').doc().set({})
      }
    })
  }

  CopyCagetories(copyToPK) {
    let copyColl = this.categoriesCollection.ref;
    let numCopied: number = 0;
    copyColl.get().then(docs => {
    console.log(`Copy Categories - read ${docs.docs.length} docs`)
    docs.forEach(doc => {
      let newCat = this.monthsCollection.doc(copyToPK).ref.collection('categories').doc();
      newCat.set(doc.data())
      numCopied ++;
    })
    })
  }

  AddOrUpdateTransaction(data, action) {
    let mPK = moment(data.date).format('MMYYYY')
    this.tmpColl = this.afs.collection(`monthsPK/${mPK}/transactions`)
    let toDelete:firebase.firestore.DocumentReference
    if (mPK != this.monthYear.getValue().replace(/\//g,"")) {
      this.CreateMonthIfNotExists(mPK)
      if (data.id) { toDelete = this.transactionCollection.ref.doc(data.id) }
      action = tAction.add;
      this.tranSub.unsubscribe() //doing this so we don't get weird changes for a moment
    }
    let newDocRef:firebase.firestore.DocumentReference;
    if (action == tAction.add) {
      newDocRef = this.tmpColl.ref.doc();
    }
    else {
      newDocRef = this.tmpColl.doc(data.id).ref
    }
    if (toDelete) {
      toDelete.delete().then(() => {console.log('Document removed')})
    }
    newDocRef.set({date: data.date, description: data.description, amount: data.amount, notes:data.notes, category: data.category}) //Enumerating all the fields to add the ID property
    //if not subscribed...
    this.tranSub = this.transactionCollection.snapshotChanges().subscribe(actions => this.processTransactions(actions))
  }

  signOut() {
    this.monthYear.unsubscribe();
    this.transactions.next([]);
    this.categories.next([]);
    console.log('signed out');
  }


  //we'll want to bring the all the CRUD functions here so we validate them
  //perhaps create a pseudokey for the transactions
}


  // let dt = new Date(a.payload.doc.data().date).valueOf();
  // let d = new Date(`${m.split('/')[0]}/01/${m.split('/')[1]}`)
  // if (dt >= new Date(d.getFullYear(), d.getMonth(), 1).valueOf() && dt <= new Date(d.getFullYear(), d.getMonth() + 1, 0).valueOf())