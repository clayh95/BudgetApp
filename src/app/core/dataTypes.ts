import * as firebase from 'firebase/app';

export interface ITransaction {
    id: string;
    date: string;
    amount: string;
    description: string;
    category: string;
    notes?: string;
    status?: string;
    changeAction?: string;
    xId?: string;
    xIndex?: number;
}

export enum ITransactionStatus {
    pending = 'Pending',
    posted = 'Posted'
}

export interface IUser {
    uid: string;
    email: string;
    displayName: string;
}

export interface ICategory {
    id: string;
    name: string;
    keywords: Array<string>;
    budgeted: number;
    spent: number;
    notes: string;
}

export interface IDocumentAction {
    id?: string;
    collectionPath: string;
    action: documentActionType;
    undoAction: documentActionType;
    previousData?: firebase.firestore.DocumentData;
    newData?: firebase.firestore.DocumentData;
}

export enum documentActionType {
    add,
    remove,
    set,
    update
}

export enum editorActionType {
    initial,
    undo,
    redo
}

export enum collectionType {
    transactions = "transactions",
    categories = "categories",
    users = "users",
    monthsPK = "monthsPK",
    additionalData = "additionalData"
}

export enum saveState {
    done,
    saving,
    error
}

export class ConfirmModalConfig {
    title: string;
    message: string;
    buttons: Array<number>;
    matIconName: string;
}

export enum ConfirmModalButtons {
    ok,
    yes,
    no,
    cancel
}

