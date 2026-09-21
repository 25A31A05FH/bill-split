import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import {
  Users,
  CreditCard,
  Bell,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  IndianRupee,
  X,
  UserPlus,
  Receipt,
  ArrowRight,
  Trash2,
  Sparkles,
  Wallet,
  CircleCheck,
  Layers3,
} from 'lucide-react';

import Sidebar from './components/layout/Sidebar';

import AddExpense, {
  type ExpenseFormData,
} from './components/features/AddExpense';

import { useExpenses } from './context/ExpenseContext';

import Expenses from './pages/Expenses';
import Bills from './pages/Bills';
import Groups from './pages/Groups';
import MonthlyCommandCenter from './components/features/MonthlyCommandCenter';


/* =========================================================
   TYPES
========================================================= */

interface ExpenseSettlement {
  fromUserId: string;
  toUserId: string;
  amount: number;
}


/* =========================================================
   PAGE TRANSITION
========================================================= */

const PageTransition: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: -8,
      }}
      transition={{
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
};


/* =========================================================
   ANIMATED NUMBER
========================================================= */

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  decimals?: number;
}

const AnimatedNumber: React.FC<
  AnimatedNumberProps
> = ({
  value,
  prefix = '',
  decimals = 2,
}) => {
  const [displayValue, setDisplayValue] =
    useState(0);

  useEffect(() => {
    const start = displayValue;
    const difference = value - start;

    if (Math.abs(difference) < 0.01) {
      setDisplayValue(value);
      return;
    }

    const duration = 650;
    const startTime = performance.now();

    let frame = 0;

    const animate = (time: number) => {
      const progress = Math.min(
        (time - startTime) / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        start + difference * eased
      );

      if (progress < 1) {
        frame = requestAnimationFrame(
          animate
        );
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString(
        'en-IN',
        {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }
      )}
    </span>
  );
};


/* =========================================================
   EXPENSE SETTLEMENT CALCULATOR
========================================================= */

const calculateExpenseSettlements = (
  expense: {
    amount: number;
    participants?: string[];
    contributions?: {
      userId: string;
      amount: number;
    }[];
  }
): ExpenseSettlement[] => {
  const participants =
    expense.participants ?? [];

  if (participants.length === 0) {
    return [];
  }

  const totalPaise = Math.round(
    expense.amount * 100
  );

  const baseShare = Math.floor(
    totalPaise / participants.length
  );

  const remainder =
    totalPaise % participants.length;

  const balances = new Map<
    string,
    number
  >();

  participants.forEach(
    (userId, index) => {
      const share =
        baseShare +
        (index < remainder ? 1 : 0);

      balances.set(
        userId,
        -share
      );
    }
  );

  expense.contributions?.forEach(
    (contribution) => {
      if (!balances.has(contribution.userId)) {
        return;
      }

      const current =
        balances.get(
          contribution.userId
        ) ?? 0;

      balances.set(
        contribution.userId,
        current +
          Math.round(
            contribution.amount * 100
          )
      );
    }
  );

  const creditors = Array.from(
    balances.entries()
  )
    .filter(([, balance]) => balance > 0)
    .map(([userId, balance]) => ({
      userId,
      balance,
    }))
    .sort(
      (a, b) =>
        b.balance - a.balance
    );

  const debtors = Array.from(
    balances.entries()
  )
    .filter(([, balance]) => balance < 0)
    .map(([userId, balance]) => ({
      userId,
      balance: Math.abs(balance),
    }))
    .sort(
      (a, b) =>
        b.balance - a.balance
    );

  const result: ExpenseSettlement[] =
    [];

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (
    creditorIndex <
      creditors.length &&
    debtorIndex <
      debtors.length
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
        fromUserId:
          debtor.userId,
        toUserId:
          creditor.userId,
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
};


/* =========================================================
   SETTLEMENT HELPER FOR DASHBOARD/GROUPS
========================================================= */

interface ExpenseSettlementInput {
  amount: number;
  participants?: string[];
  contributions?: {
    userId: string;
    amount: number;
  }[];
}

const calculateSettlementsForExpenses = (
  expenseList: ExpenseSettlementInput[],
  userIds: string[],
  settledPayments: ExpenseSettlement[]
): ExpenseSettlement[] => {
  const balances = new Map<string, number>();

  userIds.forEach((id) => {
    balances.set(id, 0);
  });

  expenseList.forEach((expense) => {
    const selectedParticipants =
      expense.participants?.filter((id) => balances.has(id)) ?? [];

    const participants =
      selectedParticipants.length > 0
        ? selectedParticipants
        : userIds;

    if (participants.length === 0) {
      return;
    }

    const totalPaise = Math.round(expense.amount * 100);
    const baseShare = Math.floor(totalPaise / participants.length);
    const remainder = totalPaise % participants.length;

    participants.forEach((userId, index) => {
      const share =
        baseShare + (index < remainder ? 1 : 0);

      balances.set(
        userId,
        (balances.get(userId) ?? 0) - share
      );
    });

    expense.contributions?.forEach((contribution) => {
      if (!balances.has(contribution.userId)) {
        return;
      }

      balances.set(
        contribution.userId,
        (balances.get(contribution.userId) ?? 0) +
          Math.round(contribution.amount * 100)
      );
    });
  });

  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0)
    .map(([userId, balance]) => ({ userId, balance }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = Array.from(balances.entries())
    .filter(([, balance]) => balance < 0)
    .map(([userId, balance]) => ({
      userId,
      balance: Math.abs(balance),
    }))
    .sort((a, b) => b.balance - a.balance);

  const result: ExpenseSettlement[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (
    creditorIndex < creditors.length &&
    debtorIndex < debtors.length
  ) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
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

  return result.filter(
    (payment) =>
      !settledPayments.some(
        (settled) =>
          settled.fromUserId === payment.fromUserId &&
          settled.toUserId === payment.toUserId &&
          Math.abs(
            settled.amount - payment.amount
          ) < 0.01
      )
  );
};


/* =========================================================
   DASHBOARD
========================================================= */

const Dashboard: React.FC = () => {
  const {
    expenses,
    users,
    groups,
    addExpense,
    addUser,
    deleteExpense,
    deleteUser,
    settlements,
    settledPayments,
    settlePayment,
    unsettlePayment,
  } = useExpenses();

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [
    showAddExpense,
    setShowAddExpense,
  ] = useState(false);

  const [
    showAddRoommate,
    setShowAddRoommate,
  ] = useState(false);

  const [search, setSearch] =
    useState('');

  const [
    expandedExpense,
    setExpandedExpense,
  ] = useState<string | null>(null);

  const [selectedGroupId, setSelectedGroupId] =
    useState<string>('all');

  const selectedGroup = groups.find(
    (group) => group.id === selectedGroupId
  );


  /* =======================================================
     ADD EXPENSE
  ======================================================= */

  const handleAddExpense = async (
    expenseData: ExpenseFormData
  ) => {
    await addExpense({
      description:
        expenseData.title,

      amount:
        expenseData.amount,

      payerId:
        expenseData.contributions[0]
          ?.userId ||
        users[0]?.id ||
        'u1',

      date:
        new Date(
          expenseData.date
        ),

      location:
        expenseData.location,

      receiptUrl:
        expenseData.receiptUrl,

      contributions:
        expenseData.contributions,

      participants:
        expenseData.participants,

      groupId:
        expenseData.groupId ||
        undefined,
    });

    setShowAddExpense(false);
  };


  /* =======================================================
     ADD ROOMMATE
  ======================================================= */

  const handleAddRoommate = async (
    name: string,
    email: string,
    phone: string
  ) => {
    if (!name.trim()) {
      return;
    }

    await addUser({
      name: name.trim(),

      email:
        email.trim() ||
        `${name
          .trim()
          .toLowerCase()
          .replace(
            /\s+/g,
            '.'
          )}@example.com`,

      phone:
        phone.trim() ||
        undefined,
    });

    setShowAddRoommate(false);
  };


  const roommateHasExpenseHistory = (userId: string) => {
    return expenses.some((expense) => {
      const payer = expense.payerId === userId;
      const participant =
        expense.participants?.includes(userId) ?? false;
      const contributor =
        expense.contributions?.some(
          (contribution) => contribution.userId === userId
        ) ?? false;

      return payer || participant || contributor;
    });
  };

  const handleDeleteRoommate = async (userId: string) => {
    const user = users.find((item) => item.id === userId);

    if (!user) {
      return;
    }

    if (roommateHasExpenseHistory(userId)) {
      window.alert(
        `${user.name} cannot be removed because they are already linked to an expense.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove ${user.name} from ROOMMATE?\n\nThey have no expense history, so removing them is safe.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(userId);
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error
          ? error.message
          : 'Could not remove this roommate.'
      );
    }
  };


  /* =======================================================
     DELETE
  ======================================================= */

  const handleDeleteExpense = async (
    expenseId: string
  ) => {
    const confirmed =
      window.confirm(
        'Delete this expense?\n\nThis will also remove it from the settlement calculation.'
      );

    if (!confirmed) {
      return;
    }

    await deleteExpense(
      expenseId
    );

    if (
      expandedExpense ===
      expenseId
    ) {
      setExpandedExpense(null);
    }
  };


  /* =======================================================
     FILTERED DASHBOARD SPACE
  ======================================================= */

  const visibleExpenses = useMemo(() => {
    if (selectedGroupId === 'all') {
      return expenses;
    }

    return expenses.filter(
      (expense) => expense.groupId === selectedGroupId
    );
  }, [expenses, selectedGroupId]);

  const totalExpenses = useMemo(
    () =>
      visibleExpenses.reduce(
        (total, expense) => total + expense.amount,
        0
      ),
    [visibleExpenses]
  );

  const dashboardSettlements = useMemo(() => {
    if (selectedGroupId === 'all') {
      return settlements;
    }

    const memberIds = selectedGroup?.memberIds?.length
      ? selectedGroup.memberIds
      : users.map((user) => user.id);

    return calculateSettlementsForExpenses(
      visibleExpenses,
      memberIds,
      settledPayments
    );
  }, [
    selectedGroupId,
    selectedGroup,
    settlements,
    settledPayments,
    users,
    visibleExpenses,
  ]);


  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return visibleExpenses;
    }

    return visibleExpenses.filter(
      (expense) =>
        expense.description.toLowerCase().includes(query) ||
        expense.location?.toLowerCase().includes(query)
    );
  }, [visibleExpenses, search]);


  /* =======================================================
     USER
  ======================================================= */


  const getUserName = (
    userId: string
  ) => {
    return (
      users.find(
        (user) =>
          user.id === userId
      )?.name ||
      'Unknown'
    );
  };


  const handleSettlePayment = async (
    payment: ExpenseSettlement
  ) => {
    const confirmed = window.confirm(
      `${getUserName(payment.fromUserId)} paid ${getUserName(payment.toUserId)} ₹${payment.amount.toFixed(2)}?\n\nThis marks the payment as completed in ROOMMATE.`
    );

    if (!confirmed) {
      return;
    }

    await settlePayment(payment);
  };

  const handleUndoSettlement = async (
    payment: ExpenseSettlement
  ) => {
    await unsettlePayment(payment);
  };


  /* =======================================================
     PENDING
  ======================================================= */

  const pendingAmount =
    dashboardSettlements.reduce(
      (sum, settlement) => sum + settlement.amount,
      0
    );


  /* =======================================================
     STATS
  ======================================================= */

  const stats = [
    {
      label: 'Total spending',
      value: totalExpenses,
      icon: IndianRupee,
      accent: 'emerald',
      sub:
        visibleExpenses.length === 0
          ? 'No expenses yet'
          : `${visibleExpenses.length} recorded`,
    },
    {
      label: 'To settle',
      value: pendingAmount,
      icon: Wallet,
      accent: 'amber',
      sub:
        dashboardSettlements.length === 0
          ? 'Everyone is settled'
          : `${dashboardSettlements.length} payment${
              dashboardSettlements.length === 1
                ? ''
                : 's'
            } needed`,
    },
    {
      label: 'Roommates',
      value: users.length,
      icon: Users,
      accent: 'blue',
      sub: 'In this room',
      integer: true,
    },
  ];


  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020617] text-white">

      {/* ===================================================
          AMBIENT BACKGROUND
      =================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[-15%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.035] blur-3xl" />

        <div className="absolute right-[-10%] top-[30%] h-[450px] w-[450px] rounded-full bg-teal-500/[0.025] blur-3xl" />
      </div>


      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() =>
          setSidebarOpen(
            (value) => !value
          )
        }
      />


      {/* ===================================================
          MAIN
      =================================================== */}

      <motion.div
        animate={{
          marginLeft:
            sidebarOpen
              ? 256
              : 80,
        }}
        transition={{
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative min-h-screen"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#020617]/80 backdrop-blur-2xl">

          <div className="flex h-[72px] items-center justify-between px-5 md:px-8">

            <div className="flex items-center gap-3">

              <motion.button
                type="button"
                whileHover={{
                  x: 2,
                }}
                whileTap={{
                  scale: 0.94,
                }}
                onClick={() =>
                  setSidebarOpen(
                    (value) => !value
                  )
                }
                className="rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white"
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform duration-300 ${
                    sidebarOpen
                      ? 'rotate-180'
                      : ''
                  }`}
                />
              </motion.button>


              <div className="relative hidden w-56 lg:block">

                <Layers3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400/70" />

                <select
                  value={selectedGroupId}
                  onChange={(event) => {
                    setSelectedGroupId(event.target.value);
                    setExpandedExpense(null);
                  }}
                  className="h-10 w-full appearance-none rounded-lg border border-white/[0.07] bg-white/[0.025] pl-10 pr-3 text-sm text-white outline-none transition focus:border-emerald-400/30 focus:bg-white/[0.04]"
                >
                  <option value="all" className="bg-slate-950">
                    All groups
                  </option>
                  {groups.map((group) => (
                    <option
                      key={group.id}
                      value={group.id}
                      className="bg-slate-950"
                    >
                      {group.name}
                    </option>
                  ))}
                </select>

              </div>


              <div className="relative hidden w-64 md:block">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search expenses in this space..."
                  className="h-10 w-full rounded-lg border border-white/[0.07] bg-white/[0.025] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-400/30 focus:bg-white/[0.04]"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/20 lg:block">
                  /
                </span>

              </div>

            </div>


            <div className="flex items-center gap-3">

              <motion.button
                type="button"
                whileHover={{
                  y: -1,
                }}
                whileTap={{
                  scale: 0.94,
                }}
                className="relative rounded-lg p-2.5 text-white/35 transition hover:bg-white/5 hover:text-white"
              >
                <Bell className="h-[18px] w-[18px]" />

                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </motion.button>


              <div className="h-6 w-px bg-white/[0.08]" />


              <motion.div
                whileHover={{
                  x: -2,
                }}
                className="flex cursor-default items-center gap-3"
              >

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                  H
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-medium">
                    Hanish
                  </p>

                  <p className="text-[11px] text-white/30">
                    Room 204
                  </p>
                </div>

              </motion.div>

            </div>

          </div>

        </header>


        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="px-5 pb-16 pt-8 md:px-8 lg:px-10">

          {/* =================================================
              HERO
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative mb-8 overflow-hidden"
          >

            <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">

              <div>

                <motion.div
                  initial={{
                    opacity: 0,
                    x: -10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay: 0.05,
                  }}
                  className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Skyline PG · Room 204
                </motion.div>


                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">

                  Shared expenses.

                  <br />

                  <span className="text-white/30">
                    Finally simple.
                  </span>

                </h1>


                <p className="mt-5 max-w-xl text-sm leading-6 text-white/35 md:text-base">
                  Track what everyone paid,
                  see exactly who owes whom,
                  and keep the whole room
                  on the same page.
                </p>

              </div>


              <div className="flex shrink-0 gap-2">

                <motion.button
                  type="button"
                  whileHover={{
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  onClick={() =>
                    setShowAddRoommate(
                      true
                    )
                  }
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Add roommate
                  </span>
                </motion.button>


                <motion.button
                  type="button"
                  whileHover={{
                    y: -2,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  onClick={() =>
                    setShowAddExpense(
                      true
                    )
                  }
                  className="group flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  Add expense
                </motion.button>

              </div>

            </div>

          </motion.section>


          {/* =================================================
              MARQUEE
          ================================================= */}

          <div className="mb-8 overflow-hidden border-y border-white/[0.06] py-3">

            <motion.div
              animate={{
                x: ['0%', '-50%'],
              }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex w-max items-center whitespace-nowrap"
            >

              {[...Array(2)].map(
                (_, groupIndex) => (
                  <div
                    key={groupIndex}
                    className="flex items-center"
                  >

                    {[
                      'SHARED EXPENSES',
                      'ROOMMATES',
                      'SMART SPLITS',
                      'BILLS',
                      'ONE ROOM',
                      'ONE PLACE',
                    ].map(
                      (item) => (
                        <React.Fragment
                          key={`${groupIndex}-${item}`}
                        >
                          <span className="mx-5 text-[10px] font-semibold tracking-[0.25em] text-white/20">
                            {item}
                          </span>

                          <span className="text-emerald-400/50">
                            •
                          </span>
                        </React.Fragment>
                      )
                    )}

                  </div>
                )
              )}

            </motion.div>

          </div>


          {/* =================================================
              STATS
          ================================================= */}

          <section className="mb-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] md:grid-cols-3">

            {stats.map(
              (
                stat,
                index
              ) => {
                const Icon =
                  stat.icon;

                const accentClasses =
                  stat.accent ===
                  'emerald'
                    ? {
                        icon: 'text-emerald-400',
                        bg: 'bg-emerald-400/10',
                        line: 'bg-emerald-400',
                      }
                    : stat.accent ===
                      'amber'
                    ? {
                        icon: 'text-amber-400',
                        bg: 'bg-amber-400/10',
                        line: 'bg-amber-400',
                      }
                    : {
                        icon: 'text-blue-400',
                        bg: 'bg-blue-400/10',
                        line: 'bg-blue-400',
                      };

                return (
                  <motion.div
                    key={stat.label}
                    initial={{
                      opacity: 0,
                      y: 14,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        0.12 +
                        index *
                          0.07,
                    }}
                    whileHover={{
                      backgroundColor:
                        'rgba(255,255,255,0.035)',
                    }}
                    className="group relative bg-[#020617] p-6 transition-colors"
                  >

                    <div
                      className={`absolute left-0 top-0 h-px w-0 ${accentClasses.line} transition-all duration-500 group-hover:w-full`}
                    />

                    <div className="flex items-start justify-between">

                      <div>

                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/30">
                          {stat.label}
                        </p>

                        <div className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
                          <AnimatedNumber
                            value={
                              stat.value
                            }
                            prefix="₹"
                            decimals={
                              stat.integer
                                ? 0
                                : 2
                            }
                          />
                        </div>

                        <p className="mt-2 text-xs text-white/25">
                          {stat.sub}
                        </p>

                      </div>


                      <div
                        className={`rounded-lg p-2.5 ${accentClasses.bg}`}
                      >
                        <Icon
                          className={`h-4 w-4 ${accentClasses.icon}`}
                        />
                      </div>

                    </div>

                  </motion.div>
                );
              }
            )}

          </section>


          {/* =================================================
              MONTHLY COMMAND CENTER
          ================================================= */}

          <MonthlyCommandCenter />


          {/* =================================================
              SETTLEMENT
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
            transition={{
              duration: 0.45,
            }}
            className="mb-12"
          >

            <div className="mb-5 flex items-end justify-between">

              <div>

                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />

                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                    Live balance
                  </span>
                </div>

                <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                  Who owes whom?
                </h2>

                <p className="mt-1 text-sm text-white/30">
                  Your room's current
                  settlement picture.
                </p>

              </div>


              {dashboardSettlements.length >
                0 && (
                <span className="hidden text-xs text-white/25 sm:block">
                  {dashboardSettlements.length}{' '}
                  outstanding
                </span>
              )}

            </div>


            {dashboardSettlements.length ===
            0 ? (

              <motion.div
                whileHover={{
                  borderColor:
                    'rgba(52,211,153,0.3)',
                }}
                className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.035] p-6 transition-colors"
              >

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/10">
                    <CircleCheck className="h-5 w-5 text-emerald-400" />
                  </div>

                  <div>
                    <h3 className="font-medium">
                      Everyone is settled
                    </h3>

                    <p className="mt-1 text-sm text-white/30">
                      No outstanding
                      payments right now.
                    </p>
                  </div>

                </div>

              </motion.div>

            ) : (

              <div className="grid gap-3 md:grid-cols-2">

                {dashboardSettlements.map(
                  (
                    settlement,
                    index
                  ) => (

                    <motion.div
                      key={`${settlement.fromUserId}-${settlement.toUserId}-${index}`}
                      initial={{
                        opacity: 0,
                        x: -12,
                      }}
                      whileInView={{
                        opacity: 1,
                        x: 0,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay:
                          index *
                          0.06,
                      }}
                      whileHover={{
                        y: -2,
                      }}
                      className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-5 transition-colors hover:border-emerald-400/20"
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-sm font-semibold text-amber-400">
                          {getUserName(
                            settlement.fromUserId
                          ).charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {getUserName(
                              settlement.fromUserId
                            )}
                          </p>

                          <p className="text-[11px] text-white/25">
                            owes
                          </p>
                        </div>


                        <motion.div
                          animate={{
                            x: [0, 4, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat:
                              Infinity,
                            ease: 'easeInOut',
                          }}
                        >
                          <ArrowRight className="h-4 w-4 text-emerald-400/50" />
                        </motion.div>


                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-sm font-semibold text-emerald-400">
                          {getUserName(
                            settlement.toUserId
                          ).charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {getUserName(
                              settlement.toUserId
                            )}
                          </p>
                        </div>


                        <div className="text-right">
                          <p className="font-semibold text-amber-400">
                            ₹
                            {settlement.amount.toFixed(
                              2
                            )}
                          </p>

                          <motion.button
                            type="button"
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() =>
                              handleSettlePayment(settlement)
                            }
                            className="mt-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-400 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.1]"
                          >
                            Mark as settled
                          </motion.button>
                        </div>

                      </div>

                    </motion.div>

                  )
                )}

              </div>

            )}

          </motion.section>




          {/* =================================================
              PAYMENTS SETTLED
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
            transition={{
              duration: 0.45,
            }}
            className="mb-12"
          >

            <div className="mb-5 flex items-end justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <CircleCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                    Completed
                  </span>
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                  Payments settled
                </h2>
                <p className="mt-1 text-sm text-white/30">
                  Completed roommate-to-roommate payments stay in the history.
                </p>
              </div>
            </div>

            {settledPayments.length === 0 ? (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-white/30">
                No payments have been marked as settled yet.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {settledPayments
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((payment, index) => (
                    <motion.div
                      key={`${payment.fromUserId}-${payment.toUserId}-${payment.amount}-${index}`}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      whileInView={{
                        opacity: 1,
                        y: 0,
                      }}
                      viewport={{ once: true }}
                      transition={{
                        delay: index * 0.04,
                      }}
                      whileHover={{ y: -2 }}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-xs font-semibold text-emerald-400">
                        {getUserName(
                          payment.fromUserId
                        ).charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {getUserName(payment.fromUserId)}
                          {' → '}
                          {getUserName(payment.toUserId)}
                        </p>
                        <p className="mt-1 text-xs text-white/25">
                          ₹{payment.amount.toFixed(2)} · settled
                        </p>
                      </div>

                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() =>
                          handleUndoSettlement(payment)
                        }
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        Undo
                      </motion.button>
                    </motion.div>
                  ))}
              </div>
            )}

          </motion.section>
          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">


            {/* =================================================
                RECENT EXPENSES
            ================================================= */}

            <section>

              <div className="mb-5 flex items-end justify-between">

                <div>

                  <div className="mb-2 flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-white/35" />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                      Activity
                    </span>
                  </div>

                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                    Recent expenses
                  </h2>

                </div>

                <span className="text-xs text-white/25">
                  {filteredExpenses.length}{' '}
                  total
                </span>

              </div>


              <div className="space-y-2">

                {filteredExpenses.length ===
                0 ? (

                  <motion.div
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    className="rounded-xl border border-dashed border-white/10 p-12 text-center"
                  >

                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
                      <Receipt className="h-5 w-5 text-white/25" />
                    </div>

                    <h3 className="font-medium">
                      No expenses yet
                    </h3>

                    <p className="mt-1 text-sm text-white/25">
                      Add your first shared
                      expense.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAddExpense(
                          true
                        )
                      }
                      className="mt-5 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                    >
                      Add expense
                    </button>

                  </motion.div>

                ) : (

                  filteredExpenses
                    .slice()
                    .reverse()
                    .slice(0, 8)
                    .map(
                      (
                        expense,
                        index
                      ) => {

                        const isExpanded =
                          expandedExpense ===
                          expense.id;

                        const participants =
                          expense
                            .participants
                            ?.length
                            ? expense.participants
                            : users.map(
                                (user) =>
                                  user.id
                              );

                        const totalPaise =
                          Math.round(
                            expense.amount *
                              100
                          );

                        const baseShare =
                          participants.length >
                          0
                            ? Math.floor(
                                totalPaise /
                                  participants.length
                              )
                            : 0;

                        const remainder =
                          participants.length >
                          0
                            ? totalPaise %
                              participants.length
                            : 0;

                        const expenseSettlements =
                          calculateExpenseSettlements(
                            expense
                          );

                        return (
                          <motion.div
                            layout
                            key={
                              expense.id
                            }
                            initial={{
                              opacity: 0,
                              y: 12,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              delay:
                                index *
                                0.045,
                            }}
                            className="group overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02] transition-colors hover:border-white/[0.13]"
                          >

                            {/* EXPENSE HEADER */}

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedExpense(
                                  isExpanded
                                    ? null
                                    : expense.id
                                )
                              }
                              className="w-full px-5 py-4 text-left"
                            >

                              <div className="flex items-center gap-4">

                                <motion.div
                                  animate={{
                                    scale:
                                      isExpanded
                                        ? 1.05
                                        : 1,
                                  }}
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10"
                                >
                                  <CreditCard className="h-4 w-4 text-emerald-400" />
                                </motion.div>


                                <div className="min-w-0 flex-1">

                                  <h3 className="truncate text-sm font-medium">
                                    {
                                      expense.description
                                    }
                                  </h3>

                                  <p className="mt-1 truncate text-xs text-white/25">
                                    {expense.location ||
                                      'Shared expense'}
                                    {' · '}
                                    {new Date(
                                      expense.date
                                    ).toLocaleDateString(
                                      'en-IN'
                                    )}
                                    {' · '}
                                    {
                                      participants.length
                                    }{' '}
                                    participant
                                    {participants.length ===
                                    1
                                      ? ''
                                      : 's'}
                                  </p>

                                </div>


                                <div className="text-right">

                                  <p className="text-sm font-semibold text-white">
                                    ₹
                                    {expense.amount.toFixed(
                                      2
                                    )}
                                  </p>

                                  <motion.p
                                    animate={{
                                      opacity:
                                        isExpanded
                                          ? 0.55
                                          : 0.25,
                                    }}
                                    className="mt-1 text-[10px]"
                                  >
                                    {isExpanded
                                      ? 'Close'
                                      : 'Details'}
                                  </motion.p>

                                </div>


                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 text-white/20 transition-transform duration-300 ${
                                    isExpanded
                                      ? 'rotate-180 text-emerald-400/70'
                                      : ''
                                  }`}
                                />

                              </div>

                            </button>


                            {/* DETAILS */}

                            <AnimatePresence initial={false}>

                              {isExpanded && (

                                <motion.div
                                  initial={{
                                    height: 0,
                                    opacity: 0,
                                  }}
                                  animate={{
                                    height: 'auto',
                                    opacity: 1,
                                  }}
                                  exit={{
                                    height: 0,
                                    opacity: 0,
                                  }}
                                  transition={{
                                    duration:
                                      0.3,
                                    ease: [
                                      0.22,
                                      1,
                                      0.36,
                                      1,
                                    ],
                                  }}
                                  className="overflow-hidden"
                                >

                                  <div className="border-t border-white/[0.07] p-5">

                                    {/* CONTRIBUTIONS */}

                                    <div className="mb-7">

                                      <div className="mb-3 flex items-end justify-between">

                                        <div>
                                          <h4 className="text-sm font-medium">
                                            Contributions
                                          </h4>

                                          <p className="mt-1 text-xs text-white/25">
                                            What each person
                                            actually paid
                                          </p>
                                        </div>

                                        <span className="text-xs text-white/30">
                                          ₹
                                          {(
                                            expense.contributions?.reduce(
                                              (
                                                total,
                                                contribution
                                              ) =>
                                                total +
                                                contribution.amount,
                                              0
                                            ) ||
                                            0
                                          ).toFixed(
                                            2
                                          )}{' '}
                                          / ₹
                                          {expense.amount.toFixed(
                                            2
                                          )}
                                        </span>

                                      </div>


                                      <div className="space-y-1.5">

                                        {users.map(
                                          (
                                            user
                                          ) => {

                                            const contribution =
                                              expense.contributions?.find(
                                                (
                                                  item
                                                ) =>
                                                  item.userId ===
                                                  user.id
                                              )
                                                ?.amount ||
                                              0;

                                            return (
                                              <motion.div
                                                key={
                                                  user.id
                                                }
                                                initial={{
                                                  opacity: 0,
                                                  x: -5,
                                                }}
                                                animate={{
                                                  opacity: 1,
                                                  x: 0,
                                                }}
                                                className="flex items-center justify-between rounded-lg bg-white/[0.025] px-3 py-2.5"
                                              >

                                                <div className="flex items-center gap-2.5">

                                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-medium text-white/60">
                                                    {user.name.charAt(
                                                      0
                                                    )}
                                                  </div>

                                                  <span className="text-xs font-medium">
                                                    {
                                                      user.name
                                                    }
                                                  </span>

                                                </div>

                                                <span
                                                  className={`text-xs font-semibold ${
                                                    contribution >
                                                    0
                                                      ? 'text-white/80'
                                                      : 'text-white/20'
                                                  }`}
                                                >
                                                  ₹
                                                  {contribution.toFixed(
                                                    2
                                                  )}
                                                </span>

                                              </motion.div>
                                            );
                                          }
                                        )}

                                      </div>

                                    </div>


                                    {/* PARTICIPANTS */}

                                    <div className="mb-7">

                                      <div className="mb-3">
                                        <h4 className="text-sm font-medium">
                                          Split between
                                        </h4>

                                        <p className="mt-1 text-xs text-white/25">
                                          Equal share
                                          for each
                                          participant
                                        </p>
                                      </div>


                                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">

                                        {participants.map(
                                          (
                                            userId,
                                            participantIndex
                                          ) => {

                                            const exactShare =
                                              (
                                                baseShare +
                                                (participantIndex <
                                                remainder
                                                  ? 1
                                                  : 0)
                                              ) /
                                              100;

                                            return (
                                              <div
                                                key={
                                                  userId
                                                }
                                                className="flex items-center justify-between rounded-lg border border-white/[0.05] px-3 py-2.5"
                                              >

                                                <span className="text-xs text-white/55">
                                                  {getUserName(
                                                    userId
                                                  )}
                                                </span>

                                                <span className="text-xs font-semibold text-blue-400">
                                                  ₹
                                                  {exactShare.toFixed(
                                                    2
                                                  )}
                                                </span>

                                              </div>
                                            );
                                          }
                                        )}

                                      </div>

                                    </div>


                                    {/* SETTLEMENT */}

                                    <div className="mb-7">

                                      <div className="mb-3">
                                        <h4 className="text-sm font-medium">
                                          Settlement
                                        </h4>

                                        <p className="mt-1 text-xs text-white/25">
                                          Result for
                                          this expense
                                        </p>
                                      </div>


                                      {expenseSettlements.length ===
                                      0 ? (

                                        <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.035] p-4">

                                          <div className="flex items-center gap-3">
                                            <CircleCheck className="h-4 w-4 text-emerald-400" />

                                            <span className="text-xs font-medium text-emerald-400">
                                              Everyone is
                                              settled
                                            </span>
                                          </div>

                                        </div>

                                      ) : (

                                        <div className="space-y-1.5">

                                          {expenseSettlements.map(
                                            (
                                              settlement,
                                              settlementIndex
                                            ) => (

                                              <motion.div
                                                key={`${settlement.fromUserId}-${settlement.toUserId}-${settlementIndex}`}
                                                initial={{
                                                  opacity: 0,
                                                  scale:
                                                    0.98,
                                                }}
                                                animate={{
                                                  opacity: 1,
                                                  scale: 1,
                                                }}
                                                transition={{
                                                  delay:
                                                    settlementIndex *
                                                    0.05,
                                                }}
                                                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                                              >

                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10 text-xs font-semibold text-amber-400">
                                                  {getUserName(
                                                    settlement.fromUserId
                                                  ).charAt(
                                                    0
                                                  )}
                                                </div>

                                                <div className="min-w-0">
                                                  <p className="text-xs font-medium">
                                                    {getUserName(
                                                      settlement.fromUserId
                                                    )}
                                                  </p>

                                                  <p className="text-[10px] text-white/25">
                                                    owes
                                                  </p>
                                                </div>


                                                <motion.div
                                                  animate={{
                                                    x: [
                                                      0,
                                                      3,
                                                      0,
                                                    ],
                                                  }}
                                                  transition={{
                                                    duration:
                                                      1.2,
                                                    repeat:
                                                      Infinity,
                                                  }}
                                                >
                                                  <ArrowRight className="h-3.5 w-3.5 text-white/25" />
                                                </motion.div>


                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10 text-xs font-semibold text-emerald-400">
                                                  {getUserName(
                                                    settlement.toUserId
                                                  ).charAt(
                                                    0
                                                  )}
                                                </div>

                                                <p className="min-w-0 flex-1 text-xs font-medium">
                                                  {getUserName(
                                                    settlement.toUserId
                                                  )}
                                                </p>

                                                <span className="text-xs font-semibold text-amber-400">
                                                  ₹
                                                  {settlement.amount.toFixed(
                                                    2
                                                  )}
                                                </span>

                                              </motion.div>

                                            )
                                          )}

                                        </div>

                                      )}

                                    </div>


                                    {/* RECEIPT */}

                                    {expense.receiptUrl && (
                                      <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">

                                        <div className="flex items-center gap-3">
                                          <Receipt className="h-4 w-4 text-white/30" />

                                          <div className="min-w-0">
                                            <p className="text-xs font-medium">
                                              Receipt
                                            </p>

                                            <p className="truncate text-[10px] text-white/25">
                                              {
                                                expense.receiptUrl
                                              }
                                            </p>
                                          </div>
                                        </div>

                                      </div>
                                    )}


                                    {/* DELETE */}

                                    <div className="border-t border-white/[0.06] pt-4">

                                      <motion.button
                                        type="button"
                                        whileHover={{
                                          backgroundColor:
                                            'rgba(239,68,68,0.08)',
                                        }}
                                        whileTap={{
                                          scale:
                                            0.99,
                                        }}
                                        onClick={() =>
                                          handleDeleteExpense(
                                            expense.id
                                          )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/10 py-2.5 text-xs font-medium text-red-400/70 transition hover:border-red-400/20 hover:text-red-400"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete expense
                                      </motion.button>

                                    </div>

                                  </div>

                                </motion.div>

                              )}

                            </AnimatePresence>

                          </motion.div>
                        );
                      }
                    )

                )}

              </div>

            </section>


            {/* =================================================
                ROOMMATES
            ================================================= */}

            <section>

              <div className="mb-5 flex items-end justify-between">

                <div>

                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-white/30" />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                      Your room
                    </span>
                  </div>

                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                    Roommates
                  </h2>

                </div>


                <motion.button
                  type="button"
                  whileHover={{
                    rotate: 90,
                  }}
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={() =>
                    setShowAddRoommate(
                      true
                    )
                  }
                  className="rounded-lg border border-white/10 p-2 text-white/35 transition hover:border-emerald-400/20 hover:text-emerald-400"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>

              </div>


              <div className="space-y-1.5">

                {users.map(
                  (
                    user,
                    index
                  ) => (

                    <motion.div
                      key={user.id}
                      initial={{
                        opacity: 0,
                        x: 10,
                      }}
                      whileInView={{
                        opacity: 1,
                        x: 0,
                      }}
                      viewport={{
                        once: true,
                      }}
                      transition={{
                        delay:
                          index *
                          0.06,
                      }}
                      whileHover={{
                        x: 3,
                      }}
                      className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition hover:border-white/[0.07] hover:bg-white/[0.025]"
                    >

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-white/65">
                        {user.name.charAt(
                          0
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {user.name}
                        </p>

                        <p className="truncate text-[10px] text-white/25">
                          {user.email}
                        </p>
                      </div>

                      <motion.button
                        type="button"
                        whileHover={
                          roommateHasExpenseHistory(user.id)
                            ? undefined
                            : { scale: 1.05 }
                        }
                        whileTap={
                          roommateHasExpenseHistory(user.id)
                            ? undefined
                            : { scale: 0.95 }
                        }
                        onClick={() =>
                          handleDeleteRoommate(user.id)
                        }
                        disabled={roommateHasExpenseHistory(user.id)}
                        title={
                          roommateHasExpenseHistory(user.id)
                            ? 'Cannot remove: this roommate is linked to an expense.'
                            : `Remove ${user.name}`
                        }
                        className={`rounded-lg p-2 transition ${
                          roommateHasExpenseHistory(user.id)
                            ? 'cursor-not-allowed text-white/10'
                            : 'text-white/20 hover:bg-red-400/10 hover:text-red-400'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>

                    </motion.div>

                  )
                )}

              </div>


              {/* QUICK ACTION */}

              <motion.div
                whileHover={{
                  y: -2,
                }}
                className="mt-5 overflow-hidden rounded-xl border border-emerald-400/10 bg-emerald-400/[0.025] p-5"
              >

                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10">
                  <UserPlus className="h-4 w-4 text-emerald-400" />
                </div>

                <h3 className="text-sm font-medium">
                  Growing the room?
                </h3>

                <p className="mt-1 text-xs leading-5 text-white/25">
                  Add a roommate and
                  include them in future
                  shared expenses.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddRoommate(
                      true
                    )
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] py-2.5 text-xs font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add roommate
                </button>

              </motion.div>

            </section>

          </div>

        </main>

      </motion.div>


      {/* ===================================================
          ADD EXPENSE
      =================================================== */}

      <AnimatePresence>

        {showAddExpense && (
          <AddExpense
            defaultGroupId={
              selectedGroupId === 'all'
                ? groups[0]?.id
                : selectedGroupId
            }
            onSubmit={
              handleAddExpense
            }
            onCancel={() =>
              setShowAddExpense(
                false
              )
            }
          />
        )}

      </AnimatePresence>


      {/* ===================================================
          ADD ROOMMATE
      =================================================== */}

      <AnimatePresence>

        {showAddRoommate && (
          <AddRoommateModal
            onSubmit={
              handleAddRoommate
            }
            onCancel={() =>
              setShowAddRoommate(
                false
              )
            }
          />
        )}

      </AnimatePresence>

    </div>
  );
};


/* =========================================================
   ADD ROOMMATE MODAL
========================================================= */

interface AddRoommateModalProps {
  onSubmit: (
    name: string,
    email: string,
    phone: string
  ) => void;

  onCancel: () => void;
}


const AddRoommateModal: React.FC<
  AddRoommateModalProps
> = ({
  onSubmit,
  onCancel,
}) => {
  const [name, setName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');


  const handleSubmit = (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    onSubmit(
      name,
      email,
      phone
    );
  };


  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        duration: 0.2,
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.94,
          y: 20,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.97,
          y: 10,
        }}
        transition={{
          type: 'spring',
          stiffness: 360,
          damping: 30,
        }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] shadow-2xl shadow-black/40"
      >

        {/* TOP ACCENT */}

        <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />


        <div className="p-6">

          <div className="mb-6 flex items-start justify-between">

            <div>

              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10">
                <UserPlus className="h-4 w-4 text-emerald-400" />
              </div>

              <h2 className="text-xl font-semibold tracking-[-0.02em]">
                Add roommate
              </h2>

              <p className="mt-1 text-sm text-white/30">
                Bring someone into
                the room.
              </p>

            </div>


            <motion.button
              type="button"
              whileHover={{
                rotate: 90,
              }}
              whileTap={{
                scale: 0.9,
              }}
              onClick={
                onCancel
              }
              className="rounded-lg p-2 text-white/25 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </motion.button>

          </div>


          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-4"
          >

            <div>

              <label className="mb-2 block text-xs font-medium text-white/55">
                Name
              </label>

              <input
                value={name}
                onChange={(
                  event
                ) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="e.g. Vikram"
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-400/40 focus:bg-white/[0.05]"
              />

            </div>


            <div>

              <label className="mb-2 block text-xs font-medium text-white/55">
                Email
                <span className="ml-2 text-white/20">
                  optional
                </span>
              </label>

              <input
                type="email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="vikram@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-400/40 focus:bg-white/[0.05]"
              />

            </div>


            <div>

              <label className="mb-2 block text-xs font-medium text-white/55">
                Phone
                <span className="ml-2 text-white/20">
                  optional
                </span>
              </label>

              <input
                value={phone}
                onChange={(
                  event
                ) =>
                  setPhone(
                    event.target.value
                  )
                }
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-400/40 focus:bg-white/[0.05]"
              />

            </div>


            <div className="flex gap-2 border-t border-white/[0.07] pt-5">

              <button
                type="button"
                onClick={
                  onCancel
                }
                className="flex-1 rounded-lg border border-white/10 bg-white/[0.025] py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </button>


              <motion.button
                type="submit"
                disabled={
                  !name.trim()
                }
                whileHover={{
                  y: -1,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-400 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
                Add roommate
              </motion.button>

            </div>

          </form>

        </div>

      </motion.div>

    </motion.div>
  );
};


/* =========================================================
   APP ROUTES
========================================================= */

const App: React.FC = () => {
  return (
    <AnimatePresence
      mode="wait"
    >
      <Routes>

        <Route
          path="/"
          element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          }
        />

        <Route
          path="/expenses"
          element={
            <PageTransition>
              <Expenses />
            </PageTransition>
          }
        />

        <Route
          path="/bills"
          element={
            <PageTransition>
              <Bills />
            </PageTransition>
          }
        />

        <Route
          path="/groups"
          element={
            <PageTransition>
              <Groups />
            </PageTransition>
          }
        />

      </Routes>
    </AnimatePresence>
  );
};


export default App;