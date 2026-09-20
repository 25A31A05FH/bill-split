import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Search,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Trash2,
  X,
  User,
  IndianRupee,
  Sparkles,
  Wallet,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import { useExpenses } from '../context/ExpenseContext';
import type { Bill } from '../types';

const Bills: React.FC = () => {
  const {
    bills,
    users,
    addBill,
    updateBill,
    deleteBill,
  } = useExpenses();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddBill, setShowAddBill] = useState(false);
  const [search, setSearch] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paidById, setPaidById] = useState(
    users[0]?.id || ''
  );

  const getBillStatus = (
    bill: Bill
  ): 'pending' | 'paid' | 'overdue' => {
    if (bill.status === 'paid') {
      return 'paid';
    }

    const due = new Date(bill.dueDate);
    due.setHours(23, 59, 59, 999);

    if (due.getTime() < Date.now()) {
      return 'overdue';
    }

    return 'pending';
  };

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return bills;
    }

    return bills.filter((bill) => {
      const payerName = bill.paidBy?.name || '';

      return (
        bill.description
          .toLowerCase()
          .includes(query) ||
        payerName
          .toLowerCase()
          .includes(query) ||
        getBillStatus(bill).includes(query)
      );
    });
  }, [bills, search]);

  const totalBills = useMemo(() => {
    return bills.reduce(
      (sum, bill) => sum + bill.amount,
      0
    );
  }, [bills]);

  const pendingBills = useMemo(() => {
    return bills.filter(
      (bill) =>
        getBillStatus(bill) === 'pending'
    );
  }, [bills]);

  const overdueBills = useMemo(() => {
    return bills.filter(
      (bill) =>
        getBillStatus(bill) === 'overdue'
    );
  }, [bills]);

  const paidBills = useMemo(() => {
    return bills.filter(
      (bill) =>
        getBillStatus(bill) === 'paid'
    );
  }, [bills]);

  const pendingAmount = pendingBills.reduce(
    (sum, bill) => sum + bill.amount,
    0
  );

  const overdueAmount = overdueBills.reduce(
    (sum, bill) => sum + bill.amount,
    0
  );

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDueDate(
      new Date().toISOString().split('T')[0]
    );
    setPaidById(users[0]?.id || '');
  };

  const handleAddBill = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (
      !description.trim() ||
      numericAmount <= 0 ||
      !dueDate ||
      !paidById
    ) {
      return;
    }

    const payer = users.find(
      (user) => user.id === paidById
    );

    if (!payer) {
      return;
    }

    await addBill({
      description: description.trim(),
      amount: numericAmount,
      dueDate: new Date(
        `${dueDate}T23:59:59`
      ),
      paidBy: payer,
      status: 'pending',
      split: users.map((user) => ({
        id: user.id,
        name: user.name,
      })),
    });

    resetForm();
    setShowAddBill(false);
  };

  const handleMarkPaid = async (
    bill: Bill
  ) => {
    await updateBill(bill.id, {
      status: 'paid',
    });
  };

  const handleMarkPending = async (
    bill: Bill
  ) => {
    await updateBill(bill.id, {
      status: 'pending',
    });
  };

  const handleDeleteBill = async (
    bill: Bill
  ) => {
    const confirmed = window.confirm(
      `Delete "${bill.description}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    await deleteBill(bill.id);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    ).format(new Date(date));
  };

  const statusConfig = {
    paid: {
      label: 'Paid',
      icon: CheckCircle2,
      className:
        'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    },
    pending: {
      label: 'Pending',
      icon: Clock3,
      className:
        'bg-amber-400/10 text-amber-400 border-amber-400/20',
    },
    overdue: {
      label: 'Overdue',
      icon: AlertCircle,
      className:
        'bg-red-400/10 text-red-400 border-red-400/20',
    },
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      {/* AMBIENT BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() =>
          setSidebarOpen((value) => !value)
        }
      />

      <motion.main
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
                Bills
              </h1>
            </div>

            <motion.button
              type="button"
              onClick={() =>
                setShowAddBill(true)
              }
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
                Add Bill
              </span>

              <span className="sm:hidden">
                Add
              </span>
            </motion.button>
          </div>
        </header>

        <div className="relative mx-auto max-w-[1500px] space-y-10 px-6 py-8 md:px-8 md:py-12">
          {/* HERO */}
          <motion.section
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] px-6 py-8 md:px-10 md:py-10"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-emerald-500/[0.06] to-transparent" />

            <div className="relative max-w-4xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                <CreditCard className="h-4 w-4" />
                Shared commitments
              </div>

              <h2 className="mt-5 text-4xl font-bold leading-[0.95] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl">
                Never miss
                <br />
                <span className="text-white/35">
                  the next bill.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/45 md:text-base">
                Keep rent, electricity, Wi-Fi and
                other shared commitments visible,
                organized and easy to track.
              </p>
            </div>
          </motion.section>

          {/* MARQUEE */}
          <div className="relative -mx-6 overflow-hidden border-y border-white/[0.06] py-3 md:-mx-8">
            <motion.div
              animate={{
                x: ['0%', '-50%'],
              }}
              transition={{
                duration: 24,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex w-max items-center gap-10 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.28em] text-white/20"
            >
              {Array.from({
                length: 10,
              }).map((_, index) => (
                <React.Fragment key={index}>
                  <span>RENT</span>
                  <span className="text-emerald-400/60">
                    +
                  </span>

                  <span>UTILITIES</span>
                  <span className="text-emerald-400/60">
                    +
                  </span>

                  <span>WIFI</span>
                  <span className="text-emerald-400/60">
                    +
                  </span>

                  <span>SHARED BILLS</span>
                  <span className="text-emerald-400/60">
                    +
                  </span>
                </React.Fragment>
              ))}
            </motion.div>
          </div>

          {/* STATS */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Total bills',
                value: `₹${totalBills.toFixed(2)}`,
                detail: `${bills.length} recorded`,
                icon: Wallet,
                accent: 'text-emerald-400',
                bg: 'bg-emerald-400/10',
              },
              {
                label: 'Pending',
                value: `₹${pendingAmount.toFixed(2)}`,
                detail: `${pendingBills.length} bills`,
                icon: Clock3,
                accent: 'text-amber-400',
                bg: 'bg-amber-400/10',
              },
              {
                label: 'Overdue',
                value: `₹${overdueAmount.toFixed(2)}`,
                detail: `${overdueBills.length} bills`,
                icon: AlertCircle,
                accent: 'text-red-400',
                bg: 'bg-red-400/10',
              },
              {
                label: 'Roommates',
                value: users.length.toString(),
                detail: `${paidBills.length} paid bills`,
                icon: User,
                accent: 'text-cyan-400',
                bg: 'bg-cyan-400/10',
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
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

          {/* SEARCH + HEADING */}
          <section>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Bill history
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Know what is coming.
                </h2>

                <p className="mt-2 max-w-xl text-sm text-white/35">
                  Track due dates, payment status and
                  who covered each bill.
                </p>
              </div>

              <span className="text-sm text-white/25">
                {filteredBills.length}{' '}
                {filteredBills.length === 1
                  ? 'bill'
                  : 'bills'}
              </span>
            </div>

            <div className="group relative mt-6 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-emerald-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search bills, roommates or status..."
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] py-4 pl-11 pr-20 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/20 focus:border-emerald-400/30 focus:bg-white/[0.04] focus:ring-4 focus:ring-emerald-400/5"
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
          </section>

          {/* BILL LIST */}
          <section>
            {filteredBills.length === 0 ? (
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
                  <CreditCard className="h-7 w-7 text-emerald-400" />
                </div>

                <h3 className="mt-6 text-xl font-semibold">
                  {search
                    ? 'Nothing matched your search'
                    : 'No bills yet'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">
                  {search
                    ? 'Try a different bill name, roommate or status.'
                    : 'Add your first shared bill and keep upcoming payments visible.'}
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
                      setShowAddBill(true)
                    }
                    className="mt-6 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Add First Bill
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {filteredBills
                    .slice()
                    .reverse()
                    .map((bill, index) => {
                      const status =
                        getBillStatus(bill);

                      const config =
                        statusConfig[status];

                      const StatusIcon =
                        config.icon;

                      return (
                        <motion.div
                          key={bill.id}
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
                          whileHover={{
                            y: -2,
                          }}
                          className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-colors duration-300 hover:border-white/[0.15] hover:bg-white/[0.035] md:p-6"
                        >
                          {/* STATUS ACCENT */}
                          <div
                            className={`absolute bottom-0 left-0 top-0 w-0.5 ${
                              status === 'paid'
                                ? 'bg-emerald-400'
                                : status ===
                                    'pending'
                                  ? 'bg-amber-400'
                                  : 'bg-red-400'
                            }`}
                          />

                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                            {/* BILL INFO */}
                            <div className="flex min-w-0 flex-1 items-center gap-4">
                              <motion.div
                                whileHover={{
                                  rotate: -4,
                                }}
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                  status ===
                                  'overdue'
                                    ? 'bg-red-400/10'
                                    : status ===
                                        'pending'
                                      ? 'bg-amber-400/10'
                                      : 'bg-emerald-400/10'
                                }`}
                              >
                                <CreditCard
                                  className={`h-5 w-5 ${
                                    status ===
                                    'overdue'
                                      ? 'text-red-400'
                                      : status ===
                                          'pending'
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                  }`}
                                />
                              </motion.div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-sm font-semibold md:text-base">
                                    {bill.description}
                                  </h3>

                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${config.className}`}
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {config.label}
                                  </span>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/30">
                                  <span className="flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5" />

                                    Due{' '}
                                    {formatDate(
                                      bill.dueDate
                                    )}
                                  </span>

                                  <span className="hidden h-1 w-1 rounded-full bg-white/15 sm:block" />

                                  <span>
                                    Paid by{' '}
                                    <span className="text-white/55">
                                      {bill.paidBy
                                        ?.name ||
                                        'Unknown'}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ACTIONS */}
                            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4 lg:border-t-0 lg:pt-0 lg:justify-end">
                              <div className="mr-auto lg:mr-2">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/20 lg:hidden">
                                  Amount
                                </p>

                                <p className="mt-0.5 text-xl font-bold tracking-tight">
                                  ₹
                                  {bill.amount.toFixed(
                                    2
                                  )}
                                </p>
                              </div>

                              {status !== 'paid' ? (
                                <motion.button
                                  type="button"
                                  whileTap={{
                                    scale: 0.97,
                                  }}
                                  onClick={() =>
                                    handleMarkPaid(
                                      bill
                                    )
                                  }
                                  className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-400/15"
                                >
                                  Mark Paid
                                </motion.button>
                              ) : (
                                <motion.button
                                  type="button"
                                  whileTap={{
                                    scale: 0.97,
                                  }}
                                  onClick={() =>
                                    handleMarkPending(
                                      bill
                                    )
                                  }
                                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                                >
                                  Mark Pending
                                </motion.button>
                              )}

                              <motion.button
                                type="button"
                                whileTap={{
                                  scale: 0.95,
                                }}
                                onClick={() =>
                                  handleDeleteBill(
                                    bill
                                  )
                                }
                                className="rounded-xl p-2 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                                title="Delete bill"
                              >
                                <Trash2 className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* INFO STRIP */}
          <motion.section
            initial={{
              opacity: 0,
              y: 15,
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
              duration: 0.5,
            }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-400/[0.04] blur-3xl" />

            <div className="relative flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
                <Sparkles className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                  Roommate rule
                </p>

                <h3 className="mt-1 font-semibold">
                  Bills stay visible until they are
                  paid.
                </h3>

                <p className="mt-1 text-sm leading-6 text-white/30">
                  Use the status controls to keep the
                  room's shared commitments up to date.
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </motion.main>

      {/* ADD BILL MODAL */}
      <AnimatePresence>
        {showAddBill && (
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget
              ) {
                resetForm();
                setShowAddBill(false);
              }
            }}
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
                scale: 0.96,
                y: 10,
              }}
              transition={{
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/[0.1] bg-slate-900 shadow-2xl shadow-black/50"
            >
              {/* MODAL HEADER */}
              <div className="relative border-b border-white/[0.07] px-6 py-6">
                <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-emerald-400/[0.05] blur-3xl" />

                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                      <CreditCard className="h-3.5 w-3.5" />
                      Shared commitment
                    </div>

                    <h2 className="mt-2 text-xl font-bold">
                      Add Bill
                    </h2>

                    <p className="mt-1 text-sm text-white/30">
                      Keep the room's next payment visible.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowAddBill(false);
                    }}
                    className="rounded-xl p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleAddBill}
                className="space-y-5 p-6"
              >
                {/* DESCRIPTION */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Bill description
                  </label>

                  <input
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Electricity Bill"
                    autoFocus
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-400/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-emerald-400/5"
                  />
                </div>

                {/* AMOUNT + DATE */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/70">
                      Amount
                    </label>

                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(event) =>
                          setAmount(
                            event.target.value
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-400/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-emerald-400/5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/70">
                      Due date
                    </label>

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) =>
                        setDueDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-emerald-400/5"
                    />
                  </div>
                </div>

                {/* PAID BY */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Paid by
                  </label>

                  <select
                    value={paidById}
                    onChange={(event) =>
                      setPaidById(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400/30 focus:ring-4 focus:ring-emerald-400/5"
                  >
                    {users.map((user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* INFO */}
                <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />

                  <p className="text-xs leading-5 text-white/30">
                    This bill will be associated
                    with all current roommates.
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowAddBill(false);
                    }}
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Cancel
                  </button>

                  <motion.button
                    type="submit"
                    disabled={
                      !description.trim() ||
                      Number(amount) <= 0 ||
                      !dueDate ||
                      !paidById
                    }
                    whileTap={{
                      scale: 0.98,
                    }}
                    className="flex-1 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add Bill
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Bills;