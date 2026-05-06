# Ecommerce CRM – Revenue & Financial Operating System

This project is a comprehensive **Revenue & Financial Operating System** designed as a modular backend. It tracks state transitions across operational teams (Sales, Operations, Support, Management) and specifically handles the critical "who gets paid, how much, and why."

## System Architecture

The system is built as a set of modular, decoupled services connected via an **API Gateway** and an **Event Bus** (`@nestjs/event-emitter`).

### Fully Implemented Core Services

1.  **Auth Service**: Authentication, JWT token generation, RBAC.
2.  **Users Service**: User profiles, staff management, role assignments (Admin, Sales Agent, Delivery Agent, etc.).
3.  **Products Service**: Management of physical products, pricing, and basic metadata.
4.  **Inventory Service**: Physical stock tracking and synchronous pre-reservation of stock when orders are placed.
5.  **Order Service**: End-to-end state machine for orders (Scheduled -> Shipped -> Delivered -> Cash Remitted).
6.  **Logistics Service**: Generates tracking codes and manages the assignment of orders to specific Delivery Agents.
7.  **Leads Service**: Captures interest from external sources (via webhooks) and auto-assigns leads to Customer Service agents.
8.  **Media Buyers Service**: Tracks advertising spend and calculates performance metrics like CPA.
9.  **Commission Rules Service**: Dynamic calculation of agent commissions based on global, product-specific, or quantity-based rules.
10. **Financial Service (The Ledger)**: 
    - Double-entry ledger architecture via Immutable `Transaction` logs.
    - Separate `Wallets` for the System and individual Staff/Agents.
    - Automated payouts triggered by order completion and cash remittance.

### Cross-Service Event Flows

To keep the architecture scalable and decoupled, modules communicate via asynchronous events:
- `order.scheduled`: Handled by `InventoryService` to immediately block/reserve stock so it cannot be oversold.
- `order.delivered`: Handled by `InventoryService` to permanently deduct the actual physical warehouse stock and release the reservation.
- `order.cash_remitted`: Handled by `FinanceService`. This triggers the double-entry bookkeeping:
  1. Records gross realized revenue to the System Wallet.
  2. Calculates the assigned Sales Agent's commission using `CommissionRulesService`.
  3. Creates a debit transaction against the System Wallet and a credit transaction to the Agent's Wallet.
- `order.cancelled`: Handled by `InventoryService` to release reserved stock back to the available pool.

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
- Emitting cross-service events (`EVENT: order.cash_remitted` -> `Record Revenue & Commissions`).

### Sprint 3 – Inventory & Logistics
**Status: ✅ Completed**
- Built `Product` schema to handle physical vs. reserved stock.
- Validates stock synchronously during order creation to prevent negative inventory.
- Built `LogisticsService` to handle `ASSIGNED` and `COMPLETED` delivery flows.

### Sprint 4 – Leads & External Integration
**Status: ✅ Completed**
- Built `LeadsService` to capture external interest.
- Implemented embeddable HTML lead capture snippet.
- Automated assignment of leads to available Customer Service agents.

### Sprint 5 – Dynamic Commissions & Media Buying
**Status: ✅ Completed**
- Built `CommissionRulesService` for granular commission control.
- Implemented `MediaBuyersService` for ad spend tracking and ROI analysis.

## API Documentation (Swagger)

A complete Swagger UI is automatically generated for this backend.
Run the application and navigate to:
```
http://localhost:8080/docs
```
It includes detailed schemas, request bodies, and token authorization for every endpoint across all implemented modules.

## Testing

Run the test suite using:
```bash
npm run test
```
The application maintains test coverage for all core services, ensuring that the ledger calculates profit accurately and stock is never oversold.