import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Info,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import { useExpenses } from '../../context/ExpenseContext';

const CURRENT_USER_ID = 'u1';
const DEFAULT_BUDGET = 15000;

interface BalanceMap {
  [userId: string]: number;
}

const money = (value: number) =>
  `₹${Math.abs(value).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

const calculateBalances = (expenses: ReturnType<typeof useExpenses>['expenses'], userIds: string[]): BalanceMap => {
  const balances: BalanceMap = {};
  userIds.forEach((id) => {
    balances[id] = 0;
  });

  expenses.forEach((expense) => {
    const participants = expense.participants?.length ? expense.participants : userIds;
    if (!participants.length) return;

    const totalPaise = Math.round(expense.amount * 100);
    const baseShare = Math.floor(totalPaise / participants.length);
    const remainder = totalPaise % participants.length;

    participants.forEach((userId, index) => {
      balances[userId] = (balances[userId] ?? 0) - (baseShare + (index < remainder ? 1 : 0));
    });

    expense.contributions?.forEach((contribution) => {
      balances[contribution.userId] =
        (balances[contribution.userId] ?? 0) + Math.round(contribution.amount * 100);
    });
  });

  Object.keys(balances).forEach((id) => {
    balances[id] = balances[id] / 100;
  });

  return balances;
};

const MonthlyCommandCenter: React.FC = () => {
  const { expenses, users } = useExpenses();
  const [now, setNow] = useState(() => new Date());
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem('roommate_monthly_budget');
    const parsed = saved ? Number(saved) : DEFAULT_BUDGET;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BUDGET;
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('roommate_monthly_budget', String(budget));
  }, [budget]);

  const currentMonthExpenses = useMemo(() => {
    const key = monthKey(now);
    return expenses.filter((expense) => monthKey(new Date(expense.date)) === key);
  }, [expenses, now]);

  const monthTotal = useMemo(
    () => currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [currentMonthExpenses]
  );

  const balances = useMemo(
    () => calculateBalances(currentMonthExpenses, users.map((user) => user.id)),
    [currentMonthExpenses, users]
  );

  const myBalance = balances[CURRENT_USER_ID] ?? 0;

  const categories = useMemo(() => {
    const result: Record<string, number> = {};
    currentMonthExpenses.forEach((expense) => {
      const description = expense.description.toLowerCase();
      const category = description.includes('grocery') || description.includes('food') || description.includes('dinner') || description.includes('lunch')
        ? 'Food'
        : description.includes('electric') || description.includes('water') || description.includes('internet') || description.includes('wifi')
          ? 'Bills'
          : description.includes('movie') || description.includes('game') || description.includes('trip')
            ? 'Entertainment'
            : 'Other';
      result[category] = (result[category] ?? 0) + expense.amount;
    });
    return Object.entries(result).sort((a, b) => b[1] - a[1]);
  }, [currentMonthExpenses]);

  const previousMonthTotals = useMemo(() => {
    return [1, 2, 3].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = monthKey(date);
      return expenses
        .filter((expense) => monthKey(new Date(expense.date)) === key)
        .reduce((sum, expense) => sum + expense.amount, 0);
    });
  }, [expenses, now]);

  const historicalAverage = previousMonthTotals.filter((value) => value > 0).length
    ? previousMonthTotals.filter((value) => value > 0).reduce((a, b) => a + b, 0) / previousMonthTotals.filter((value) => value > 0).length
    : 0;

  const unusualSpending = historicalAverage > 0 && monthTotal > historicalAverage * 1.25;

  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const remainingMs = Math.max(0, monthEnd.getTime() - now.getTime());
  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);

  const budgetUsed = budget > 0 ? Math.min(100, (monthTotal / budget) * 100) : 0;
  const remainingBudget = budget - monthTotal;

  const topCategory = categories[0];
  const settlementText = myBalance < -0.01
    ? `You should pay ${money(myBalance)} at month-end.`
    : myBalance > 0.01
      ? `You should receive ${money(myBalance)} at month-end.`
      : 'Your current month balance is settled.';

  return (
    <section className="mb-12 space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-400">
            <CalendarClock className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Monthly command center</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{getMonthLabel(now)} · close-out</h2>
          <p className="mt-1 text-sm text-white/30">ROOMMATE turns this month&apos;s expenses into a clear settlement.</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">Month closes in</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">{days}d {hours}h {minutes}m</p>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] md:grid-cols-3">
        <motion.div whileHover={{ backgroundColor: 'rgba(255,255,255,0.035)' }} className="bg-[#020617] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-white/30">This month</p>
          <p className="mt-2 text-3xl font-semibold">{money(monthTotal)}</p>
          <p className="mt-1 text-xs text-white/25">{currentMonthExpenses.length} shared expenses</p>
        </motion.div>
        <motion.div whileHover={{ backgroundColor: 'rgba(255,255,255,0.035)' }} className="bg-[#020617] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-white/30">Your balance</p>
          <p className={`mt-2 text-3xl font-semibold ${myBalance < -0.01 ? 'text-amber-400' : myBalance > 0.01 ? 'text-emerald-400' : 'text-white'}`}>
            {myBalance === 0 ? '₹0' : money(myBalance)}
          </p>
          <p className="mt-1 text-xs text-white/25">{settlementText}</p>
        </motion.div>
        <motion.div whileHover={{ backgroundColor: 'rgba(255,255,255,0.035)' }} className="bg-[#020617] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-white/30">Room budget</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold">{money(Math.max(0, remainingBudget))}</p>
            <PiggyBank className="mb-1 h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-1 text-xs text-white/25">remaining from {money(budget)}</p>
        </motion.div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold">Month-end preview</h3>
              </div>
              <p className="mt-1 text-sm text-white/30">The amount is calculated from contributions versus each person&apos;s fair share.</p>
            </div>
            <div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-400"><CircleDollarSign className="h-5 w-5" /></div>
          </div>

          <div className="mt-6 rounded-xl border border-white/[0.07] bg-[#020617] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/25">For Hanish</p>
            <p className="mt-2 text-2xl font-semibold">{settlementText}</p>
            <div className="mt-5 flex items-center gap-2 text-xs text-white/35">
              <Info className="h-3.5 w-3.5" />
              This is a preview. No payment is made automatically.
            </div>
          </div>

          {unusualSpending && (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-300">Spending is running higher than usual</p>
                <p className="mt-1 text-xs text-white/35">This month is more than 25% above the average of available previous months.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold">Where is the money going?</h3>
          </div>
          <div className="mt-5 space-y-4">
            {categories.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/25">Add expenses to see your spending breakdown.</p>
            ) : categories.map(([category, value]) => {
              const percent = monthTotal ? (value / monthTotal) * 100 : 0;
              return (
                <div key={category}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-white/65">{category}</span>
                    <span className="text-white/35">{percent.toFixed(0)}% · {money(value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full rounded-full bg-emerald-400" />
                  </div>
                </div>
              );
            })}
          </div>
          {topCategory && <p className="mt-5 flex items-center gap-2 text-xs text-white/30"><ArrowRight className="h-3 w-3 text-emerald-400" /> Biggest category: <span className="text-white/60">{topCategory[0]}</span></p>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Room budget</h3>
              <p className="mt-1 text-xs text-white/30">Set a shared monthly spending target.</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2">
              <span className="text-sm text-white/30">₹</span>
              <input type="number" min="1" value={budget} onChange={(event) => setBudget(Math.max(1, Number(event.target.value) || 1))} className="w-24 bg-transparent py-2 text-right text-sm text-white outline-none" />
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]"><motion.div animate={{ width: `${budgetUsed}%` }} className="h-full rounded-full bg-emerald-400" /></div>
          <div className="mt-2 flex justify-between text-xs text-white/30"><span>{budgetUsed.toFixed(0)}% used</span><span>{money(monthTotal)} / {money(budget)}</span></div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><h3 className="font-semibold">Monthly close-out checklist</h3></div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-white/55">Expenses recorded</span><span className="text-emerald-400">{currentMonthExpenses.length}</span></div>
            <div className="flex items-center justify-between"><span className="text-white/55">Top category</span><span className="text-white/70">{topCategory?.[0] ?? '—'}</span></div>
            <div className="flex items-center justify-between"><span className="text-white/55">Previous-month average</span><span className="text-white/70">{historicalAverage ? money(historicalAverage) : 'Not enough data'}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MonthlyCommandCenter;
