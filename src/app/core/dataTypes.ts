export interface ITransaction {
    id: string;
    date: string;
    amount: string;
    description: string;
    category: string;
    notes?: string;
    status?: string;
    changeAction?: string;
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
}


