import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentChangeAction } from 'angularfire2/firestore';
import { ITransaction, IUser, ICategory } from './dataTypes';
import { ObserveOnSubscriber } from '../../../node_modules/rxjs/internal/operators/observeOn';
import { Observable, BehaviorSubject, Subscription } from '../../../node_modules/rxjs';
import { map, tap, subscribeOn } from '../../../node_modules/rxjs/operators';
import {default as _rollupMoment, Moment} from 'moment';
// import { initChangeDetectorIfExisting } from '../../../node_modules/@angular/core/src/render3/instructions';
const moment = _rollupMoment;

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
  monthYear: BehaviorSubject<string>;
  transactions = new BehaviorSubject<ITransaction[]>([]);
  categories = new BehaviorSubject<ICategory[]>([]);
  monthSummary = new BehaviorSubject<string>('');

  monthYearSub: Subscription;
  tranSub: Subscription;
  catSub: Subscription;
  monthSummarySub: Subscription;

  constructor(private afs: AngularFirestore) {
    this.init();
  }

  init() {
      this.userCollection = this.afs.collection('users');
      this.monthsCollection = this.afs.collection('monthsPK');

      const startingMY = `${moment().format('MM')}\/${moment().format('YYYY')}`;
      this.monthYear = new BehaviorSubject<string>('');
      this.monthYear.next(startingMY);

      this.monthYearSub = this.monthYear.subscribe(m => {
        const monthPK = m.replace(/\//g, '');
        this.CreateMonthIfNotExists(monthPK);
        this.monthsCollection.doc(monthPK).ref.get().then(doc => {
          this.monthSummary.next(doc.data['summary']);
        });
        if (this.monthSummarySub) { this.monthSummarySub.unsubscribe(); }
        this.monthSummarySub = this.monthsCollection.doc(monthPK).snapshotChanges().subscribe(d => {
          this.monthSummary.next(d.payload.data()['summary']);
        });

        this.categoriesCollection = this.afs.collection(`monthsPK/${monthPK}/categories`);
        if (this.catSub) { this.catSub.unsubscribe(); }
        this.catSub = this.categoriesCollection.snapshotChanges().subscribe(ref => this.processCategories(ref));

        this.transactionCollection = this.afs.collection(`monthsPK/${monthPK}/transactions`);
        if (this.tranSub) { this.tranSub.unsubscribe(); }
        this.tranSub = this.transactionCollection.snapshotChanges().subscribe(actions => this.processTransactions(actions));
    });
  }

  processTransactions(actions) {
    console.log(`Transactions - read ${actions.length} docs`);
    const tmp = new Array();
      actions.map(a => {
        const data = <ITransaction>a.payload.doc.data();
        const id = a.payload.doc.id;
        tmp.push({ id, ...data });
    });
    this.transactions.next( tmp );
  }

  processCategories(ref) {
    console.log(`Categories - read ${ref.length} docs`);
    const tmp = new Array();
    if (ref.length === 0) { this.categories.next([]); }
    ref.forEach(a => {
      const data = a.payload.doc.data(); // TODO: should this be ICategory or are we past that?
      const id = a.payload.doc.id;
      tmp.push({ id, ...data });
    });
    this.categories.next( tmp.sort((a, b) => {if (a.name > b.name) { return 1; } else {return -1; }}) );
    // The reason we do snapshot is to get the doc id...valueChanges() does not do that, sadly
  }

  CreateMonthIfNotExists(monthPK) {
    this.monthsCollection.ref.doc(monthPK).get().then(snap => {
      if (!snap.exists) {
        this.monthsCollection.ref.doc(monthPK).set({'name': monthPK, 'summary': ''});
        this.monthsCollection.doc(monthPK).ref.collection('categories').doc().set({});
      }
      else {
        if (snap.data()['summary'] === undefined) {
          this.monthsCollection.ref.doc(monthPK).update({'summary': ''});
        }
      }
    });
  }

  CopyCagetories(copyToPK) {
    const copyColl = this.categoriesCollection.ref;
    let numCopied = 0;
    copyColl.get().then(docs => {
      console.log(`Copy Categories - read ${docs.docs.length} docs`);
      docs.forEach(doc => {
        const newCat = this.monthsCollection.doc(copyToPK).ref.collection('categories').doc();
        newCat.set(doc.data());
        numCopied ++;
      });
    });
  }

  AddOrUpdateTransaction(data, action) {
    const mPK = moment(data.date, "MM/DD/YYYY").format('MMYYYY');
    this.tmpColl = this.afs.collection(`monthsPK/${mPK}/transactions`);
    let toDelete: firebase.firestore.DocumentReference;
    if (mPK !== this.monthYear.getValue().replace(/\//g, '')) {
      this.CreateMonthIfNotExists(mPK);
      if (data.id) { toDelete = this.transactionCollection.ref.doc(data.id); }
      action = tAction.add;
      this.tranSub.unsubscribe(); //doing this so we don't get weird changes for a moment
    }
    let newDocRef: firebase.firestore.DocumentReference;
    if (action == tAction.add) {
      newDocRef = this.tmpColl.ref.doc();
    } else {
      newDocRef = this.tmpColl.doc(data.id).ref
    }
    if (toDelete) {
      toDelete.delete().then(() => {console.log('Document removed')})
    }
    newDocRef.set({date: data.date, description: data.description, amount: data.amount, notes: data.notes, category: data.category, status: data.status}) //Enumerating all the fields to add the ID property
    //if not subscribed...
    //this seemed so wrong...there is probably some reason i will find
    // this.tranSub = this.transactionCollection.snapshotChanges().subscribe(actions => this.processTransactions(actions))
  }

  signOut() {
    this.monthYear.unsubscribe();
    this.tranSub.unsubscribe();
    this.catSub.unsubscribe();
    this.transactions.next([]);
    this.categories.next([]);
    console.log('Signed out');
  }

  signIn() {
    this.init()
  }

   CheckIfTransactionExists(monthYear, desc): Promise<any> {
    const tmpColl = this.afs.collection(`monthsPK/${monthYear}/transactions`);
    return tmpColl.ref.where('description', '==', desc).get()
  }
}
