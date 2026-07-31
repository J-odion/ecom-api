# API Documentation Reference - Recent Updates

This document describes the recently added or updated endpoints in the Ecommerce CRM API. It details how the online tracking markers, base salary updates, onboarding flows, and dashboard outputs operate.

---

## 1. User Session Logout (`POST /auth/logout`)

- **Description**: Logs out the currently authenticated user. In addition to terminating the local session, it updates the user database model to mark the user as offline (`isOnline: false`).
- **Endpoint**: `/auth/logout`
- **HTTP Method**: `POST`
- **Authentication**: Required (JWT Bearer Token)
- **Payload**: None
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

## 2. My Analytics Dashboard (`GET /analytics/me`)

- **Description**: A unified endpoint returning custom, role-specific metrics.
  - **CS, Logistics, and Media Buyer agents**: Calculates performance and adds their monthly base `salary` directly to their calculated `earnings`.
  - **Admins and General Managers**: Aggregates total business metrics and fetches a list of all active staff members currently online (`onlineUsers`), detailing their names, roles, and populated location names.
- **Endpoint**: `/analytics/me`
- **HTTP Method**: `GET`
- **Authentication**: Required (JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
- **Response (200 OK) Examples**:

  ### A. Customer Service Agent View
  ```json
  {
    "role": "customer_service",
    "performance": {
      "todayDeliveries": 4,
      "todayFollowUpOrders": 2,
      "earnings": 85000,
      "rating": 93.33,
      "metrics": {
        "weeklyDelivery": 14,
        "weeklyProcessed": 15
      }
    }
  }
  ```

  ### B. Admin / General Manager View
  ```json
  {
    "role": "admin",
    "revenue": 1450000,
    "adSpend": 300000,
    "deliveryCost": 120000,
    "profit": 890000,
    "productCost": 140000,
    "commission": 65000,
    "metrics": {
      "totalOrders": 124,
      "deliveryRate": 88.5
    },
    "onlineUsers": [
      {
        "userId": "60c72b2f9b1d8a2c2c8b4567",
        "fullName": "Jane Doe",
        "email": "jane@example.com",
        "role": "customer_service",
        "locationName": "Lagos Distribution Hub",
        "team": "Team Alpha"
      }
    ],
    "teams": {
      "customerService": [...],
      "logistics": [...],
      "marketing": [...]
    }
  }
  ```

---

## 3. Provision Internal Staff (`POST /users`)

- **Description**: Onboards a new staff member account. To simplify the onboarding flow, providing a `password` is optional. If left blank, the system automatically assigns `Welcome@123` as the temporary initial password.
- **Endpoint**: `/users`
- **HTTP Method**: `POST`
- **Authentication**: Required (`ADMIN` or `DEV` only)
- **Body Schema (JSON)**:
  ```json
  {
    "fullName": "Alice Johnson",
    "email": "alice@example.com",
    "password": "optionalPassword123",
    "role": "logistics",
    "locationId": "60c72b2f9b1d8a2c2c8b4569",
    "commissionRate": 10,
    "team": "Team Logistics-A",
    "salary": 140000
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "_id": "60d0fe4f5311236168a109ca",
    "fullName": "Alice Johnson",
    "email": "alice@example.com",
    "role": "logistics",
    "locationId": "60c72b2f9b1d8a2c2c8b4569",
    "commissionRate": 10,
    "team": "Team Logistics-A",
    "salary": 140000,
    "isActive": true,
    "isVerified": false,
    "isOnline": false
  }
  ```

---

## 4. Update Staff Details / Salary Setup (`PATCH /users/:id`)

- **Description**: Updates fields for a staff member's record. This endpoint is accessible to Finance Accountants (`Role.ACCOUNTANT`), permitting them to adjust base salaries which immediately reflects on user dashboards.
- **Endpoint**: `/users/:id`
- **HTTP Method**: `PATCH`
- **Authentication**: Required (`ADMIN`, `DEV`, or `ACCOUNTANT`)
- **Body Schema (JSON)**:
  ```json
  {
    "fullName": "Alice Johnson",
    "role": "logistics",
    "locationId": "60c72b2f9b1d8a2c2c8b4569",
    "commissionRate": 12,
    "team": "Team Logistics-B",
    "salary": 160000
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "_id": "60d0fe4f5311236168a109ca",
    "fullName": "Alice Johnson",
    "email": "alice@example.com",
    "role": "logistics",
    "locationId": "60c72b2f9b1d8a2c2c8b4569",
    "commissionRate": 12,
    "team": "Team Logistics-B",
    "salary": 160000,
    "isActive": true,
    "isVerified": false,
    "isOnline": false
  }
  ```

---

## 5. List Staff Users (`GET /users`)

- **Description**: Lists all registered staff users. Now allows Finance Accountants (`Role.ACCOUNTANT`) access to review staff lists and configure salaries.
- **Endpoint**: `/users`
- **HTTP Method**: `GET`
- **Authentication**: Required (`ADMIN`, `DEV`, `MANAGER`, or `ACCOUNTANT`)
- **Response (200 OK)**:
  ```json
  [
    {
      "_id": "60d0fe4f5311236168a109ca",
      "fullName": "Alice Johnson",
      "email": "alice@example.com",
      "role": "logistics",
      "locationId": "60c72b2f9b1d8a2c2c8b4569",
      "team": "Team Logistics-B",
      "salary": 160000,
      "isActive": true,
      "isOnline": true
    }
  ]
  ```
