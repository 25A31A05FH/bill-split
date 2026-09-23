# ROOMMATE

A shared expense management application for roommates and shared households.

ROOMMATE provides a structured way to record expenses, manage contributions, define participants, organize expenses into groups, track bills, and calculate settlements between roommates.

## Demo

**Live Application:**  
https://bill-split-seven-amber.vercel.app/

**Walkthrough Video:**  
https://youtu.be/HNWGXV3dEKg

**Repository:**  
https://github.com/25A31A05FH/bill-split

---

## Overview

Shared household expenses can involve different contributors, different participants, and different amounts paid by each person.

ROOMMATE handles these cases by keeping the following information independent:

- Expense
- Contributors
- Participants
- Groups
- Bills
- Settlements

This allows an expense to represent the actual way money was contributed and shared rather than assuming that every expense is split equally between every roommate.

---

## Features

### Expense Management

- Create and manage shared expenses
- Record the total expense amount
- Specify the date and location
- Attach receipt information
- Select contributors
- Record individual contribution amounts
- Select participants independently

### Group Management

- Create custom expense groups
- Assign roommates to groups
- Associate expenses with a group
- Restrict contributors and participants to group members

### Settlement Calculation

The application calculates settlements using:

- Total expense amount
- Actual contributions
- Selected participants
- Individual participant shares

The resulting balances are used to determine the transfers required between roommates.

### Bill Management

- Create shared bills
- Set due dates
- Track payment status
- Identify pending, paid, and overdue bills
- Search and manage existing bills

### Dashboard

The dashboard provides an overview of:

- Total expenses
- Contributions
- Amounts owed
- Amounts to receive
- Recent expenses
- Roommate balances
- Current settlements

---

## Expense Model

An expense can contain multiple contributors with different contribution amounts.

For example:

| Roommate | Contribution |
|----------|-------------:|
| Hanish | ₹800 |
| Rahul | ₹400 |
| Arjun | ₹0 |

The participants of the expense can be selected independently.

For a ₹1,200 expense shared between three participants:

```text
₹1,200 / 3 = ₹400 per participant
The application compares each participant's share with their actual contribution and calculates the resulting balances.
Technology
Category
Technology
Frontend
React
Language
TypeScript
Build Tool
Vite
Styling
Tailwind CSS
Animation
Framer Motion
Icons
Lucide React
Routing
React Router
Deployment
Vercel
Project Structure
src/
├── components/
│   ├── features/
│   │   ├── AddExpense.tsx
│   │   ├── Expenses.tsx
│   │   ├── Bills.tsx
│   │   └── Groups.tsx
│   │
│   └── layout/
│       └── Sidebar.tsx
│
├── context/
│   └── ExpenseContext.tsx
│
├── types/
│   └── index.ts
│
├── App.tsx
├── main.tsx
└── index.css
Getting Started
Prerequisites
Node.js
npm
Installation
git clone https://github.com/25A31A05FH/bill-split.git
cd bill-split
npm install
Development
npm run dev
The development server will be available at:
http://localhost:5173
Production Build
npm run build
Deployment
The application is deployed using Vercel.
Production URL
https://bill-split-seven-amber.vercel.app/⁠�
Current Scope
ROOMMATE is currently implemented as a frontend-focused prototype.
Application data is managed through the application's client-side state and browser storage. The current version does not include a production backend, authentication system, or real payment processing.
Future Development
Potential extensions include:
User authentication
Cloud database integration
Real-time synchronization
Receipt OCR
Automated expense categorization
Recurring expenses
Monthly expense analytics
Notifications and reminders
UPI payment integration
Mobile application
License
This project was developed as a software hackathon project
