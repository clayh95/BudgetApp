import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  QuerySnapshot,
  Unsubscribe,
  WhereFilterOp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { ITransaction, ICategory, IDocumentAction, documentActionType, editorActionType, collectionType, saveState } from './dataTypes';
import { BehaviorSubject, Subscription } from '../../../node_modules/rxjs';
import {default as _rollupMoment} from 'moment';
const moment = _rollupMoment;

export enum tAction {
  add = 1,
  update = 2
}

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private transactionCollection: CollectionReference<DocumentData>;
  // private userCollection: CollectionReference<DocumentData>;
  private monthsCollection: CollectionReference<DocumentData>;
  private categoriesCollection: CollectionReference<DocumentData>;
  private additionalDataCollection: CollectionReference<DocumentData>;
  
  private monthYearSub: Subscription;
  private tranSub: Unsubscribe;
  private catSub: Unsubscribe;
  private monthSummarySub: Unsubscribe;

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

  constructor(private firestore: Firestore) {
    this.init();
  }

  private collection(path: string) {
    return collection(this.firestore, path);
  }

  init() {
      // this.userCollection = this.collection(this.getCollectionPath(collectionType.users));
      this.monthsCollection = this.collection(this.getCollectionPath(collectionType.monthsPK));
      this.additionalDataCollection = this.collection(this.getCollectionPath(collectionType.additionalData));

      const startingMY = `${moment().format('MM')}\/${moment().format('YYYY')}`;
      this.monthYear = new BehaviorSubject<string>('');
      this.monthYear.next(startingMY);

      this.monthYearSub = this.monthYear.subscribe(m => {
        const monthPK = m.replace(/\//g, '');
        this.createMonthIfNotExists(monthPK);
        const monthDocRef = doc(this.monthsCollection, monthPK);
        getDoc(monthDocRef).then(snap => {
          this.monthSummary.next(snap.data()?.['summary']);
        });
        if (this.monthSummarySub) { this.monthSummarySub(); }
        this.monthSummarySub = onSnapshot(monthDocRef, snap => {
          this.monthSummary.next(snap.data()?.['summary']);
        });

        this.categoriesCollection = this.collection(this.getCollectionPath(collectionType.categories));
        if (this.catSub) { this.catSub(); }
        this.catSub = onSnapshot(this.categoriesCollection, snap => this.processCategories(snap));

        this.transactionCollection = this.collection(this.getCollectionPath(collectionType.transactions));
        if (this.tranSub) { this.tranSub(); }
        this.tranSub = onSnapshot(this.transactionCollection, snap => this.processTransactions(snap));
    });
  }

  processTransactions(snapshot: QuerySnapshot<DocumentData>) {
    const tmp = new Array();
    snapshot.docs.map(docSnap => {
        const data = <ITransaction>docSnap.data();
        const id = docSnap.id;
        tmp.push({ id, ...data });
    });
    this.transactions.next( tmp );
  }

  processCategories(snapshot: QuerySnapshot<DocumentData>) {
    const tmp = new Array();
    if (snapshot.empty) { this.categories.next([]); }
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;
      tmp.push({ id, ...data });
    });
    this.categories.next( tmp.sort((a, b) => {if (a.name > b.name) { return 1; } else {return -1; }}) );
    // The reason we do snapshot is to get the doc id...valueChanges() does not do that, sadly
  }

  createMonthIfNotExists(monthPK:string) {
    const monthDocRef = doc(this.monthsCollection, monthPK);
    getDoc(monthDocRef).then(snap => {
      if (!snap.exists()) {
        setDoc(monthDocRef, {'name': monthPK, 'summary': ''});
      }
      else if (snap.data()?.['summary'] === undefined) {
        updateDoc(monthDocRef, {'summary': ''});
      }
    });
  }

  copyCagetories(copyToPK) {
    let numCopied = 0;
    getDocs(this.categoriesCollection).then(snapshot => {
      console.log(`Copy Categories - read ${snapshot.docs.length} docs`);
      const newCatsCollection = collection(doc(this.monthsCollection, copyToPK), 'categories');
      snapshot.docs.forEach(docSnap => {
        const newCatRef = doc(newCatsCollection);
        setDoc(newCatRef, docSnap.data());
        numCopied ++;
      });
    });
  }

  async updateDocument(id: string, collection: collectionType, data: DocumentData, monthPK?:string) {
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

  async addDocument(data: DocumentData, collection: collectionType, monthPK?:string) {
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
    whereColumn: string, whereOp: WhereFilterOp, 
    value: any): Promise<QuerySnapshot<DocumentData>> {
      const q = query(this.collection(this.getCollectionPath(collection)), where(whereColumn, whereOp, value));
      return await getDocs(q);
  }

  private async processAction(documentAction: IDocumentAction, action: editorActionType) {
    this.saveState.next(saveState.saving);
    try {
      var actionToPerform: documentActionType;
      var dataToUse: DocumentData;
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
          let docRef: DocumentReference<DocumentData>;
          if (documentAction.id) {
            docRef = doc(this.collection(documentAction.collectionPath), documentAction.id);
          } else {
            docRef = doc(this.collection(documentAction.collectionPath));
            documentAction.id = docRef.id;
          }
          await setDoc(docRef, dataToUse);
          console.log('Document added');
          break;
        }
        case documentActionType.remove: {
          const docRef = doc(this.collection(documentAction.collectionPath), documentAction.id);
          await deleteDoc(docRef);
          console.log('Document removed');
          break;
        }
        case documentActionType.update: {
          const docRef = doc(this.collection(documentAction.collectionPath), documentAction.id);
          if (action == editorActionType.initial) {
            var snap = await getDoc(docRef);
            documentAction.previousData = {};
            Object.keys(dataToUse).map(k => documentAction.previousData[k] = snap.data()?.[k]);
          }
          await updateDoc(docRef, dataToUse);
          console.log('Document updated');
          break;
        }
        case documentActionType.set: {
          const docRef = doc(this.collection(documentAction.collectionPath), documentAction.id);
          if (action == editorActionType.initial) {
            var snap = await getDoc(docRef);
            documentAction.previousData = snap.data();
          }
          await updateDoc(docRef, dataToUse);
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
    if (this.tranSub) { this.tranSub(); }
    if (this.catSub) { this.catSub(); }
    this.transactions.next([]);
    this.categories.next([]);
    console.log('Signed out');
  }

  signIn() {
    this.init()
  }

  checkIfTransactionExists(monthYear:string, desc:string): Promise<any> {
    const tmpColl = this.collection(`monthsPK/${monthYear}/transactions`);
    const q = query(tmpColl, where('description', '==', desc));
    return getDocs(q);
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
    let docSnap = await getDoc(doc(this.additionalDataCollection, 'balances'));
    let array = [];
    const data = docSnap.data() ?? {};
    for (let account in data) {
        let item = {};
        item['key'] = account;
        item['value'] = data[account];
        array.push(item);
    }
    return array;
  }

  async getTransactionsForEdit(selectedTrans:ITransaction):Promise<ITransaction[]> {
    let modalData:ITransaction[] = new Array<ITransaction>();
    if (selectedTrans.xId != null) {
      const q = query(this.transactionCollection, where("xId","==",selectedTrans.xId));
      let snap = await getDocs(q);
      if (snap.docs.length > 0) {
        snap.docs
        .sort((a, b) => a.data()["xIndex"] - b.data()["xIndex"])
        .map(doc => {
          const id = doc.id;
          let trans:ITransaction = <ITransaction>doc.data();
          trans.id = id;
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
