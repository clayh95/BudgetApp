import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { ITransaction, IUser, ICategory } from './dataTypes';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  transactionCollection: AngularFirestoreCollection<ITransaction>;
  userCollection: AngularFirestoreCollection<IUser>;
  categoryCollection: AngularFirestoreCollection<ICategory>

  constructor(private afs: AngularFirestore) {
    this.transactionCollection = this.afs.collection('dataTransactions');
    this.userCollection = this.afs.collection('users');
    this.categoryCollection = this.afs.collection('categories');
  }

  //we'll want to bring the all the CRUD functions here so we validate them
  //perhaps create a pseudokey for the transactions
}
