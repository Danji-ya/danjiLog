# danjiLog 🐱

A **mobile-first Progressive Web App (PWA)** for tracking a family's cat's daily water intake and meals.

Designed for shared household use, danjiLog allows family members to quickly record and monitor their cat's daily activities through a simple passcode-based login while keeping data secure with Supabase Authentication and Row Level Security (RLS).

> **Status:** Personal Project

---

## 🎯 Project Goal

Provide a simple, fast, and mobile-friendly way for family members to record and monitor their cat's daily water intake and meals.

---

## ✨ Features

* Shared passcode login for the whole family
* Record, edit, and delete water and meal logs
* View daily, weekly, and monthly statistics
* Browse records with a calendar view
* Install as a Progressive Web App with offline support
* Dark mode support

---

## 🚀 Technical Highlights

* Mobile-first responsive design
* Secure authentication with Supabase Auth and Row Level Security (RLS)
* Progressive Web App (PWA) with offline caching
* Family-oriented shared account experience

---

## 🏗 Architecture

```text
React (Vite)
      │
TanStack Query
      │
Supabase
  ├── Authentication
  └── PostgreSQL
```

---

## 🛠 Tech Stack

| Category         | Stack                   |
| ---------------- | ----------------------- |
| Frontend         | React, TypeScript, Vite |
| Styling          | Tailwind CSS            |
| Backend          | Supabase                |
| Routing          | React Router            |
| State Management | TanStack Query          |
| Forms            | React Hook Form, Zod    |
| Date             | dayjs                   |
| PWA              | Service Worker          |

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a new Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Create a shared account in **Authentication → Users**.
4. (Optional) Disable **Confirm email** to allow immediate login.

The provided schema will:

* Create the required database tables
* Apply Row Level Security (RLS) policies
* Insert a default cat record

---

### 3. Configure environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

| Variable                  | Description                   |
| ------------------------- | ----------------------------- |
| `VITE_SUPABASE_URL`       | Supabase project URL          |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anonymous public key |
| `VITE_FAMILY_LOGIN_EMAIL` | Shared login email            |

---

### 4. Start the development server

```bash
npm run dev
```

---

### 5. Build for production

```bash
npm run build
npm run preview
```

---

## 🔐 Authentication

Family members sign in using a shared passcode.

Authentication is handled by Supabase Auth, allowing the application to maintain authenticated sessions required for Row Level Security (RLS). The passcode is verified by Supabase and is never embedded in the client bundle.

---

## 📂 Project Structure

```text
src
├── components    # Reusable UI components
├── contexts      # Authentication context
├── hooks         # Custom React hooks
├── layouts       # Shared layouts
├── lib           # Shared libraries and clients
├── pages         # Route pages
├── services      # Supabase data layer
├── types         # Type definitions
└── utils         # Utility functions
```

---

## 🔮 Future Plans

* Multi-cat support
* Health records
* Push notifications
* Data export
* Home screen widgets
