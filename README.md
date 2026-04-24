# Ecommerce CRM – Modular Operating System

This project is not just a CRM, it is a comprehensive **Revenue & Financial Operating System** designed as a modular backend. It tracks state transitions across teams (Sales, Operations, Support, Marketing, and Management) and handles the "who gets paid, how much, and why."

## System Architecture

The system is built as a set of modular services connected via an **API Gateway** and an **Event Bus**.

### Core Services

1. **Auth Service:** Authentication, RBAC, session management.
2. **Users/Customer Service:** User profiles, staff management, role assignments.
3. **Lead/Sales Service:** Lead assignment, sales pipelines, CRM flows.
4. **Order/Inventory Service:** Stock validation, fulfillment tracking, shipping queues.
5. **Messaging Service:** Omnichannel conversation tracking (WhatsApp-style).
6. **Automation Service:** Cross-cutting event engine (e.g., triggers task on delivery failure).
7. **Analytics Service:** Aggregated metrics for Executive Dashboards.
8. **Financial Service:** 
   - Revenue Tracking (realized income on delivery)
   - Expense Management (COGS, marketing, logistics)
   - Commissions Engine (sales, ops, affiliates)
   - Payroll System (base + commission + bonuses)
   - Profit Calculation
   - Wallets / Ledgers (Double-entry system)

## Sprint Progress Log

### Sprint 1 – Authentication & User Management
**Status: ✅ Completed**

- [x] NestJS project bootstrap & Modular folder scaffolding
- [x] MongoDB integration
- [x] User schema and repository pattern
- [x] Password hashing with bcrypt
- [x] JWT authentication & Global validation pipes
- [x] Role-based access control (RBAC) guards
- [x] Swagger documentation for endpoints
- [x] Implemented API Endpoints (`POST /auth/login`, `POST /users`)

### Next Sprint – The Financial Engine & Orders
**Status: 🚧 Planning**

- Design the **Double-Entry Ledger System** for the Financial Service.
- Commission rule engine (configurable logic for agents).
- Order State Machine (Pending -> Packed -> Shipped -> Delivered).
- Emitting cross-service events (e.g., `EVENT: Order Delivered` -> `Record Revenue`).

## Crucial Design Patterns

- **Event-Driven:** Every service emits events (e.g., `lead.created`, `order.delivered`).
- **Role-Based Views:** A single entity (like an Order) yields different DTOs depending on whether Sales, Ops, or Management requests it.
- **Ledger-Based Balances:** Balances are never updated statically; they are computed via transaction ledgers (+ revenue, - commission, - COGS = real profit).