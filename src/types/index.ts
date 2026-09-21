export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface ExpenseContribution {
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  payerId: string;
  date: Date;
  location?: string;
  receiptUrl?: string;
  paidBy?: User;
  split?: Partial<User>[];
  contributions?: ExpenseContribution[];
  participants?: string[];
  groupId?: string;
}

export interface Roommate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  paidBy?: User;
  split?: Partial<Roommate>[];
  status: 'pending' | 'paid' | 'overdue';
  groupId?: string;
}

export interface SplitGroup {
  id: string;
  name: string;
  type:
    | 'household'
    | 'entertainment'
    | 'utilities'
    | 'food'
    | 'other';
  description?: string;
  memberIds?: string[];
}

export interface Transaction {
  id: string;
  expenseId: string;
  billId?: string;
  groupId: string;
  userId: string;
  amount: number;
  date: Date;
  status: 'pending' | 'paid' | 'completed';
}

export interface Settlement {
  fromUserId: string;
  toUserId: string;
  amount: number;
}
