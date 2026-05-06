# System Architecture – Ecommerce CRM

This document provides a technical overview of the architecture and core design patterns used in the Ecommerce CRM.

## Overview

The system is designed as a **Modular Monolith** using NestJS, following an **Event-Driven Architecture (EDA)**. This approach allows for decoupling between different business domains (e.g., Inventory, Orders, Finance) while maintaining a unified codebase.

## Core Design Patterns

### 1. Event-Driven Decoupling
Modules communicate primarily through asynchronous events using `@nestjs/event-emitter`. This prevents tight coupling between services. For example:
- The `OrdersService` doesn't need to know how to calculate commissions; it simply emits an `order.cash_remitted` event.
- The `FinanceService` listens for this event and handles the ledger entries.

### 2. Double-Entry Ledger System
The `FinanceModule` implements a robust financial engine:
- **Wallets**: Every agent and the system itself has a `Wallet`.
- **Transactions**: Every movement of money is recorded as an immutable `Transaction`.
- **Consistency**: The system ensures that every credit to one wallet is matched by a corresponding debit or revenue record, maintaining financial integrity.

### 3. Synchronous Inventory Reservation
To prevent overselling, the `InventoryModule` performs **synchronous reservation** during the order creation process.
- When an order is placed, stock is moved from `available` to `reserved`.
- Stock is only permanently deducted when the order is marked as `DELIVERED`.
- If an order is `CANCELLED`, the reserved stock is released back to the available pool.

## Module Responsibilities

### Leads & Sales Pipeline
- **LeadsModule**: Handles incoming webhooks from external marketing pages. It implements a basic round-robin assignment logic to distribute leads among Customer Service agents.
- **MediaBuyersModule**: Allows media buyers to log daily ad spend, which is then used to calculate CPA (Cost Per Acquisition) and other ROI metrics.

### Fulfillment & Logistics
- **OrdersModule**: Manages the lifecycle of an order. It acts as the primary orchestrator of the fulfillment flow.
- **LogisticsModule**: Handles the assignment of delivery agents and tracking of shipments.

### Dynamic Commissions
- **CommissionRulesModule**: Provides a flexible engine for calculating agent earnings. Rules can be:
    - **Global**: Default percentage or flat rate for all products.
    - **Product-Specific**: Custom rates for high-margin items.
    - **Quantity-Based**: Higher commissions for bulk sales (e.g., "Sell 5+, get $10/item").

## Technology Stack
- **Framework**: NestJS (Node.js)
- **Database**: MongoDB (Mongoose)
- **Documentation**: Swagger/OpenAPI
- **Event Bus**: Internal EventEmitter
