# Frontend Developer API Manual - Ecommerce CRM

This guide documents every single endpoint available in the Ecommerce CRM backend API.

---

## Base Configuration

*   **Base URL**: `http://localhost:3000` (or staging/production URL)
*   **Default Headers**:
    ```http
    Content-Type: application/json
    Authorization: Bearer <your_jwt_token_here>
    ```

---

## 1. Authentication Module (`/auth`)

Endpoints for registering, logging in, verifying OTPs, and password recovery.

### Sign Up / Register Staff
*   **Method**: `POST`
*   **Path**: `/auth/signup`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "password": "securepassword123",
      "role": "customer_service"
    }
    ```
*   **Response (201)**:
    ```json
    {
      "message": "Account created. OTP verification email has been sent."
    }
    ```

### Verify OTP
*   **Method**: `POST`
*   **Path**: `/auth/verify-otp`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "email": "jane@example.com",
      "otp": "123456"
    }
    ```
*   **Response (200)**:
    ```json
    {
      "message": "OTP verified successfully. Account activated."
    }
    ```

### Log In
*   **Method**: `POST`
*   **Path**: `/auth/login`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "email": "jane@example.com",
      "password": "securepassword123"
    }
    ```
*   **Response (200)**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "_id": "60c72b2f9b1d8a2c2c8b4567",
        "email": "jane@example.com",
        "role": "customer_service",
        "fullName": "Jane Doe"
      }
    }
    ```

### Resend OTP
*   **Method**: `POST`
*   **Path**: `/auth/resend-otp`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "email": "jane@example.com"
    }
    ```
*   **Response (200)**:
    ```json
    {
      "message": "A new OTP code has been sent."
    }
    ```

### Forgot Password (Request OTP)
*   **Method**: `POST`
*   **Path**: `/auth/forgot-password`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "email": "jane@example.com"
    }
    ```
*   **Response (200)**:
    ```json
    {
      "message": "Password reset code sent to email."
    }
    ```

### Reset Password
*   **Method**: `POST`
*   **Path**: `/auth/reset-password`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "email": "jane@example.com",
      "otp": "123456",
      "newPass": "newsecurepassword456"
    }
    ```
*   **Response (200)**:
    ```json
    {
      "message": "Password updated successfully."
    }
    ```

---

## 2. Users Module (`/users`)

Manage staff profiles, assign teams, switch roles, and toggle user activation status.

### Create a Staff User
*   **Method**: `POST`
*   **Path**: `/users`
*   **Auth**: Required (Admin, Manager, Dev)
*   **Body**:
    ```json
    {
      "fullName": "Mike Smith",
      "email": "mike@example.com",
      "password": "securepassword",
      "role": "media_buyer",
      "team": "Team Alpha",
      "locationId": "60d1a2c3b4e5f67890abcdef",
      "commissionRate": 10
    }
    ```

### List All Staff Users
*   **Method**: `GET`
*   **Path**: `/users`
*   **Auth**: Required (Admin, Manager, Dev)
*   **Response (200)**:
    ```json
    [
      {
        "_id": "60c72b2f9b1d8a2c2c8b4567",
        "fullName": "Mike Smith",
        "email": "mike@example.com",
        "role": "media_buyer",
        "team": "Team Alpha",
        "isActive": true,
        "commissionRate": 10
      }
    ]
    ```

### Get User Details
*   **Method**: `GET`
*   **Path**: `/users/:id`
*   **Auth**: Required (All roles)

### Update User (Toggle Role / Team / Rate / Location)
*   **Method**: `PATCH`
*   **Path**: `/users/:id`
*   **Auth**: Required (Admin, Dev)
*   **Body**: Any subset of `CreateUserDto` (e.g. update user type/role):
    ```json
    {
      "role": "marketing_manager",
      "team": "Team Beta",
      "commissionRate": 12
    }
    ```

### Toggle Active Status (Enable/Disable Account)
*   **Method**: `PATCH`
*   **Path**: `/users/:id/toggle-status`
*   **Auth**: Required (Admin, Dev)
*   **Response (200)**: Returns the updated User document with inverted `isActive` boolean.

---

## 3. Leads Module (`/leads`)

Handles progressive data capture, manual entry, duplicates detection, and status management.

### Progressive Capture (Partial Data)
*   **Method**: `POST`
*   **Path**: `/leads/partial`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "customerPhone": "08012345678",
      "customerName": "John",
      "productId": "60d1a...",
      "leadFormId": "60d1b..."
    }
    ```
*   **Notes**: Saves incremental data as the customer fills forms.

### Final Submission Webhook
*   **Method**: `POST`
*   **Path**: `/leads/webhook`
*   **Auth**: PUBLIC
*   **Body**:
    ```json
    {
      "customerName": "John Doe",
      "customerPhone": "08012345678",
      "customerAddress": "12 Main St, Lagos",
      "productId": "60d1a...",
      "quantity": 2,
      "sourceMediaBuyerId": "60c72...",
      "source": "FACEBOOK",
      "leadFormId": "60d1b..."
    }
    ```

### Manual Lead Creation
*   **Method**: `POST`
*   **Path**: `/leads`
*   **Auth**: Required (Admin, Manager, CS, CS Manager, Marketing Mgt, Logistics, Accountant, Dev)
*   **Body**: Same as Webhook.

### Get All Leads
*   **Method**: `GET`
*   **Path**: `/leads`
*   **Query Parameters**:
    *   `assignedTo` (User ObjectId)
    *   `source` (`FACEBOOK`, `GOOGLE`, `TIKTOK`, `INSTAGRAM`, `WHATSAPP`, `DIRECT`, `OTHER`)
    *   `status` (`NEW`, `CONTACTED`, `SCHEDULED`, `CANCELLED`, `PARTIAL`)
    *   `isDuplicate` (`true`/`false`)
    *   `isReturning` (`true`/`false`)
*   **Auth**: Required (All except `Role.MEDIA_BUYER` are allowed)

### Get a Single Lead
*   **Method**: `GET`
*   **Path**: `/leads/:id`
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

### Reassign Lead
*   **Method**: `PATCH`
*   **Path**: `/leads/:id/assign`
*   **Body**:
    ```json
    {
      "assignedTo": "60c72b2f9b1d8a2c2c8b4567"
    }
    ```
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

### Update Lead Status
*   **Method**: `PATCH`
*   **Path**: `/leads/:id/status`
*   **Body**:
    ```json
    {
      "status": "CONTACTED"
    }
    ```
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

---

## 4. Orders Module (`/orders`)

Orchestrates inventory locks, shipment, payments, and follow-ups.

### Create Order
*   **Method**: `POST`
*   **Path**: `/orders`
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)
*   **Body**:
    ```json
    {
      "customerName": "John Doe",
      "customerPhone": "08012345678",
      "customerAddress": "12 Main St, Lagos",
      "agentId": "60c72...",
      "logisticsId": "60d2b...",
      "items": [
        { "productId": "60d1a...", "qty": 2, "unitPrice": 7500 }
      ],
      "totalAmount": 15000,
      "leadId": "60d2c...",
      "fulfillmentLocationId": "60d2a..."
    }
    ```

### Get All Orders
*   **Method**: `GET`
*   **Path**: `/orders`
*   **Query Parameters**:
    *   `logisticsId` (Filter orders assigned to a courier)
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

### Get Single Order
*   **Method**: `GET`
*   **Path**: `/orders/:id`
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

### Update Delivery Status (Logistics)
*   **Method**: `PATCH`
*   **Path**: `/orders/:id/delivery-status`
*   **Body**:
    ```json
    {
      "status": "DELIVERED",
      "deliveryFee": 1500
    }
    ```
*   **Notes**: Setting status to `DELIVERED` automatically timestamps `deliveryDate`.
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

### Confirm Payment / Cash Remitted (Accountant)
*   **Method**: `PATCH`
*   **Path**: `/orders/:id/payment-status`
*   **Body**:
    ```json
    {
      "status": "CASH_REMITTED"
    }
    ```
*   **Notes**: Generates double-entry wallet credits for system revenue and CS/MB commissions.
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

### Cancel Order
*   **Method**: `PATCH`
*   **Path**: `/orders/:id/cancel`
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

### Schedule CS Follow-Up
*   **Method**: `PATCH`
*   **Path**: `/orders/:id/follow-up`
*   **Body**:
    ```json
    {
      "followUpDate": "2026-07-31T09:00:00.000Z",
      "notes": "Callback requested to discuss delivery timing."
    }
    ```
*   **Auth**: Required (All except `Role.MEDIA_BUYER`)

---

## 5. Analytics & Dashboards (`/analytics`)

Exposes metrics customized for managers, CS agents, and Media Buyers.

### Management Dashboard
*   **Method**: `GET`
*   **Path**: `/analytics/dashboard`
*   **Auth**: Required (Admin, Manager, Customer Service Manager, Logistics Manager, Marketing Manager, Dev)
*   **Response (200)**:
    ```json
    {
      "revenue": 150000,
      "adSpend": 32000,
      "deliveryCost": 12000,
      "commission": 15000,
      "productCost": 40000,
      "profit": 51000,
      "metrics": {
        "deliveryRate": 82.35,
        "cpa": 45.5,
        "totalOrders": 120,
        "deliveredOrders": 90
      }
    }
    ```

### CS Agent Dashboard
*   **Method**: `GET`
*   **Path**: `/analytics/cs-dashboard`
*   **Query Parameters**:
    *   `agentId` (Optional, defaults to logged-in user ID)
*   **Auth**: Required (Admin, Manager, Customer Service, Customer Service Manager, Dev)
*   **Response (200)**:
    ```json
    {
      "todayDeliveries": 4,
      "todayFollowUpOrders": 2,
      "earnings": 450,
      "rating": 80.00,
      "metrics": {
        "weeklyDelivery": 8,
        "weeklyProcessed": 10
      }
    }
    ```

---

## 6. Media Buyers Module (`/media-buyers`)

Attribution spend recording and team metrics dashboard.

### Record Daily Ad Spend
*   **Method**: `POST`
*   **Path**: `/media-buyers/spend-log`
*   **Auth**: Required (All roles)
*   **Body**:
    ```json
    {
      "mediaBuyerId": "60c72...",
      "date": "2026-07-30T00:00:00.000Z",
      "amountSpent": 500,
      "amountReceived": 1200,
      "productName": "Luxury Watch"
    }
    ```

### Get Performance Metrics (Individual)
*   **Method**: `GET`
*   **Path**: `/media-buyers/performance`
*   **Query Parameters**:
    *   `mediaBuyerId` (Required)
    *   `range` (`daily`, `weekly`, `monthly` - defaults to `daily`)
*   **Auth**: Required (All roles)

### MB Team Dashboard
*   **Method**: `GET`
*   **Path**: `/media-buyers/dashboard`
*   **Auth**: Required (Admin, Manager, Marketing Manager, Media Buyer, Dev)
*   **Response (200)**:
    ```json
    [
      {
        "team": "Team Alpha",
        "spent": 1250,
        "orderCounts": 45,
        "deliveryRate": 82.50,
        "earnings": 4500,
        "commissions": 450
      }
    ]
    ```

---

## 7. Lead Forms Module (`/lead-forms`)

Forms settings and iframe capture tools.

### Create Lead Form
*   **Method**: `POST`
*   **Path**: `/lead-forms`
*   **Auth**: Required (Admin, Dev)
*   **Body**:
    ```json
    {
      "title": "Luxury Watch Promo",
      "description": "Get 10% off today",
      "productId": "60d1a...",
      "sourceMediaBuyerId": "60c72...",
      "defaultSource": "FACEBOOK",
      "primaryColor": "#4F46E5",
      "submitButtonText": "Order Now",
      "successMessage": "Order received!",
      "showQuantityField": false,
      "showAddressField": true
    }
    ```

### List Lead Forms (with dynamically calculated earnings)
*   **Method**: `GET`
*   **Path**: `/lead-forms`
*   **Auth**: Required (All roles)

### Get Single Lead Form
*   **Method**: `GET`
*   **Path**: `/lead-forms/:id`
*   **Auth**: Required (All roles)

### Update Lead Form
*   **Method**: `PATCH`
*   **Path**: `/lead-forms/:id`
*   **Auth**: Required (Admin, Dev)

### Delete Lead Form
*   **Method**: `DELETE`
*   **Path**: `/lead-forms/:id`
*   **Auth**: Required (Admin, Dev)

### Fetch Iframe Embed Code
*   **Method**: `GET`
*   **Path**: `/lead-forms/:id/iframe-code`
*   **Auth**: Required (All roles)
*   **Response (200)**:
    ```json
    {
      "iframeCode": "<iframe src=\"http://localhost:3000/lead-forms/60d1b.../embed\" width=\"100%\" ...></iframe>"
    }
    ```

---

## 8. Finance & Commission Rules (`/finance` & `/commission-rules`)

Double-entry ledger details and admin commission rule overrides.

### Get Wallet Balance
*   **Method**: `GET`
*   **Path**: `/finance/wallet/:userId`
*   **Auth**: Required (Checking user's own ID, or Admin/Accountant/Dev)
*   **Response (200)**: Returns user's numerical wallet balance.

### Get System Revenue / Profit
*   **Method**: `GET`
*   **Path**: `/finance/profit`
*   **Auth**: Required (Admin, Accountant, Dev)

### Create Commission Rule
*   **Method**: `POST`
*   **Path**: `/commission-rules`
*   **Auth**: Required (Admin, Dev)
*   **Body**:
    ```json
    {
      "ruleType": "PRODUCT", // or "GLOBAL", "QUANTITY"
      "amountType": "PERCENTAGE", // or "FLAT"
      "value": 15,
      "productId": "60d1a...",
      "minQuantity": 1
    }
    ```

### List Commission Rules
*   **Method**: `GET`
*   **Path**: `/commission-rules`
*   **Auth**: Required (Admin, Dev)

---

## 9. Logistics, Locations, Products, Inventory

Internal operations tables.

### Assign Delivery Agent (Logistics)
*   **Method**: `POST`
*   **Path**: `/logistics/deliveries/assign`
*   **Auth**: Required (All roles)
*   **Body**:
    ```json
    {
      "orderId": "60d2c...",
      "logisticsId": "60c72b..."
    }
    ```

### Update Delivery Status
*   **Method**: `PATCH`
*   **Path**: `/logistics/deliveries/:id/status`
*   **Auth**: Required (All roles)
*   **Body**:
    ```json
    {
      "status": "ARRIVED" // assigned, arrived, picked_up, in_transit, failed, delayed
    }
    ```

### List All Logistics Shipments
*   **Method**: `GET`
*   **Path**: `/logistics/deliveries`
*   **Auth**: Required (All roles)

### Create Warehouse/Office Location
*   **Method**: `POST`
*   **Path**: `/locations`
*   **Auth**: Required (All roles)
*   **Body**:
    ```json
    {
      "name": "Lagos Distribution Hub",
      "address": "45 hub avenue, Ikeja"
    }
    ```

### List Locations
*   **Method**: `GET`
*   **Path**: `/locations`
*   **Auth**: Required (All roles)

### Create Product Model
*   **Method**: `POST`
*   **Path**: `/products`
*   **Auth**: Required (All roles)
*   **Body**:
    ```json
    {
      "name": "Luxury Smart Watch",
      "sku": "LUX-WATCH-001",
      "baseCost": 3500,
      "sellingPrice": 7500
    }
    ```

### List Products
*   **Method**: `GET`
*   **Path**: `/products`
*   **Auth**: Required (All roles)

### Record Stock In (Warehouse Load)
*   **Method**: `POST`
*   **Path**: `/inventory/in`
*   **Auth**: Required (All roles)
*   **Body**:
    ```json
    {
      "productId": "60d1a...",
      "locationId": "60d2a...",
      "qty": 100
    }
    ```

### Transfer Stock between Warehouses
*   **Method**: `POST`
*   **Path**: `/inventory/transfer`
*   **Auth**: Required (All roles)
*   **Body**:
    ```json
    {
      "productId": "60d1a...",
      "fromLocationId": "60d2a...",
      "toLocationId": "60d2b...",
      "qty": 20
    }
    ```

---

## 10. Audit Trail Module (`/audit-trail`)

Lists action logs generated by staff write operations.

### Retrieve Audit Logs
*   **Method**: `GET`
*   **Path**: `/audit-trail`
*   **Auth**: Required (Admin, Dev)
*   **Response (200)**:
    ```json
    [
      {
        "_id": "60d2e...",
        "userId": {
          "_id": "60c72b...",
          "fullName": "Jane Doe",
          "email": "jane@example.com",
          "role": "customer_service"
        },
        "userEmail": "jane@example.com",
        "action": "PATCH /orders/60d2c.../follow-up",
        "details": {
          "body": {
            "followUpDate": "2026-07-31T09:00:00.000Z",
            "notes": "Callback requested to discuss delivery timing."
          },
          "status": "SUCCESS"
        },
        "ip": "::1",
        "createdAt": "2026-07-30T21:15:00.000Z"
      }
    ]
    ```
