import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentChangeAction } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { ITransaction, ICategory, IDocumentAction, documentActionType, editorActionType, collectionType, saveState } from './dataTypes';
import { BehaviorSubject, Subscription } from '../../../node_modules/rxjs';
import {default as _rollupMoment} from 'moment';
import firestore from 'firebase/compat/app';
const moment = _rollupMoment;

export enum tAction {
  add = 1,
  update = 2
}

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private transactionCollection: AngularFirestoreCollection;
  // private userCollection: AngularFirestoreCollection<IUser>;
  private monthsCollection: AngularFirestoreCollection;
  private categoriesCollection: AngularFirestoreCollection;
  private additionalDataCollection: AngularFirestoreCollection;
  
  private monthYearSub: Subscription;
  private tranSub: Subscription;
  private catSub: Subscription;
  private monthSummarySub: Subscription;

  monthYear: BehaviorSubject<string>;
  transactions = new BehaviorSubject<ITransaction[]>([]);
  categories = new BehaviorSubject<ICategory[]>([]);
  monthSummary = new BehaviorSubject<string>('');

  // TODO: put in chrome storage (maybe?)
  actionStack: IDocumentAction[] = new Array<IDocumentAction>();
  actionStackIndex: number = 0;

  // TODO: handle errors
  // TODO: update save state for copy categories and carry balances
  saveState = new BehaviorSubject<saveState>(saveState.done);

  constructor(private afs: AngularFirestore) {
    this.init();
  }

  init() {
      // this.userCollection = this.afs.collection(this.getCollectionPath(collectionType.users));
      this.monthsCollection = this.afs.collection(this.getCollectionPath(collectionType.monthsPK));
      this.additionalDataCollection = this.afs.collection(this.getCollectionPath(collectionType.additionalData));

      const startingMY = `${moment().format('MM')}\/${moment().format('YYYY')}`;
      this.monthYear = new BehaviorSubject<string>('');
      this.monthYear.next(startingMY);

      this.monthYearSub = this.monthYear.subscribe(m => {
        const monthPK = m.replace(/\//g, '');
        this.createMonthIfNotExists(monthPK);
        this.monthsCollection.doc(monthPK).ref.get().then(doc => {
          this.monthSummary.next(doc.data['summary']);
        });
        if (this.monthSummarySub) { this.monthSummarySub.unsubscribe(); }
        this.monthSummarySub = this.monthsCollection.doc(monthPK).snapshotChanges().subscribe(d => {
          this.monthSummary.next(d.payload.data()['summary']);
        });

        this.categoriesCollection = this.afs.collection(this.getCollectionPath(collectionType.categories));
        if (this.catSub) { this.catSub.unsubscribe(); }
        this.catSub = this.categoriesCollection.snapshotChanges().subscribe(ref => this.processCategories(ref));

        this.transactionCollection = this.afs.collection(this.getCollectionPath(collectionType.transactions));
        if (this.tranSub) { this.tranSub.unsubscribe(); }
        this.tranSub = this.transactionCollection.snapshotChanges().subscribe(actions => this.processTransactions(actions));
    });
  }

  processTransactions(actions:DocumentChangeAction<firestore.firestore.DocumentData>[]) {
    const tmp = new Array();
      actions.map(a => {
        const data = <ITransaction>a.payload.doc.data();
        const id = a.payload.doc.id;
        tmp.push({ id, ...data });
    });
    this.transactions.next( tmp );
  }

  processCategories(ref:DocumentChangeAction<firestore.firestore.DocumentData>[]) {
    const tmp = new Array();
    if (ref.length === 0) { this.categories.next([]); }
    ref.forEach(a => {
      const data = a.payload.doc.data();
      const id = a.payload.doc.id;
      tmp.push({ id, ...data });
    });
    this.categories.next( tmp.sort((a, b) => {if (a.name > b.name) { return 1; } else {return -1; }}) );
    // The reason we do snapshot is to get the doc id...valueChanges() does not do that, sadly
  }

  createMonthIfNotExists(monthPK:string) {
    this.monthsCollection.ref.doc(monthPK).get().then(snap => {
      if (!snap.exists) {
        this.monthsCollection.ref.doc(monthPK).set({'name': monthPK, 'summary': ''});
      }
      else {
        if (snap.data()['summary'] === undefined) {
          this.monthsCollection.ref.doc(monthPK).update({'summary': ''});
        }
      }
    });
  }

  copyCagetories(copyToPK) {
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

  async updateDocument(id: string, collection: collectionType, data: firebase.firestore.DocumentData, monthPK?:string) {
    delete data['id']; // shouldn't ever need ID in document data
    delete data['changeAction']; // shouldn't ever need changeAction in document data
    let documentAction: IDocumentAction = {
      id: id,
      collectionPath: this.getCollectionPath(collection, monthPK),
      action: documentActionType.update,
      undoAction: documentActionType.update,
      previousData: null,
      newData: data
    };
    await this.processAction(documentAction, editorActionType.initial);
  }

  async deleteDocument(obj:Object, collection: collectionType) {
    var prevData = {};
    Object.keys(obj).forEach((k: string) => prevData[k] = obj[k]);
    let docId:string = prevData['id'];
    delete prevData['id'];
    delete prevData['changeAction']; // shouldn't ever need changeAction in document data
    let documentAction: IDocumentAction = {
      id: docId,
      collectionPath: this.getCollectionPath(collection),
      action: documentActionType.remove,
      undoAction: documentActionType.add,
      previousData: prevData,
      newData: null
    };
    this.processAction(documentAction, editorActionType.initial);
  }

  async addDocument(data: firebase.firestore.DocumentData, collection: collectionType, monthPK?:string) {
    delete data['id']; // No id should be present on a true add (we could have one from an undo or redo but that will be handled properly)
    delete data['changeAction']; // shouldn't ever need changeAction in document data
    let documentAction: IDocumentAction = {
      id: "",
      collectionPath: this.getCollectionPath(collection, monthPK),
      action: documentActionType.add,
      undoAction: documentActionType.remove,
      previousData: null,
      newData: data
    };
    this.processAction(documentAction, editorActionType.initial);
  }

  async redo() {
    this.processAction(this.actionStack[this.actionStackIndex - 1], editorActionType.redo);
  }

  async undo() {
    this.processAction(this.actionStack[this.actionStackIndex], editorActionType.undo);
  }

  async getQuerySnapshot(
    collection: collectionType, 
    whereColumn: string, whereOp: firestore.firestore.WhereFilterOp, 
    value: any): Promise<firestore.firestore.QuerySnapshot> {
      var snap = await this.afs.collection(this.getCollectionPath(collection)).ref.where(whereColumn, whereOp, value).get();
      return snap;
  }

  private async processAction(documentAction: IDocumentAction, action: editorActionType) {
    this.saveState.next(saveState.saving);
    try {
      var actionToPerform: documentActionType;
      var dataToUse: firebase.firestore.DocumentData;
      switch (action) {
        case editorActionType.initial:
        case editorActionType.redo: {
          actionToPerform = documentAction.action;
          dataToUse = documentAction.newData;
          break;
        }
        case editorActionType.undo: {
          actionToPerform = documentAction.undoAction;
          dataToUse = documentAction.previousData;
          break;
        }
      }

      switch (actionToPerform) {
        case documentActionType.add: {
          let doc: firebase.firestore.DocumentReference;
          if (documentAction.id) {
            doc = this.afs.collection(documentAction.collectionPath).doc(documentAction.id).ref;
          } else {
            doc = this.afs.collection(documentAction.collectionPath).ref.doc();
            documentAction.id = doc.id;
          }
          await doc.set(dataToUse);
          console.log('Document added');
          break;
        }
        case documentActionType.remove: {
          var doc = this.afs.collection(documentAction.collectionPath).doc(documentAction.id).ref;
          await doc.delete();
          console.log('Document removed');
          break;
        }
        case documentActionType.update: {
          let doc = this.afs.collection(documentAction.collectionPath).doc(documentAction.id).ref;
          if (action == editorActionType.initial) {
            var snap = await doc.get();
            documentAction.previousData = {};
            Object.keys(dataToUse).map(k => documentAction.previousData[k] = snap.data()[k]);
          }
          await doc.update(dataToUse);
          console.log('Document updated');
          break;
        }
        case documentActionType.set: {
          let doc = this.afs.collection(documentAction.collectionPath).doc(documentAction.id).ref;
          if (action == editorActionType.initial) {
            var snap = await doc.get();
            documentAction.previousData = snap.data;
          }
          await doc.update(dataToUse);
          console.log('Document set');
          break;
        }
      }

      switch (action) {
        case editorActionType.initial: {
          this.actionStack.splice(0, this.actionStackIndex);
          this.actionStackIndex = 0;
          this.actionStack.unshift(documentAction);
          break;
        }
        case editorActionType.redo: {
          this.actionStackIndex -= 1;
          break;
        }
        case editorActionType.undo: {
          this.actionStackIndex += 1;
          break;
        }
      }
    } catch (error) {
      this.saveState.next(saveState.error);
      console.log(error);
    }
    this.saveState.next(saveState.done);
  }

  signOut() {
    this.tranSub.unsubscribe();
    this.catSub.unsubscribe();
    this.transactions.next([]);
    this.categories.next([]);
    console.log('Signed out');
  }

  signIn() {
    this.init()
  }

  checkIfTransactionExists(monthYear:string, desc:string): Promise<any> {
    const tmpColl = this.afs.collection(`monthsPK/${monthYear}/transactions`);
    return tmpColl.ref.where('description', '==', desc).get();
  }

  getMonthPKValue():string {
    return this.monthYear.getValue().replace(/\//g, '');
  }

  getMonthYearValue():string {
    return this.monthYear.getValue();
  }

  addNextMonthYear(value:string) {
    this.monthYear.next(value);
  }

  getMonthPKFromMoment(dt:_rollupMoment.Moment):string {
    return `${dt.format('MM')}${dt.format('YYYY')}`
  }

  getCollectionPath(collection:collectionType, monthPK?:string):string {
    if ([collectionType.transactions, collectionType.categories].includes(collection)) {
      return `${collectionType.monthsPK}/${monthPK ?? this.getMonthPKValue()}/${collection}`
    } else {
      return collection;
    }
  }

  getSaveState():string {
    return saveState[this.saveState.getValue()];
  }

  getSaveStatusDescription():string {
    switch (this.saveState.getValue()) {
      case saveState.saving:
        return 'Saving changes...'
        break;
      case saveState.done:
        return 'All changes saved'
        break;
      case saveState.error:
        return 'Error Saving!'
        break;
      default:
        return '';
        break;
    }
  }

  async getBalances() {
    let doc = await this.additionalDataCollection.doc('balances').ref.get();
    let array = [];
    for (let account in doc.data()) {
        let item = {};
        item['key'] = account;
        item['value'] = doc.data()[account];
        array.push(item);
    }
    return array;
  }

  async getTransactionsForEdit(selectedTrans:ITransaction):Promise<ITransaction[]> {
    let modalData:ITransaction[] = new Array<ITransaction>();
    if (selectedTrans.xId != null) {
      let snap = await this.transactionCollection.ref.where("xId","==",selectedTrans.xId).get();
      if (snap.docs.length > 0) {
        snap.docs
        .sort((a, b) => a.data()["xIndex"] - b.data()["xIndex"])
        .map(doc => {
          const id = doc.id;
          let trans:ITransaction = <ITransaction>doc.data();
          trans.id = doc.id;
          modalData.push(trans);
        });
      }
    }
    else {
      modalData  = [Object.assign({}, selectedTrans)];
    }
    return modalData;
  }
}
