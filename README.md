# ROOMMATE

### Shared expenses. Finally simple.

<br />

**ROOMMATE** is an expense coordination platform for shared living.

It is built around a simple observation:

> **The person who records an expense isn't necessarily the person who paid for it.  
> And the people who paid aren't necessarily the people who used it.**

ROOMMATE models those relationships separately — then turns them into a clear settlement.

<br />

[**Live Demo ↗**](https://bill-split-hanish6.vercel.app/)  
[**Source ↗**](https://github.com/25A31A05FH/bill-split)

---

## The idea

Shared expenses are rarely as simple as:

`₹1200 ÷ 4`

Someone pays.

Someone contributes.

Someone doesn't.

Someone else joins the expense.

At the end of the month, everyone asks the same question:

**"Okay... who actually owes whom?"**

ROOMMATE handles that calculation for you.

---

## How it works

```text
                    EXPENSE
                       │
                       ▼
                    GROUP
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        CONTRIBUTORS         PARTICIPANTS
             │                   │
             └─────────┬─────────┘
                       ▼
                    BALANCES
                       │
                       ▼
                  SETTLEMENT
