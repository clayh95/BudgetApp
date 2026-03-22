import { Injectable } from '@angular/core';
import { Firestore, collectionData, docData } from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  QuerySnapshot,
  WhereFilterOp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { ITransaction, ICategory, IDocumentAction, documentActionType, editorActionType, collectionType, saveState } from './dataTypes';
import { parseMoney, IVendorLogoRule, DEFAULT_VENDOR_MAPPINGS } from './utilities';
import { BehaviorSubject, Subscription } from 'rxjs';
import {default as _rollupMoment} from 'moment';
const moment = _rollupMoment;

export enum tAction {
  add = 1,
  update = 2
}

export interface IDashboardPreferences {
  watchedCategoryKeys: string[];
  watchedVendorKeys: string[];
  updatedAt?: string;
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
  private tranSub: Subscription;
  private catSub: Subscription;
  private monthSummarySub: Subscription;
  private dashboardPreferencesSub: Subscription | null = null;
  private vendorMappingsSub: Subscription | null = null;
  private authStateSub: Subscription;
  private dashboardPreferencesUid: string | null = null;

  monthYear: BehaviorSubject<string>;
  transactions = new BehaviorSubject<ITransaction[]>([]);
  categories = new BehaviorSubject<ICategory[]>([]);
  monthSummary = new BehaviorSubject<string>('');
  dashboardPreferences = new BehaviorSubject<IDashboardPreferences>({ watchedCategoryKeys: [], watchedVendorKeys: [] });
  vendorMappings = new BehaviorSubject<IVendorLogoRule[]>(DEFAULT_VENDOR_MAPPINGS);

  // TODO: put in chrome storage (maybe?)
  actionStack: IDocumentAction[] = new Array<IDocumentAction>();
  actionStackIndex: number = 0;

  // TODO: handle errors
  // TODO: update save state for copy categories and carry balances
  saveState = new BehaviorSubject<saveState>(saveState.done);

  constructor(private firestore: Firestore, private auth: Auth) {
    this.authStateSub = authState(this.auth).subscribe(user => {
      this.handleAuthStateChange(user?.uid ?? null);
    });
    this.init();
  }

  private collection(path: string) {
    return collection(this.firestore, path);
  }

  init() {
      // this.userCollection = this.collection(this.getCollectionPath(collectionType.users));
      this.monthsCollection = this.collection(this.getCollectionPath(collectionType.monthsPK));
      this.additionalDataCollection = this.collection(this.getCollectionPath(collectionType.additionalData));
      if (this.vendorMappingsSub) {
        this.vendorMappingsSub.unsubscribe();
      }
      this.vendorMappingsSub = docData(this.getVendorMappingsDocRef()).subscribe(snap => {
        this.vendorMappings.next(this.parseVendorMappings(snap));
      });

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
        if (this.monthSummarySub) { this.monthSummarySub.unsubscribe(); }
        this.monthSummarySub = docData(monthDocRef).subscribe(snap => {
          this.monthSummary.next((snap as any)?.['summary']);
        });

        this.categoriesCollection = this.collection(this.getCollectionPath(collectionType.categories));
        if (this.catSub) { this.catSub.unsubscribe(); }
        this.catSub = collectionData(this.categoriesCollection, { idField: 'id' })
          .subscribe(data => this.processCategories(data as DocumentData[]));

        this.transactionCollection = this.collection(this.getCollectionPath(collectionType.transactions));
        if (this.tranSub) { this.tranSub.unsubscribe(); }
        this.tranSub = collectionData(this.transactionCollection, { idField: 'id' })
          .subscribe(data => this.processTransactions(data as DocumentData[]));
    });

  }

  processTransactions(data: DocumentData[]) {
    const tmp = data.map(d => {
      const parsedAmount = parseMoney((d as any).amount);
      (d as any).amount = parsedAmount !== null ? parsedAmount : 0;
      return d as ITransaction;
    });
    this.transactions.next(tmp);
  }

  processCategories(data: DocumentData[]) {
    if (!data || data.length === 0) { this.categories.next([]); return; }
    const tmp = data.map(d => {
      const parsedBudgeted = parseMoney((d as any).budgeted);
      (d as any).budgeted = parsedBudgeted !== null ? parsedBudgeted : 0;
      return d as ICategory;
    });
    this.categories.next(tmp.sort((a, b) => {if (a.name > b.name) { return 1; } else {return -1; }}));
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
    this.normalizeMoneyFields(collection, data);
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
    this.normalizeMoneyFields(collection, data);
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
    if (this.tranSub) { this.tranSub.unsubscribe(); }
    if (this.catSub) { this.catSub.unsubscribe(); }
    if (this.dashboardPreferencesSub) { this.dashboardPreferencesSub.unsubscribe(); }
    if (this.monthYearSub) { this.monthYearSub.unsubscribe(); }
    if (this.monthSummarySub) { this.monthSummarySub.unsubscribe(); }
    this.dashboardPreferencesSub = null;
    this.monthYearSub = null;
    this.monthSummarySub = null;
    this.dashboardPreferencesUid = null;
      this.dashboardPreferences.next({ watchedCategoryKeys: [], watchedVendorKeys: [] });
    this.transactions.next([]);
    this.categories.next([]);
    console.log('Signed out');
  }

  signIn() {
    this.init();
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

  private normalizeMoneyFields(collection: collectionType, data: DocumentData) {
    if (collection === collectionType.transactions && data?.amount !== undefined) {
      const parsed = parseMoney(data.amount);
      if (parsed !== null) {
        data.amount = parsed;
      }
    }
    if (collection === collectionType.categories && data?.budgeted !== undefined) {
      const parsed = parseMoney(data.budgeted);
      if (parsed !== null) {
        data.budgeted = parsed;
      }
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

  private getCurrentUserUid(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  private normalizeCategoryKey(name: string): string {
    return (name || '').trim().toLowerCase();
  }

  private getDashboardPreferencesDocRef(uid: string) {
    return doc(this.firestore, `users/${uid}/userPreferences/dashboardPreferences`);
  }

  private parseDashboardPreferences(data: any): IDashboardPreferences {
    const keys = Array.isArray(data?.['watchedCategoryKeys'])
      ? (data?.['watchedCategoryKeys'] as any[])
        .map(k => this.normalizeCategoryKey(`${k}`))
        .filter(k => k.length > 0)
      : [];
    const watchedVendorKeys = Array.isArray(data?.['watchedVendorKeys'])
      ? (data?.['watchedVendorKeys'] as any[])
        .map(k => this.normalizeVendorKey(`${k}`))
        .filter(k => k.length > 0)
      : [];
    return {
      watchedCategoryKeys: Array.from(new Set(keys)),
      watchedVendorKeys: Array.from(new Set(watchedVendorKeys))
    };
  }

  private parseVendorMappings(data: any): IVendorLogoRule[] {
    const rawRules = Array.isArray(data?.['rules'])
      ? data?.['rules'] as any[]
      : null;
    if (!rawRules || rawRules.length === 0) {
      return DEFAULT_VENDOR_MAPPINGS.slice();
    }
    const normalizedRules = rawRules
      .map((rule: any) => {
        const pattern = `${rule?.['pattern'] || ''}`.trim();
        const vendorName = `${rule?.['vendorName'] || ''}`.trim();
        const logoUrl = `${rule?.['logoUrl'] || ''}`.trim();
        if (!pattern || !vendorName || !logoUrl) {
          return null;
        }
        return { pattern, vendorName, logoUrl };
      })
      .filter((rule): rule is IVendorLogoRule => !!rule);
    return normalizedRules.length > 0 ? normalizedRules : DEFAULT_VENDOR_MAPPINGS.slice();
  }

  private handleAuthStateChange(uid: string | null) {
    if (!uid) {
      this.dashboardPreferences.next({ watchedCategoryKeys: [], watchedVendorKeys: [] });
      if (this.dashboardPreferencesSub) {
        this.dashboardPreferencesSub.unsubscribe();
        this.dashboardPreferencesSub = null;
      }
      this.dashboardPreferencesUid = null;
      return;
    }
    if (this.dashboardPreferencesSub && this.dashboardPreferencesUid === uid) {
      return;
    }
    if (this.dashboardPreferencesSub) {
      this.dashboardPreferencesSub.unsubscribe();
    }
    this.dashboardPreferencesUid = uid;
    this.dashboardPreferencesSub = docData(this.getDashboardPreferencesDocRef(uid)).subscribe(snap => {
      this.dashboardPreferences.next(this.parseDashboardPreferences(snap));
    });
  }

  async saveDashboardPreferences(preferences: IDashboardPreferences): Promise<void> {
    const uid = this.getCurrentUserUid();
    if (!uid) { return; }
    const watchedCategoryKeys = Array.from(
      new Set((preferences?.watchedCategoryKeys || [])
        .map(k => this.normalizeCategoryKey(k))
        .filter(k => k.length > 0))
    );
    const watchedVendorKeys = Array.from(
      new Set((preferences?.watchedVendorKeys || [])
        .map(k => this.normalizeVendorKey(k))
        .filter(k => k.length > 0))
    );
    await setDoc(
      this.getDashboardPreferencesDocRef(uid),
      { watchedCategoryKeys, watchedVendorKeys, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  private normalizeVendorKey(name: string): string {
    return (name || '').trim().toLowerCase();
  }

  private getVendorMappingsDocRef() {
    return doc(this.firestore, 'sharedData/vendorMappings');
  }

  async saveVendorMappings(vendorMappings: IVendorLogoRule[]): Promise<void> {
    const normalizedRules: IVendorLogoRule[] = vendorMappings
      .map(rule => ({
        pattern: `${rule?.pattern || ''}`.trim(),
        vendorName: `${rule?.vendorName || ''}`.trim(),
        logoUrl: `${rule?.logoUrl || ''}`.trim()
      }))
      .filter(rule => rule.pattern.length > 0 && rule.vendorName.length > 0 && rule.logoUrl.length > 0);
    await setDoc(
      this.getVendorMappingsDocRef(),
      { rules: normalizedRules, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }
}
