# Ecommerce CRM – Feature Progress Log

## Sprint 1 – Authentication & User Management

### Completed
- [x] NestJS project bootstrap
- [x] MongoDB integration
- [x] User schema and repository pattern
- [x] Password hashing with bcrypt
- [x] JWT authentication
- [x] Role-based access control (RBAC)
- [x] Swagger documentation for all endpoints
- [x] Global validation pipes

### Endpoints

#### Auth
- POST /auth/login

#### Users
- POST /users (Admin only)

### Security
- JWT access tokens
- Role guards
- DTO validation

### Next Sprint
- Leads module
- Order state machine
- Logistics workflows