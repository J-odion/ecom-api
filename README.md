# Ecommerce CRM – Revenue & Financial Operating System

This project is a comprehensive **Revenue & Financial Operating System** designed as a modular backend. It tracks state transitions across operational teams (Sales, Operations, Support, Management) and specifically handles the critical "who gets paid, how much, and why."

## System Architecture

The system is built as a set of modular, decoupled services connected via an **API Gateway** and an **Event Bus** (`@nestjs/event-emitter`).

### Fully Implemented Core Services

1. **Auth Service:** Authentication, JWT token generation, RBAC.
2. **Users Service:** User profiles, staff management, role assignments (Admin, Sales Agent, Delivery Agent, etc.).
3. **Inventory Service:** Physical stock tracking and synchronous pre-reservation of stock when orders are placed.
4. **Order Service:** End-to-end state machine for orders (Pending -> Packed -> Shipped -> Delivered).
5. **Logistics Service:** Generates tracking codes and manages the assignment of orders to specific Delivery Agents.
6. **Financial Service (The Ledger):** 
   - Double-entry ledger architecture via Immutable `Transaction` logs.
   - Separate `Wallets` for the System and individual Staff/Agents.
   - Configurable `commissionRate` per user.

### Cross-Service Event Flows

To keep the architecture scalable and decoupled, modules communicate via asynchronous events:
- `order.created`: Handled by `InventoryService` to immediately block/reserve stock so it cannot be oversold.
- `order.packed`: Handled by `InventoryService` to permanently deduct the actual physical warehouse stock and clear the reservation.
- `order.delivered`: Handled by `FinanceService`. This triggers the double-entry bookkeeping:
  1. Records gross realized revenue to the System Wallet.
  2. Calculates the assigned Sales Agent's commission.
  3. Creates a debit transaction against the System Wallet and a credit transaction to the Agent's Wallet.
- `delivery.assigned` & `delivery.completed`: Handled by `LogisticsService` to trigger notifications (or external webhooks).

## Sprint Progress Log

### Sprint 1 – Authentication & Users
**Status: ✅ Completed**
- Built out NestJS scaffolding with Mongoose.
- Implemented `UsersRepository` and JWT `AuthService`.
- Exposes `POST /auth/login` and `POST /users` (Admin only).

### Sprint 2 – The Financial Engine & Orders
**Status: ✅ Completed**
- Designed the **Double-Entry Ledger System** (`Wallet` and `Transaction` schemas).
- Built the `OrdersService` and `OrdersController`.
- Wired up `@nestjs/event-emitter`.
- Emitting cross-service events (`EVENT: order.delivered` -> `Record Revenue & Commissions`).

### Sprint 3 – Inventory & Logistics
**Status: ✅ Completed**
- Built `Product` schema to handle physical vs. reserved stock.
- Validates stock synchronously during order creation to prevent negative inventory.
- Built `LogisticsService` to handle `ASSIGNED` and `COMPLETED` delivery flows.

### Next Sprint – Messaging & Leads
**Status: 🚧 Planning**
- Build omnichannel conversation tracking (WhatsApp-style).
- Build Lead assignment and sales pipelines.

## API Documentation (Swagger)

A complete Swagger UI is automatically generated for this backend.
Run the application and navigate to:
```
http://localhost:3000/docs
```
It includes detailed schemas, request bodies, and token authorization for every endpoint across all 6 implemented modules.

## Testing

Run the test suite using:
```bash
npm run test
```
The application maintains test coverage for all core services, ensuring that the ledger calculates profit accurately and stock is never oversold.