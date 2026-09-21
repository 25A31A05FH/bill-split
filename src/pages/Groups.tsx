import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Search,
  Users,
  Home,
  Utensils,
  Zap,
  Gamepad2,
  MoreHorizontal,
  Trash2,
  X,
  ChevronRight,
  UserPlus,
  Sparkles,
  Layers3,
} from 'lucide-react';

import Sidebar from '../components/layout/Sidebar';
import { useExpenses } from '../context/ExpenseContext';
import type { SplitGroup } from '../types';

const groupTypeOptions: {
  value: SplitGroup['type'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'household',
    label: 'Household',
    icon: Home,
  },
  {
    value: 'food',
    label: 'Food',
    icon: Utensils,
  },
  {
    value: 'utilities',
    label: 'Utilities',
    icon: Zap,
  },
  {
    value: 'entertainment',
    label: 'Entertainment',
    icon: Gamepad2,
  },
  {
    value: 'other',
    label: 'Other',
    icon: MoreHorizontal,
  },
];

const Groups: React.FC = () => {
  const {
    groups,
    users,
    expenses,
    addGroup,
    deleteGroup,
  } = useExpenses();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [type, setType] =
    useState<SplitGroup['type']>('household');
  const [description, setDescription] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return groups;
    }

    return groups.filter((group) => {
      const groupName = group.name.toLowerCase();
      const groupType = group.type.toLowerCase();
      const groupDescription =
        group.description?.toLowerCase() || '';

      return (
        groupName.includes(query) ||
        groupType.includes(query) ||
        groupDescription.includes(query)
      );
    });
  }, [groups, search]);

  const getGroupIcon = (
    groupType: SplitGroup['type']
  ) => {
    return (
      groupTypeOptions.find(
        (item) => item.value === groupType
      )?.icon || MoreHorizontal
    );
  };

  const getGroupLabel = (
    groupType: SplitGroup['type']
  ) => {
    return (
      groupTypeOptions.find(
        (item) => item.value === groupType
      )?.label || 'Other'
    );
  };

  const getGroupExpenseTotal = (group: SplitGroup) => {
    return expenses
      .filter((expense) => {
        if (expense.groupId) {
          return expense.groupId === group.id;
        }

        const normalizedName = group.name.trim().toLowerCase();
        const description = expense.description?.toLowerCase() || '';
        const location = expense.location?.toLowerCase() || '';

        return (
          description.includes(normalizedName) ||
          location.includes(normalizedName)
        );
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
  };

  const resetForm = () => {
    setName('');
    setType('household');
    setDescription('');
    setCreateError('');
    setIsCreating(false);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateGroup(true);
  };

  const closeCreateModal = () => {
    if (isCreating) {
      return;
    }

    resetForm();
    setShowCreateGroup(false);
  };

  const handleCreateGroup = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      setCreateError('Please enter a group name.');
      return;
    }

    if (isCreating) {
      return;
    }

    try {
      setIsCreating(true);
      setCreateError('');

      await addGroup({
        name: cleanName,
        type,
        description: cleanDescription || undefined,
      });

      resetForm();
      setShowCreateGroup(false);
    } catch (error) {
      console.error('Failed to create group:', error);

      setCreateError(
        'Could not create the group. Please try again.'
      );
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (
    group: SplitGroup
  ) => {
    const confirmed = window.confirm(
      `Delete "${group.name}"?\n\nThis removes the group from ROOMMATE.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteGroup(group.id);
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      {/* AMBIENT BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-violet-500/5 blur-3xl" />
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
                Groups
              </h1>
            </div>

            <motion.button
              type="button"
              onClick={openCreateModal}
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
                New Group
              </span>

              <span className="sm:hidden">
                New
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

            <div className="relative">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                    <Layers3 className="h-4 w-4" />
                    Shared spaces
                  </div>

                  <h2 className="mt-5 text-4xl font-bold leading-[0.95] tracking-[-0.045em] text-white sm:text-5xl md:text-6xl">
                    Organize the
                    <br />
                    <span className="text-white/35">
                      shared stuff.
                    </span>
                  </h2>

                  <p className="mt-6 max-w-2xl text-sm leading-7 text-white/45 md:text-base">
                    Keep household costs, food,
                    utilities and everything else
                    separated into simple spaces.
                  </p>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[360px]">
                  {[
                    {
                      label: 'Groups',
                      value: groups.length,
                    },
                    {
                      label: 'Roommates',
                      value: users.length,
                    },
                    {
                      label: 'Expenses',
                      value: expenses.length,
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{
                        opacity: 0,
                        y: 15,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: 0.2 + index * 0.08,
                      }}
                      className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 sm:text-[10px]">
                        {stat.label}
                      </p>

                      <p className="mt-2 text-xl font-bold sm:text-2xl">
                        {stat.value}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* MOVING LABEL */}
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
              {Array.from({ length: 10 }).map(
                (_, index) => (
                  <React.Fragment key={index}>
                    <span>HOUSEHOLD</span>
                    <span className="text-emerald-400/60">
                      +
                    </span>

                    <span>FOOD</span>
                    <span className="text-emerald-400/60">
                      +
                    </span>

                    <span>UTILITIES</span>
                    <span className="text-emerald-400/60">
                      +
                    </span>

                    <span>ENTERTAINMENT</span>
                    <span className="text-emerald-400/60">
                      +
                    </span>
                  </React.Fragment>
                )
              )}
            </motion.div>
          </div>

          {/* SEARCH */}
          <section>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Your spaces
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  Everything has a place.
                </h2>

                <p className="mt-2 max-w-xl text-sm text-white/35">
                  Create focused groups and keep
                  shared spending easier to understand.
                </p>
              </div>

              <span className="text-sm text-white/25">
                {filteredGroups.length}{' '}
                {filteredGroups.length === 1
                  ? 'group'
                  : 'groups'}
              </span>
            </div>

            <div className="group relative mt-6 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-emerald-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search groups..."
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

          {/* GROUPS */}
          <section>
            {filteredGroups.length === 0 ? (
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
                  <Users className="h-7 w-7 text-emerald-400" />
                </div>

                <h3 className="mt-6 text-xl font-semibold">
                  {search
                    ? 'Nothing matched your search'
                    : 'No groups yet'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">
                  {search
                    ? 'Try a different group name or category.'
                    : 'Create your first shared space for organizing expenses.'}
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
                    onClick={openCreateModal}
                    className="mt-6 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Create First Group
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                layout
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              >
                <AnimatePresence initial={false}>
                  {filteredGroups.map(
                    (group, index) => {
                      const Icon = getGroupIcon(
                        group.type
                      );

                      const expenseTotal =
                        getGroupExpenseTotal(group);

                      return (
                        <motion.div
                          key={group.id}
                          layout
                          initial={{
                            opacity: 0,
                            y: 24,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.97,
                          }}
                          transition={{
                            delay: index * 0.05,
                            duration: 0.45,
                            ease: [
                              0.22,
                              1,
                              0.36,
                              1,
                            ],
                          }}
                          whileHover={{
                            y: -4,
                          }}
                          className="group relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5 transition-colors duration-300 hover:border-white/[0.15] hover:bg-white/[0.04]"
                        >
                          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-400/[0.04] blur-3xl transition-all duration-500 group-hover:bg-emerald-400/[0.08]" />

                          <div className="relative flex items-start justify-between">
                            <motion.div
                              whileHover={{
                                rotate: -4,
                              }}
                              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10"
                            >
                              <Icon className="h-5 w-5 text-emerald-400" />
                            </motion.div>

                            <motion.button
                              type="button"
                              whileTap={{
                                scale: 0.95,
                              }}
                              onClick={() =>
                                handleDeleteGroup(
                                  group
                                )
                              }
                              className="rounded-xl p-2 text-white/20 opacity-0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                              title="Delete group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          </div>

                          <div className="relative mt-6">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="min-w-0 truncate text-lg font-semibold tracking-tight">
                                {group.name}
                              </h3>

                              <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35">
                                {getGroupLabel(
                                  group.type
                                )}
                              </span>
                            </div>

                            <p className="mt-2 min-h-[40px] text-sm leading-5 text-white/30">
                              {group.description ||
                                'Shared expenses for this group.'}
                            </p>
                          </div>

                          <div className="relative mt-6 grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/20">
                                Members
                              </p>

                              <div className="mt-2 flex items-center gap-2">
                                <Users className="h-4 w-4 text-cyan-400" />

                                <span className="font-semibold">
                                  {users.length}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/20">
                                Matched spend
                              </p>

                              <div className="mt-2">
                                <span className="font-semibold text-emerald-400">
                                  ₹
                                  {expenseTotal.toFixed(
                                    0
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="relative mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                            <div className="flex -space-x-2">
                              {users
                                .slice(0, 4)
                                .map((user) => (
                                  <motion.div
                                    key={user.id}
                                    whileHover={{
                                      y: -3,
                                      zIndex: 10,
                                    }}
                                    title={user.name}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-[10px] font-bold text-white"
                                  >
                                    {user.name
                                      .charAt(0)
                                      .toUpperCase()}
                                  </motion.div>
                                ))}
                            </div>

                            <button
                              type="button"
                              className="group/link flex items-center gap-1.5 text-xs font-semibold text-white/30 transition hover:text-emerald-400"
                            >
                              View group

                              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </section>

          {/* ROOMMATES */}
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
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-cyan-400/[0.04] blur-3xl" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                  <UserPlus className="h-5 w-5 text-cyan-400" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                    Current room
                  </p>

                  <h3 className="mt-1 font-semibold">
                    {users.length} roommates
                  </h3>

                  <p className="mt-1 text-sm text-white/30">
                    {users
                      .map((user) => user.name)
                      .join(' • ')}
                  </p>
                </div>
              </div>

              <div className="flex -space-x-2">
                {users.map((user) => (
                  <motion.div
                    key={user.id}
                    whileHover={{
                      y: -4,
                    }}
                    title={user.name}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-xs font-bold text-white"
                  >
                    {user.name
                      .charAt(0)
                      .toUpperCase()}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </motion.main>

      {/* CREATE GROUP MODAL */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !isCreating
              ) {
                closeCreateModal();
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
                      <Sparkles className="h-3.5 w-3.5" />
                      New shared space
                    </div>

                    <h2 className="mt-2 text-xl font-bold">
                      Create Group
                    </h2>

                    <p className="mt-1 text-sm text-white/30">
                      Give your shared expenses a home.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={closeCreateModal}
                    className="rounded-xl p-2 text-white/30 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleCreateGroup}
                className="space-y-5 p-6"
              >
                {/* NAME */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Group name
                  </label>

                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setCreateError('');
                    }}
                    placeholder="e.g. Weekend Trips"
                    autoFocus
                    disabled={isCreating}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-400/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-emerald-400/5 disabled:opacity-50"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Category
                  </label>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {groupTypeOptions.map(
                      (option) => {
                        const Icon = option.icon;
                        const active =
                          type === option.value;

                        return (
                          <motion.button
                            key={option.value}
                            type="button"
                            disabled={isCreating}
                            whileTap={{
                              scale: 0.97,
                            }}
                            onClick={() =>
                              setType(
                                option.value
                              )
                            }
                            className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-medium transition-all duration-200 ${
                              active
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                                : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white'
                            } disabled:opacity-40`}
                          >
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </motion.button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Description
                    <span className="ml-2 text-xs text-white/20">
                      optional
                    </span>
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="What is this group used for?"
                    rows={3}
                    disabled={isCreating}
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-emerald-400/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-emerald-400/5 disabled:opacity-50"
                  />
                </div>

                {/* ERROR */}
                <AnimatePresence>
                  {createError && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        height: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: 'auto',
                      }}
                      exit={{
                        opacity: 0,
                        height: 0,
                      }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                        {createError}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* INFO */}
                <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />

                  <p className="text-xs leading-5 text-white/30">
                    All current roommates will be
                    available for expenses associated
                    with this group.
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={closeCreateModal}
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <motion.button
                    type="submit"
                    disabled={
                      !name.trim() || isCreating
                    }
                    whileTap={{
                      scale: 0.98,
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCreating ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
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

export default Groups;