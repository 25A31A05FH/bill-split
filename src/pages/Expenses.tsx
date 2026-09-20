import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  IndianRupee,
  FileText,
  ArrowUpRight,
  Wallet,
  Sparkles,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import AddExpense, {
  type ExpenseFormData,
} from '../components/features/AddExpense';

import { useExpenses } from '../context/ExpenseContext';

interface ExpenseSettlement {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

const calculateExpenseSettlements = (
  amount: number,
  participants: string[],
  contributions: { userId: string; amount: number }[]
): ExpenseSettlement[] => {
  if (participants.length === 0) {
    return [];
  }

  const totalPaise = Math.round(amount * 100);

  const baseShare = Math.floor(totalPaise / participants.length);
  const remainder = totalPaise % participants.length;

  const balances = new Map<string, number>();

  participants.forEach((userId, index) => {
    const share = baseShare + (index < remainder ? 1 : 0);
    balances.set(userId, -share);
  });

  contributions.forEach((contribution) => {
    if (!participants.includes(contribution.userId)) {
      return;
    }

    const current = balances.get(contribution.userId) || 0;

    balances.set(
      contribution.userId,
      current + Math.round(contribution.amount * 100)
    );
  });

  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0)
    .map(([userId, balance]) => ({
      userId,
      balance,
    }))
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

  return result;
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const Expenses: React.FC = () => {
  const {
    expenses,
    users,
    addExpense,
    deleteExpense,
  } = useExpenses();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedExpense, setExpandedExpense] =
    useState<string | null>(null);

  const getUserName = (userId: string) => {
    return (
      users.find((user) => user.id === userId)?.name ||
      'Unknown'
    );
  };

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
  }, [expenses]);

  const averageExpense = useMemo(() => {
    if (expenses.length === 0) {
      return 0;
    }

    return totalExpenses / expenses.length;
  }, [expenses, totalExpenses]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return expenses;
    }

    return expenses.filter((expense) => {
      return (
        expense.description
          .toLowerCase()
          .includes(query) ||
        expense.location
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [expenses, search]);

  const handleAddExpense = async (
    expenseData: ExpenseFormData
  ) => {
    await addExpense({
      description: expenseData.title,
      amount: expenseData.amount,

      payerId:
        expenseData.contributions[0]?.userId ||
        users[0]?.id ||
        'u1',

      date: new Date(expenseData.date),

      location: expenseData.location,

      receiptUrl: expenseData.receiptUrl,

      contributions: expenseData.contributions,

      participants: expenseData.participants,
    });

    setShowAddExpense(false);
  };

  const handleDeleteExpense = async (
    expenseId: string
  ) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this expense?'
    );

    if (!confirmed) {
      return;
    }

    await deleteExpense(expenseId);

    if (expandedExpense === expenseId) {
      setExpandedExpense(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      {/* AMBIENT BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-32 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() =>
          setSidebarOpen((value) => !value)
        }
      />

      <motion.div
        layout
        className={`relative min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* HEADER */}
        <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-slate-950/75 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-6 px-6 py-5 md:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />

                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-400/80">
                  SKYLINE PG · ROOM 204
                </p>
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                Expenses
              </h1>
            </div>

            <motion.button
              type="button"
              onClick={() => setShowAddExpense(true)}
              whileHover={{
                y: -2,
                boxShadow:
                  '0 16px 40px rgba(16,185,129,0.18)',
              }}
              whileTap={{ scale: 0.98 }}
              className="group flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition md:px-5 md:py-3"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span className="hidden sm:inline">
                Add Expense
              </span>
              <span className="sm:hidden">Add</span>
            </motion.button>
          </div>
        </header>

        <main className="relative mx-auto max-w-[1500px] space-y-10 px-6 py-8 md:px-8 md:py-12">
          {/* HERO */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] px-6 py-8 md:px-10 md:py-10"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-500/[0.06] to-transparent" />

            <div className="relative max-w-4xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                <Sparkles className="h-4 w-4" />
                Shared money, made clear
              </div>

              <h2 className="mt-5 text-4xl font-bold leading-[0.95] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl">
                Every expense.
                <br />
                <span className="text-white/35">
                  Nothing forgotten.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/45 md:text-base">
                Track what your room spends, who contributed,
                who participated, and exactly who owes whom.
              </p>
            </div>
          </motion.section>

          {/* MOVING LABEL */}
          <div className="relative -mx-6 overflow-hidden border-y border-white/[0.06] py-3 md:-mx-8">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                duration: 24,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex w-max items-center gap-10 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20"
            >
              {Array.from({ length: 10 }).map((_, index) => (
                <React.Fragment key={index}>
                  <span>SHARED EXPENSES</span>
                  <span className="text-emerald-400/60">
                    +
                  </span>
                  <span>REAL CONTRIBUTIONS</span>
                  <span className="text-emerald-400/60">
                    +
                  </span>
                  <span>FAIR SPLITS</span>
                  <span className="text-emerald-400/60">
                    +
                  </span>
                </React.Fragment>
              ))}
            </motion.div>
          </div>

          {/* SUMMARY */}
          <section className="grid gap-3 md:grid-cols-3">
            {[
              {
                label: 'Total spent',
                value: `₹${totalExpenses.toFixed(2)}`,
                icon: Wallet,
                detail:
                  expenses.length > 0
                    ? `${expenses.length} recorded expenses`
                    : 'No expenses yet',
                accent: 'text-emerald-400',
                bg: 'bg-emerald-400/10',
              },
              {
                label: 'Average expense',
                value: `₹${averageExpense.toFixed(2)}`,
                icon: IndianRupee,
                detail: 'Per recorded expense',
                accent: 'text-cyan-400',
                bg: 'bg-cyan-400/10',
              },
              {
                label: 'Roommates',
                value: `${users.length}`,
                icon: Users,
                detail: 'Sharing this room',
                accent: 'text-violet-400',
                bg: 'bg-violet-400/10',
              },
            ].map((stat, index) => {
              const Icon = stat.icon;

              return (
                <motion.div
                  key={stat.label}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.15 + index * 0.08,
                    duration: 0.5,
                  }}
                  whileHover={{
                    y: -3,
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-colors duration-300 hover:border-white/[0.14]"
                >
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[0.02] blur-2xl transition-all duration-500 group-hover:bg-emerald-400/[0.05]" />

                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
                        {stat.label}
                      </p>

                      <p className="mt-3 text-2xl font-bold tracking-tight">
                        {stat.value}
                      </p>

                      <p className="mt-1 text-xs text-white/25">
                        {stat.detail}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}
                    >
                      <Icon
                        className={`h-5 w-5 ${stat.accent}`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </section>

          {/* SEARCH + SECTION HEADING */}
          <section>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Expense history
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Where the money went.
                </h2>

                <p className="mt-2 max-w-xl text-sm text-white/35">
                  Open any expense to see contributions,
                  participants, splits, and settlements.
                </p>
              </div>

              <div className="text-sm text-white/25">
                {filteredExpenses.length}{' '}
                {filteredExpenses.length === 1
                  ? 'expense'
                  : 'expenses'}
              </div>
            </div>

            <div className="mt-6">
              <div className="group relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-emerald-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search expenses or locations..."
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] py-4 pl-11 pr-5 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/20 focus:border-emerald-400/30 focus:bg-white/[0.04] focus:ring-4 focus:ring-emerald-400/5"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30 transition hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* EXPENSE LIST */}
          <section>
            {filteredExpenses.length === 0 ? (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10">
                  <Receipt className="h-7 w-7 text-emerald-400" />
                </div>

                <h3 className="mt-6 text-xl font-semibold">
                  {search
                    ? 'Nothing matched your search'
                    : 'No expenses yet'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">
                  {search
                    ? 'Try a different expense name or location.'
                    : 'Start recording your shared spending and ROOMMATE will handle the split.'}
                </p>

                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAddExpense(true)
                    }
                    className="mt-6 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Add First Expense
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {filteredExpenses
                    .slice()
                    .reverse()
                    .map((expense, index) => {
                      const isExpanded =
                        expandedExpense === expense.id;

                      const participants =
                        expense.participants?.length
                          ? expense.participants
                          : users.map(
                              (user) => user.id
                            );

                      const contributions =
                        expense.contributions || [];

                      const settlements =
                        calculateExpenseSettlements(
                          expense.amount,
                          participants,
                          contributions
                        );

                      const totalContributed =
                        contributions.reduce(
                          (sum, item) =>
                            sum + item.amount,
                          0
                        );

                      return (
                        <motion.div
                          key={expense.id}
                          layout
                          initial={{
                            opacity: 0,
                            y: 20,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            y: -10,
                          }}
                          transition={{
                            delay: index * 0.035,
                            duration: 0.45,
                            ease: [
                              0.22,
                              1,
                              0.36,
                              1,
                            ],
                          }}
                          className={`group overflow-hidden rounded-2xl border bg-white/[0.025] transition-all duration-300 ${
                            isExpanded
                              ? 'border-emerald-400/20 bg-white/[0.035]'
                              : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.035]'
                          }`}
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
                            className="w-full p-5 text-left md:p-6"
                          >
                            <div className="flex items-center gap-4">
                              <motion.div
                                animate={{
                                  rotate: isExpanded
                                    ? 0
                                    : 0,
                                }}
                                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${
                                  isExpanded
                                    ? 'bg-emerald-400/15'
                                    : 'bg-white/[0.05] group-hover:bg-emerald-400/10'
                                }`}
                              >
                                <Receipt
                                  className={`h-5 w-5 transition-colors ${
                                    isExpanded
                                      ? 'text-emerald-400'
                                      : 'text-white/50 group-hover:text-emerald-400'
                                  }`}
                                />
                              </motion.div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-sm font-semibold md:text-base">
                                    {expense.description}
                                  </h3>

                                  {isExpanded && (
                                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                                      Open
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/30">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(
                                      expense.date
                                    )}
                                  </span>

                                  {expense.location && (
                                    <span className="flex max-w-[220px] items-center gap-1.5 truncate">
                                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">
                                        {expense.location}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="hidden items-center gap-4 sm:flex">
                                <div className="text-right">
                                  <p className="text-lg font-bold tracking-tight">
                                    ₹
                                    {expense.amount.toFixed(
                                      2
                                    )}
                                  </p>

                                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/20">
                                    Total
                                  </p>
                                </div>

                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 transition-all duration-300 ${
                                    isExpanded
                                      ? 'border-emerald-400/20 bg-emerald-400/10'
                                      : 'bg-white/[0.02] group-hover:bg-white/[0.06]'
                                  }`}
                                >
                                  <ChevronDown
                                    className={`h-4 w-4 text-white/40 transition-transform duration-300 ${
                                      isExpanded
                                        ? 'rotate-180 text-emerald-400'
                                        : ''
                                    }`}
                                  />
                                </div>
                              </div>

                              <div className="sm:hidden">
                                <ChevronDown
                                  className={`h-5 w-5 text-white/30 transition-transform duration-300 ${
                                    isExpanded
                                      ? 'rotate-180 text-emerald-400'
                                      : ''
                                  }`}
                                />
                              </div>
                            </div>

                            {/* MOBILE AMOUNT */}
                            <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4 sm:hidden">
                              <span className="text-[10px] uppercase tracking-wider text-white/20">
                                Total expense
                              </span>

                              <span className="font-bold">
                                ₹
                                {expense.amount.toFixed(
                                  2
                                )}
                              </span>
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
                                  duration: 0.4,
                                  ease: [
                                    0.22,
                                    1,
                                    0.36,
                                    1,
                                  ],
                                }}
                                className="border-t border-white/[0.07]"
                              >
                                <div className="space-y-7 p-5 md:p-7">
                                  {/* QUICK OVERVIEW */}
                                  <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
                                        Participants
                                      </p>

                                      <p className="mt-2 text-xl font-bold">
                                        {
                                          participants.length
                                        }
                                      </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
                                        Contributed
                                      </p>

                                      <p className="mt-2 text-xl font-bold text-emerald-400">
                                        ₹
                                        {totalContributed.toFixed(
                                          2
                                        )}
                                      </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
                                        Settlements
                                      </p>

                                      <p className="mt-2 text-xl font-bold">
                                        {
                                          settlements.length
                                        }
                                      </p>
                                    </div>
                                  </div>

                                  {/* CONTRIBUTIONS */}
                                  <div>
                                    <div className="mb-3 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                                          <IndianRupee className="h-4 w-4 text-emerald-400" />
                                        </div>

                                        <div>
                                          <h4 className="text-sm font-semibold">
                                            Contributions
                                          </h4>

                                          <p className="text-xs text-white/25">
                                            What each person
                                            actually paid
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {participants.map(
                                        (userId) => {
                                          const contribution =
                                            contributions.find(
                                              (item) =>
                                                item.userId ===
                                                userId
                                            )?.amount || 0;

                                          return (
                                            <motion.div
                                              key={userId}
                                              whileHover={{
                                                x: 3,
                                              }}
                                              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition-colors hover:bg-white/[0.045]"
                                            >
                                              <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10 text-xs font-bold text-emerald-400">
                                                  {getUserName(
                                                    userId
                                                  ).charAt(
                                                    0
                                                  )}
                                                </div>

                                                <span className="text-sm font-medium">
                                                  {getUserName(
                                                    userId
                                                  )}
                                                </span>
                                              </div>

                                              <span className="font-semibold">
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
                                  <div>
                                    <div className="mb-3 flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10">
                                        <Users className="h-4 w-4 text-cyan-400" />
                                      </div>

                                      <div>
                                        <h4 className="text-sm font-semibold">
                                          Participants
                                        </h4>

                                        <p className="text-xs text-white/25">
                                          Equal share of the
                                          expense
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {participants.map(
                                        (userId) => {
                                          const totalPaise =
                                            Math.round(
                                              expense.amount *
                                                100
                                            );

                                          const baseShare =
                                            Math.floor(
                                              totalPaise /
                                                participants.length
                                            );

                                          const remainder =
                                            totalPaise %
                                            participants.length;

                                          const participantIndex =
                                            participants.indexOf(
                                              userId
                                            );

                                          const sharePaise =
                                            baseShare +
                                            (participantIndex <
                                            remainder
                                              ? 1
                                              : 0);

                                          return (
                                            <motion.div
                                              key={userId}
                                              whileHover={{
                                                x: 3,
                                              }}
                                              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition-colors hover:bg-white/[0.045]"
                                            >
                                              <span className="text-sm">
                                                {getUserName(
                                                  userId
                                                )}
                                              </span>

                                              <span className="font-semibold text-cyan-400">
                                                ₹
                                                {(
                                                  sharePaise /
                                                  100
                                                ).toFixed(
                                                  2
                                                )}
                                              </span>
                                            </motion.div>
                                          );
                                        }
                                      )}
                                    </div>
                                  </div>

                                  {/* SETTLEMENTS */}
                                  <div>
                                    <div className="mb-3 flex items-center gap-2">
                                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                                        <ArrowRight className="h-4 w-4 text-amber-400" />
                                      </div>

                                      <div>
                                        <h4 className="text-sm font-semibold">
                                          Settlement
                                        </h4>

                                        <p className="text-xs text-white/25">
                                          Final amount each person
                                          owes
                                        </p>
                                      </div>
                                    </div>

                                    {settlements.length ===
                                    0 ? (
                                      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-5">
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/10">
                                            <Sparkles className="h-4 w-4 text-emerald-400" />
                                          </div>

                                          <div>
                                            <p className="text-sm font-semibold text-emerald-300">
                                              Already balanced
                                            </p>

                                            <p className="mt-0.5 text-xs text-white/25">
                                              No settlement is
                                              required for this
                                              expense.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {settlements.map(
                                          (
                                            settlement,
                                            settlementIndex
                                          ) => (
                                            <motion.div
                                              key={`${settlement.fromUserId}-${settlement.toUserId}-${settlementIndex}`}
                                              initial={{
                                                opacity: 0,
                                                x: -8,
                                              }}
                                              animate={{
                                                opacity: 1,
                                                x: 0,
                                              }}
                                              transition={{
                                                delay:
                                                  settlementIndex *
                                                  0.06,
                                              }}
                                              className="flex items-center gap-3 rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] px-4 py-4"
                                            >
                                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-sm font-bold text-amber-400">
                                                {getUserName(
                                                  settlement.fromUserId
                                                ).charAt(
                                                  0
                                                )}
                                              </div>

                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm">
                                                  <span className="font-semibold">
                                                    {getUserName(
                                                      settlement.fromUserId
                                                    )}
                                                  </span>

                                                  <span className="mx-2 text-white/20">
                                                    owes
                                                  </span>

                                                  <span className="font-semibold">
                                                    {getUserName(
                                                      settlement.toUserId
                                                    )}
                                                  </span>
                                                </p>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <ArrowRight className="hidden h-4 w-4 text-amber-400/40 sm:block" />

                                                <span className="font-bold text-amber-400">
                                                  ₹
                                                  {settlement.amount.toFixed(
                                                    2
                                                  )}
                                                </span>
                                              </div>
                                            </motion.div>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* RECEIPT */}
                                  {expense.receiptUrl && (
                                    <div>
                                      <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/10">
                                          <FileText className="h-4 w-4 text-violet-400" />
                                        </div>

                                        <div>
                                          <h4 className="text-sm font-semibold">
                                            Receipt
                                          </h4>

                                          <p className="text-xs text-white/25">
                                            Original expense
                                            document
                                          </p>
                                        </div>
                                      </div>

                                      <a
                                        href={
                                          expense.receiptUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group inline-flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm font-medium transition hover:border-violet-400/20 hover:bg-white/[0.05]"
                                      >
                                        <FileText className="h-4 w-4 text-violet-400" />
                                        View Receipt
                                        <ArrowUpRight className="h-3.5 w-3.5 text-white/25 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                      </a>
                                    </div>
                                  )}

                                  {/* DELETE */}
                                  <div className="flex justify-end border-t border-white/[0.06] pt-5">
                                    <motion.button
                                      type="button"
                                      whileHover={{
                                        y: -1,
                                      }}
                                      whileTap={{
                                        scale: 0.98,
                                      }}
                                      onClick={() =>
                                        handleDeleteExpense(
                                          expense.id
                                        )
                                      }
                                      className="flex items-center gap-2 rounded-xl border border-red-500/15 bg-red-500/[0.04] px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:border-red-500/25 hover:bg-red-500/[0.08]"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete Expense
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            )}
          </section>
        </main>
      </motion.div>

      {/* ADD EXPENSE */}
      <AnimatePresence>
        {showAddExpense && (
          <AddExpense
            onSubmit={handleAddExpense}
            onCancel={() =>
              setShowAddExpense(false)
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;