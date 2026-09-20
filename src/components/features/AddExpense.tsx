import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Calendar,
  MapPin,
  X,
  Plus,
  Users,
  Check,
  Receipt,
  Layers3,
} from 'lucide-react';
import { useExpenses } from '../../context/ExpenseContext';

interface AddExpenseProps {
  onSubmit: (expense: ExpenseFormData) => void;
  onCancel: () => void;
}

export interface ExpenseFormData {
  title: string;
  amount: number;
  date: string;
  location: string;
  receiptUrl?: string;
  groupId: string;
  contributions: {
    userId: string;
    amount: number;
  }[];
  participants: string[];
}

const AddExpense: React.FC<AddExpenseProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { users, groups } = useExpenses();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [location, setLocation] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const [groupId, setGroupId] = useState(
    groups[0]?.id ?? ''
  );

  const getMemberIdsForGroup = (selectedGroupId: string) => {
    const selectedGroup = groups.find(
      (group) => group.id === selectedGroupId
    );

    const memberIds = selectedGroup?.memberIds ?? [];

    if (memberIds.length > 0) {
      return memberIds.filter((id) =>
        users.some((user) => user.id === id)
      );
    }

    return users.map((user) => user.id);
  };

  const buildInitialContributions = (
    memberIds: string[]
  ) => {
    const initial: Record<string, string> = {};

    memberIds.forEach((userId, index) => {
      initial[userId] = index === 0 ? '' : '0';
    });

    return initial;
  };

  const [participants, setParticipants] = useState<string[]>(
    getMemberIdsForGroup(groups[0]?.id ?? '')
  );

  const [contributions, setContributions] = useState<
    Record<string, string>
  >(() =>
    buildInitialContributions(
      getMemberIdsForGroup(groups[0]?.id ?? '')
    )
  );

  useEffect(() => {
    const memberIds = getMemberIdsForGroup(groupId);

    setParticipants(memberIds);
    setContributions(
      buildInitialContributions(memberIds)
    );
  }, [groupId, groups, users]);

  const totalContributed = useMemo(() => {
    return Object.values(contributions).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0
    );
  }, [contributions]);

  const remaining = Math.round(
    ((Number(amount) || 0) - totalContributed) * 100
  ) / 100;

  const participantShare =
    participants.length > 0 && Number(amount) > 0
      ? Number(amount) / participants.length
      : 0;

  const toggleParticipant = (userId: string) => {
    setParticipants((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const updateContribution = (
    userId: string,
    value: string
  ) => {
    setContributions((current) => ({
      ...current,
      [userId]: value,
    }));
  };

  const fillRemainingFor = (userId: string) => {
    const otherContributions = Object.entries(contributions)
      .filter(([id]) => id !== userId)
      .reduce(
        (sum, [, value]) => sum + (Number(value) || 0),
        0
      );

    const remainingAmount = Math.max(
      0,
      (Number(amount) || 0) - otherContributions
    );

    updateContribution(
      userId,
      remainingAmount.toFixed(2)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter an expense title.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (!groupId) {
      alert('Please select a group.');
      return;
    }

    if (participants.length === 0) {
      alert('Select at least one participant.');
      return;
    }

    if (Math.abs(remaining) > 0.01) {
      alert(
        `Contributions must equal the total expense. Remaining: ₹${remaining.toFixed(
          2
        )}`
      );
      return;
    }

    const groupMemberIds =
      getMemberIdsForGroup(groupId);

    const contributionList = groupMemberIds
      .map((userId) => ({
        userId,
        amount: Number(contributions[userId]) || 0,
      }))
      .filter((item) => item.amount > 0);

    onSubmit({
      title: title.trim(),
      amount: Number(amount),
      date,
      location: location.trim(),
      receiptUrl,
      groupId,
      contributions: contributionList,
      participants,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 p-6 backdrop-blur-xl">
          <div>
            <p className="text-sm font-medium text-emerald-400">
              ROOMMATE
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              Add Expense
            </h2>
            <p className="mt-1 text-sm text-white/40">
              Track exactly who paid and who participated.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7 p-6">
          {/* Group */}
          <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.035] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10">
                <Layers3 className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <h3 className="font-semibold text-white">
                  Choose a group
                </h3>

                <p className="mt-0.5 text-sm text-white/40">
                  This expense will belong to the selected group.
                </p>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-300">
                No groups exist yet. Create a group first from the Groups page.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {groups.map((group) => {
                  const selected = group.id === groupId;
                  const memberCount = group.memberIds?.length ?? 0;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setGroupId(group.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? 'border-emerald-400/40 bg-emerald-400/10'
                          : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {group.name}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            {memberCount}{' '}
                            {memberCount === 1 ? 'member' : 'members'}
                          </p>
                        </div>

                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                              : 'border-white/15 bg-white/[0.03]'
                          }`}
                        >
                          {selected && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Basic Details */}
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Expense name
              </label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Electricity, groceries, dinner..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Total amount
                </label>

                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none placeholder:text-white/25 focus:border-emerald-400/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Date
                </label>

                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none focus:border-emerald-400/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Location
              </label>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />

                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="PG, supermarket, restaurant..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white outline-none placeholder:text-white/25 focus:border-emerald-400/50"
                />
              </div>
            </div>
          </div>

          {/* Contributors */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">
                    Who contributed?
                  </h3>
                </div>

                <p className="mt-1 text-sm text-white/40">
                  Members of the selected group can contribute.
                </p>
              </div>

              <div
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  Math.abs(remaining) < 0.01
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {remaining >= 0
                  ? `₹${remaining.toFixed(2)} remaining`
                  : `₹${Math.abs(remaining).toFixed(
                      2
                    )} over`}
              </div>
            </div>

            <div className="space-y-3">
              {getMemberIdsForGroup(groupId)
                .map((userId) =>
                  users.find((user) => user.id === userId)
                )
                .filter(
                  (user): user is (typeof users)[number] =>
                    Boolean(user)
                )
                .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 font-semibold text-emerald-300">
                    {user.name.charAt(0)}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {user.name}
                    </p>
                    <p className="text-xs text-white/35">
                      contributed
                    </p>
                  </div>

                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={contributions[user.id]}
                      onChange={(e) =>
                        updateContribution(
                          user.id,
                          e.target.value
                        )
                      }
                      placeholder="0"
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-7 pr-2 text-right text-white outline-none focus:border-emerald-400/50"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      fillRemainingFor(user.id)
                    }
                    className="rounded-lg bg-white/5 px-2 py-2 text-xs text-white/60 transition hover:bg-emerald-500/10 hover:text-emerald-400"
                  >
                    Fill
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <span className="text-white/40">
                Total contributed
              </span>

              <span className="font-semibold text-white">
                ₹{totalContributed.toFixed(2)} / ₹
                {(Number(amount) || 0).toFixed(2)}
              </span>
            </div>
          </section>

          {/* Participants */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />

              <div>
                <h3 className="font-semibold text-white">
                  Who participated?
                </h3>

                <p className="text-sm text-white/40">
                  Select everyone who should share this expense.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {getMemberIdsForGroup(groupId)
                .map((userId) =>
                  users.find((user) => user.id === userId)
                )
                .filter(
                  (user): user is (typeof users)[number] =>
                    Boolean(user)
                )
                .map((user) => {
                const selected = participants.includes(
                  user.id
                );

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      toggleParticipant(user.id)
                    }
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-emerald-400/40 bg-emerald-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/5'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        selected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {selected ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {user.name}
                      </p>

                      {selected &&
                        participantShare > 0 && (
                          <p className="text-xs text-emerald-400">
                            Share ₹
                            {participantShare.toFixed(
                              2
                            )}
                          </p>
                        )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Receipt */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Receipt
              <span className="ml-2 text-white/30">
                optional
              </span>
            </label>

            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) {
                  setReceiptUrl(file.name);
                }
              }}
              className="w-full rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-sm text-white/60"
            />

            {receiptUrl && (
              <p className="mt-2 text-xs text-emerald-400">
                ✓ {receiptUrl}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white transition hover:bg-white/10"
            >
              Cancel
            </button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20"
            >
              <Plus className="h-5 w-5" />
              Add Expense
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AddExpense;