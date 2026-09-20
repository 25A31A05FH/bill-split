import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  Expense,
  User,
  Bill,
  SplitGroup,
  Settlement,
} from '../types';

interface ExpenseContextType {
  expenses: Expense[];
  bills: Bill[];
  groups: SplitGroup[];
  users: User[];

  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (
    id: string,
    expense: Partial<Expense>
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (
    id: string,
    user: Partial<User>
  ) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  addBill: (bill: Omit<Bill, 'id'>) => Promise<void>;
  updateBill: (
    id: string,
    bill: Partial<Bill>
  ) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;

  addGroup: (
    group: Omit<SplitGroup, 'id'>
  ) => Promise<void>;
  updateGroup: (
    id: string,
    group: Partial<SplitGroup>
  ) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;

  settlements: Settlement[];
}

export const ExpenseContext = createContext<
  ExpenseContextType | undefined
>(undefined);

const initialUsers: User[] = [
  {
    id: 'u1',
    name: 'Hanish',
    email: 'hanish@example.com',
  },
  {
    id: 'u2',
    name: 'Rahul',
    email: 'rahul@example.com',
  },
  {
    id: 'u3',
    name: 'Arjun',
    email: 'arjun@example.com',
  },
  {
    id: 'u4',
    name: 'Sai',
    email: 'sai@example.com',
  },
];

/*
 * Every default group now has its own members.
 *
 * You can change these later from the Groups page.
 */
const initialGroups: SplitGroup[] = [
  {
    id: 'household',
    name: 'Household Expenses',
    type: 'household',
    description: 'Rent, cleaning, maintenance and common household costs.',
    memberIds: ['u1', 'u2', 'u3', 'u4'],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    type: 'entertainment',
    description: 'Movies, outings, games and other entertainment.',
    memberIds: ['u1', 'u2', 'u3', 'u4'],
  },
  {
    id: 'utilities',
    name: 'Utilities',
    type: 'utilities',
    description: 'Electricity, internet, water and other utilities.',
    memberIds: ['u1', 'u2', 'u3', 'u4'],
  },
  {
    id: 'food',
    name: 'Food & Groceries',
    type: 'food',
    description: 'Groceries, meals and shared food expenses.',
    memberIds: ['u1', 'u2', 'u3', 'u4'],
  },
];

export function ExpenseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * ----------------------------------------
   * EXPENSES
   * ----------------------------------------
   */

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('roommate_expenses');

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved).map((expense: Expense) => ({
        ...expense,
        date: new Date(expense.date),
      }));
    } catch {
      return [];
    }
  });

  /*
   * ----------------------------------------
   * USERS / ROOMMATES
   * ----------------------------------------
   */

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('roommate_users');

    if (!saved) {
      return initialUsers;
    }

    try {
      return JSON.parse(saved);
    } catch {
      return initialUsers;
    }
  });

  /*
   * ----------------------------------------
   * BILLS
   * ----------------------------------------
   */

  const [bills, setBills] = useState<Bill[]>([]);

  /*
   * ----------------------------------------
   * GROUPS
   * ----------------------------------------
   *
   * Groups are kept in state for now.
   * Each group contains its own memberIds.
   */

  const [groups, setGroups] =
    useState<SplitGroup[]>(initialGroups);

  /*
   * ----------------------------------------
   * PERSISTENCE
   * ----------------------------------------
   */

  useEffect(() => {
    localStorage.setItem(
      'roommate_expenses',
      JSON.stringify(expenses)
    );
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(
      'roommate_users',
      JSON.stringify(users)
    );
  }, [users]);

  /*
   * ----------------------------------------
   * EXPENSE FUNCTIONS
   * ----------------------------------------
   */

  const addExpense = async (
    expense: Omit<Expense, 'id'>
  ): Promise<void> => {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
    };

    setExpenses((prev) => [...prev, newExpense]);
  };

  const updateExpense = async (
    id: string,
    expense: Partial<Expense>
  ): Promise<void> => {
    setExpenses((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...expense }
          : item
      )
    );
  };

  const deleteExpense = async (
    id: string
  ): Promise<void> => {
    setExpenses((prev) =>
      prev.filter((expense) => expense.id !== id)
    );
  };

  /*
   * ----------------------------------------
   * ROOMMATE FUNCTIONS
   * ----------------------------------------
   */

  const addUser = async (
    user: Omit<User, 'id'>
  ): Promise<void> => {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
    };

    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = async (
    id: string,
    user: Partial<User>
  ): Promise<void> => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...user }
          : item
      )
    );
  };

  const deleteUser = async (
    id: string
  ): Promise<void> => {
    setUsers((prev) =>
      prev.filter((user) => user.id !== id)
    );
  };

  /*
   * ----------------------------------------
   * WHO OWES WHOM
   * ----------------------------------------
   *
   * For every expense:
   *
   * contribution = money actually paid
   *
   * share = expense amount / number of participants
   *
   * balance =
   * contribution - share
   *
   * Positive = person should receive money
   * Negative = person owes money
   */

  const settlements = useMemo<Settlement[]>(() => {
    const balances = new Map<string, number>();

    users.forEach((user) => {
      balances.set(user.id, 0);
    });

    expenses.forEach((expense) => {
      /*
       * New expenses always contain participants.
       *
       * The fallback is kept for older expenses already
       * stored in localStorage before participants existed.
       */
      const participants =
        expense.participants?.length
          ? expense.participants
          : users.map((user) => user.id);

      if (participants.length === 0) {
        return;
      }

      const shareInPaise = Math.round(
        (expense.amount * 100) /
          participants.length
      );

      /*
       * Add what each participant owes.
       */
      participants.forEach((userId, index) => {
        /*
         * Handle rounding by giving the final
         * participant the remaining paise.
         */
        const participantShare =
          index === participants.length - 1
            ? Math.round(expense.amount * 100) -
              shareInPaise *
                (participants.length - 1)
            : shareInPaise;

        const current =
          balances.get(userId) ?? 0;

        balances.set(
          userId,
          current - participantShare
        );
      });

      /*
       * Add what each person actually contributed.
       */
      expense.contributions?.forEach(
        (contribution) => {
          const current =
            balances.get(contribution.userId) ?? 0;

          balances.set(
            contribution.userId,
            current +
              Math.round(
                contribution.amount * 100
              )
          );
        }
      );
    });

    /*
     * Creditors receive money.
     */
    const creditors = Array.from(
      balances.entries()
    )
      .filter(([, balance]) => balance > 0)
      .map(([userId, balance]) => ({
        userId,
        balance,
      }))
      .sort((a, b) => b.balance - a.balance);

    /*
     * Debtors pay money.
     */
    const debtors = Array.from(
      balances.entries()
    )
      .filter(([, balance]) => balance < 0)
      .map(([userId, balance]) => ({
        userId,
        balance: Math.abs(balance),
      }))
      .sort((a, b) => b.balance - a.balance);

    const result: Settlement[] = [];

    let creditorIndex = 0;
    let debtorIndex = 0;

    while (
      creditorIndex < creditors.length &&
      debtorIndex < debtors.length
    ) {
      const creditor =
        creditors[creditorIndex];

      const debtor =
        debtors[debtorIndex];

      const payment = Math.min(
        creditor.balance,
        debtor.balance
      );

      if (payment > 0) {
        result.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amount: payment / 100,
        });
      }

      creditor.balance -= payment;
      debtor.balance -= payment;

      if (creditor.balance === 0) {
        creditorIndex++;
      }

      if (debtor.balance === 0) {
        debtorIndex++;
      }
    }

    return result;
  }, [expenses, users]);

  /*
   * ----------------------------------------
   * BILL FUNCTIONS
   * ----------------------------------------
   */

  const addBill = async (
    bill: Omit<Bill, 'id'>
  ): Promise<void> => {
    const newBill: Bill = {
      ...bill,
      id: crypto.randomUUID(),
    };

    setBills((prev) => [...prev, newBill]);
  };

  const updateBill = async (
    id: string,
    bill: Partial<Bill>
  ): Promise<void> => {
    setBills((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...bill }
          : item
      )
    );
  };

  const deleteBill = async (
    id: string
  ): Promise<void> => {
    setBills((prev) =>
      prev.filter((bill) => bill.id !== id)
    );
  };

  /*
   * ----------------------------------------
   * GROUP FUNCTIONS
   * ----------------------------------------
   */

  const addGroup = async (
    group: Omit<SplitGroup, 'id'>
  ): Promise<void> => {
    const newGroup: SplitGroup = {
      ...group,
      id: crypto.randomUUID(),

      /*
       * Safety fallback.
       *
       * New Groups.tsx will always send memberIds,
       * but this prevents an invalid group from being
       * created if memberIds is accidentally missing.
       */
      memberIds: group.memberIds ?? [],
    };

    setGroups((prev) => [...prev, newGroup]);
  };

  const updateGroup = async (
    id: string,
    group: Partial<SplitGroup>
  ): Promise<void> => {
    setGroups((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...group,
              memberIds:
                group.memberIds ??
                item.memberIds ??
                [],
            }
          : item
      )
    );
  };

  const deleteGroup = async (
    id: string
  ): Promise<void> => {
    /*
     * Delete the group itself.
     *
     * Existing expenses are intentionally preserved.
     * Their groupId simply becomes unmatched until the
     * expense is edited or deleted.
     */
    setGroups((prev) =>
      prev.filter((group) => group.id !== id)
    );
  };

  /*
   * ----------------------------------------
   * PROVIDER
   * ----------------------------------------
   */

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        bills,
        groups,
        users,

        addExpense,
        updateExpense,
        deleteExpense,

        addUser,
        updateUser,
        deleteUser,

        addBill,
        updateBill,
        deleteBill,

        addGroup,
        updateGroup,
        deleteGroup,

        settlements,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);

  if (!context) {
    throw new Error(
      'useExpenses must be used within an ExpenseProvider'
    );
  }

  return context;
}