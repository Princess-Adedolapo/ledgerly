<div align="center">

# Ledgerly

**A lightweight, multi-currency CRM & Client Workspace built for African SMBs and service businesses.**

Manage clients, invoice across global currencies (NGN, USD, EUR, GBP), track every deal through a visual pipeline, and process secure payments — all in one workspace.

[![Live Demo](https://img.shields.io/badge/demo-flowledgerly.ai.studio-6D5FFA?style=for-the-badge)](https://flowledgerly.ai.studio)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Paystack](https://img.shields.io/badge/Paystack-Payments-00C3F7?style=flat-square)

**[🔗 Live App Preview](https://flowledgerly.ai.studio)**

</div>

---

## 📖 Overview

Most CRMs are built for US/EU sales teams and treat local workflows, multi-currency conversion, and WhatsApp as an afterthought. **Ledgerly** flips that: it's built from the ground up for small teams, agencies, and freelancers operating in Nigeria and across Africa, where WhatsApp is the primary customer channel, seamless currency switching (Naira default with USD, EUR, and GBP support) is essential, and a "deal" often looks less like a sales pipeline and more like a client relationship moving from onboarding → active work → payment → resolution.

Ledgerly connects **Contacts**, **Invoices**, **Audit Trails**, and a **Workflow Board** into a single system — so a client's status, billing history, and communication log live in one place instead of three disconnected spreadsheets.

---

## ✨ Key Features

### 📊 Dashboard & Analytics
- **At-a-glance metrics:** Total contacts, active workflow items, total billed, paid, pending, and overdue invoices.
- **SLA monitoring:** Automatic flags for invoices overdue >7 days and workflow cards stalled >7 days.
- **Pipeline stage breakdown:** Visual distribution of clients across active workflow columns.
- **Dynamic revenue forecasting:** Cash received, billed pending, weighted pipeline value, and projected revenue over 30/60/90-day windows.
- **Customer 360 activity feed:** A live, chronological feed of client activities across the workspace.

### 👥 Contacts Management
- Full contact database with status (Lead / Active) and custom category tagging.
- Instant search and filtering by name, email, company, or status.
- CSV import and export for easy migration and offline backups.
- Linked profile view connecting contacts directly to their invoices, workflow cards, and communication logs.

### 🧾 Multi-Currency Invoicing
- Flexible invoice creation supporting **NGN (default), USD, EUR, and GBP** with real-time preview and custom branding.
- Support for line items, custom tax rates, discounts, and payment terms.
- Ledger view summarizing total billing health at a glance.
- PDF generation and single-click download capabilities.

### 💳 Payments & Paystack Integration
- **Paystack Inline Integration:** Seamless payment modal embedded directly into invoices and workflow cards.
- **Dual Mode Support:** Built to switch smoothly between Paystack Test and Live environments.
- **Automated Workflows:** Verified payments automatically:
  - Mark the invoice status as **Paid**.
  - Advance the associated workflow card (e.g., *Invoicing Pending → Resolved/Completed*).
  - Record the transaction reference to the client audit trail.

### 📋 Interactive Workflow Board
- Visual Kanban pipeline: **Onboarding → Active Support → Invoicing Pending → Resolved/Completed**.
- Card metadata: Priority tags, due dates, assigned members, status notes, and linked invoices.
- **Card Activity Logging:** Unified activity history (`public.card_activities`) tracking stage changes, invoice events, and notes.
- **Quick Actions:** Issue an invoice or open a messaging window directly from any card.

### 💬 Communication Tools
- Built-in **Email Composer** with customizable communication templates.
- **WhatsApp-First Messaging:** Quick launch links to start WhatsApp chats directly with clients.
- Automatic logging of outgoing communications to the client’s timeline.

---

## 🏗️ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS, Lucide Icons |
| **Routing** | React Router DOM |
| **Database & Backend** | Supabase (PostgreSQL, Realtime, Edge Functions) |
| **Payment Gateway** | Paystack API (Inline Checkout & Verification) |
| **PDF Generation** | jsPDF, html2canvas |
| **Hosting & CI/CD** | Google AI Studio |

---

## 🔐 Security & Compliance Hardening

Ledgerly implements enterprise-grade security standards across the full stack:

- **Row-Level Security (RLS):** Strict PostgreSQL policies ensure users can only access data belonging to their authorized workspace.
- **Environment Variable Protection:** Public keys (`VITE_` prefixed) are safely scoped to the client build, while confidential credentials (`PAYSTACK_SECRET_KEY`) reside exclusively in encrypted server/Edge Function environments.
- **Client-Side Input Sanitization:** Form inputs and API requests are validated to prevent cross-site scripting (XSS) and injection vulnerabilities.
- **Secure Fallbacks:** Graceful handling and activity fallbacks during network degradation or database sync delays.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A [Supabase](https://supabase.com) account and database project
- A [Paystack](https://paystack.com) account (Test Mode enabled)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/ledgerly.git
cd ledgerly
 
# Install dependencies
npm install
 
# Set up environment variables
cp .env.example .env
```
 
### Environment Variables
 
Create a `.env` file with the following:
 
```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```
 
> ⚠️ Your Paystack **secret key** should never be added to this file. It belongs only in your Supabase Edge Function secrets:
> ```bash
> supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_secret_key
> ```
 
### Running Locally
 
```bash
npm run dev      # Start the dev server
npm run build    # Production build
npm run preview  # Preview the production build
npm run typecheck # Type-check the project
npm run lint     # Lint the project
```
 
---
 
## 🗺️ Roadmap
 
- [ ] Recurring/subscription invoicing
- [ ] Automated overdue-invoice reminder sequences
- [ ] Two-way email sync
- [ ] WhatsApp Business API integration for direct sending
- [ ] Advanced reporting (conversion rates, sales cycle length, team performance)
- [ ] Role-based permissions beyond Owner
- [ ] Calendar integration for scheduling
- [ ] Public API / webhooks for third-party integrations
---
 
## 📄 License
 
This project is currently proprietary. All rights reserved.
 
---
 
<div align="center">
Built for African SMBs, agencies, and freelancers — built in public.
 
**[flowledgerly.ai.studio](https://flowledgerly.ai.studio)**
 
</div>


