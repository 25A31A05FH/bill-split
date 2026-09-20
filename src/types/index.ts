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

  // Group this expense belongs to
  groupId?: string;

  // Expense details
  location?: string;
  receiptUrl?: string;

  // Original expense information
  paidBy?: User;
  split?: Partial<User>[];

  // Who actually contributed money
  contributions?: ExpenseContribution[];

  // Who participated in / owes a share of this expense
  participants?: string[];
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

  // Roommates who belong to this group
  memberIds: string[];
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