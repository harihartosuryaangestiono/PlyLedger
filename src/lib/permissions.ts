import { Role } from "@prisma/client";

export const RolePermissions = {
  [Role.ADMIN]: {
    canAccess: ["dashboard", "sales", "purchases", "accounting", "products", "customers", "suppliers", "shipments", "payments", "users"],
    canMutate: true,
  },
  [Role.SALES]: {
    canAccess: ["dashboard", "sales", "customers", "products", "shipments"],
    canMutate: true, // Only for the accessible modules, enforced at the API level
  },
  [Role.FINANCE]: {
    canAccess: ["dashboard", "accounting", "payments", "customers", "suppliers"],
    canMutate: true,
  },
  [Role.VIEWER]: {
    canAccess: ["dashboard", "sales", "purchases", "accounting", "products", "customers", "suppliers", "shipments", "payments", "users"],
    canMutate: false,
  },
} as const;

export type ModuleName = "dashboard" | "sales" | "purchases" | "accounting" | "products" | "customers" | "suppliers" | "shipments" | "payments" | "users";

export function hasAccess(role: string, module: ModuleName): boolean {
  if (!role) return false;
  const typedRole = role as Role;
  return (RolePermissions[typedRole]?.canAccess as readonly string[])?.includes(module) || false;
}

export function canEdit(role: string, module: ModuleName): boolean {
  if (!role) return false;
  const typedRole = role as Role;
  // If role is VIEWER, they can't mutate anything
  if (typedRole === 'VIEWER') return false;
  // Otherwise, if they can access the module, they can mutate it (simplification for ADMIN, SALES, FINANCE boundaries)
  return (RolePermissions[typedRole]?.canAccess as readonly string[])?.includes(module) || false;
}
