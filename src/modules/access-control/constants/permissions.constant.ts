export const PERMISSIONS = [
  // Users
  { key: 'users:read', module: 'users', action: 'read', description: 'View staff directory', isSensitive: false },
  { key: 'users:manage', module: 'users', action: 'manage', description: 'Create/edit staff, adjust commission rates, assign teams', isSensitive: false },
  
  // Leads
  { key: 'leads:read', module: 'leads', action: 'read', description: 'View lead pipeline', isSensitive: false },
  { key: 'leads:write', module: 'leads', action: 'write', description: 'Create/update/assign leads', isSensitive: false },
  
  // Orders
  { key: 'orders:read', module: 'orders', action: 'read', description: 'View orders', isSensitive: false },
  { key: 'orders:create', module: 'orders', action: 'create', description: 'Convert leads to orders', isSensitive: false },
  { key: 'orders:manage', module: 'orders', action: 'manage', description: 'Reserve inventory, assign logistics, confirm payment, schedule follow-ups', isSensitive: false },
  
  // Finance
  { key: 'finance:wallet:read:own', module: 'finance', action: 'read', description: 'View own wallet balance', isSensitive: false },
  { key: 'finance:wallet:read:all', module: 'finance', action: 'read', description: 'View any wallet balance', isSensitive: true },
  
  // Analytics
  { key: 'analytics:dashboard:management', module: 'analytics', action: 'read', description: 'View management and global analytics dashboards', isSensitive: true },
  
  // Commission Rules
  { key: 'commission-rules:manage', module: 'commission-rules', action: 'manage', description: 'Create/edit commission structures', isSensitive: true },
  { key: 'commission-rules:read', module: 'commission-rules', action: 'read', description: 'View commission rules', isSensitive: false },
  
  // Accounting
  { key: 'accounting:journal:post', module: 'accounting', action: 'post', description: 'Post manual journal entries', isSensitive: true },
  { key: 'accounting:period:close', module: 'accounting', action: 'close', description: 'Lock a financial period', isSensitive: true },
  { key: 'accounting:chart:manage', module: 'accounting', action: 'manage', description: 'Manage chart of accounts', isSensitive: true },
  { key: 'accounting:read', module: 'accounting', action: 'read', description: 'View journals and accounts', isSensitive: false },
  
  // Logistics
  { key: 'logistics:manage', module: 'logistics', action: 'manage', description: 'Assign couriers, manage shipments', isSensitive: false },
  { key: 'logistics:read', module: 'logistics', action: 'read', description: 'View logistics and shipments', isSensitive: false },
  
  // Inventory & Locations & Products
  { key: 'inventory:manage', module: 'inventory', action: 'manage', description: 'Stock-ins, warehouse transfers', isSensitive: false },
  { key: 'locations:manage', module: 'locations', action: 'manage', description: 'Create/edit warehouse locations', isSensitive: false },
  { key: 'products:manage', module: 'products', action: 'manage', description: 'Create/edit product SKUs and pricing', isSensitive: false },
  
  // Lead Forms
  { key: 'lead-forms:read', module: 'lead-forms', action: 'read', description: 'View lead forms', isSensitive: false },
  { key: 'lead-forms:manage', module: 'lead-forms', action: 'manage', description: 'Create/edit lead capture forms', isSensitive: false },
  
  // Devices
  { key: 'devices:manage', module: 'devices', action: 'manage', description: 'Assign/lock/unlock devices', isSensitive: false },
  { key: 'devices:wipe', module: 'devices', action: 'wipe', description: 'Remote wipe a device', isSensitive: true },
  { key: 'devices:read', module: 'devices', action: 'read', description: 'View device status and location', isSensitive: false },
  
  // Access Control (Self)
  { key: 'access-control:manage', module: 'access-control', action: 'manage', description: 'Manage departments, roles, and user access', isSensitive: true },

  // Audit Trail
  { key: 'audit-trail:read', module: 'audit-trail', action: 'read', description: 'View audit logs', isSensitive: true },
] as const;

export type PermissionKey = typeof PERMISSIONS[number]['key'];
