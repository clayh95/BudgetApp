export interface ITransaction {
    date: string;
    amount: string;
    description: string;
    category: string;
}

export interface IUser { 
    uid: string;
    email: string;
    displayName: string;
}

export interface ICategory {
    id: string;
    category: string,
    keyword: string
}


