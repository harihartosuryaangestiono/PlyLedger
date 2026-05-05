"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Box, ShoppingCart, TrendingUp, Truck, DollarSign, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { hasAccess, ModuleName } from '@/lib/permissions';
import { Role } from '@prisma/client';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, module: 'dashboard' },
  { name: 'Suppliers', href: '/suppliers', icon: Users, module: 'suppliers' },
  { name: 'Customers', href: '/customers', icon: Users, module: 'customers' },
  { name: 'Products', href: '/products', icon: Box, module: 'products' },
  { name: 'Purchases (PO)', href: '/purchases', icon: ShoppingCart, module: 'purchases' },
  { name: 'Sales (SO)', href: '/sales', icon: TrendingUp, module: 'sales' },
  { name: 'Shipments', href: '/shipments', icon: Truck, module: 'shipments' },
  { name: 'Payments', href: '/payments', icon: DollarSign, module: 'payments' },
  { name: 'Accounting', href: '/accounting', icon: BookOpen, module: 'accounting' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as Role;

  return (
    <div className="flex h-full w-56 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-md text-white">
            <Box className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">PlyLedger</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            if (role && !hasAccess(role, item.module as ModuleName)) {
              return null;
            }
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive 
                    ? 'bg-slate-800/50 text-white border-l-2 border-blue-500 rounded-r-md rounded-l-sm' 
                    : 'text-slate-400 hover:bg-slate-800/30 hover:text-white rounded-md border-l-2 border-transparent',
                  'group flex items-center px-3 py-2 text-sm font-medium transition-colors'
                )}
              >
                <item.icon className={cn("mr-3 h-4 w-4 flex-shrink-0", isActive ? "text-blue-400" : "text-slate-500")} aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
