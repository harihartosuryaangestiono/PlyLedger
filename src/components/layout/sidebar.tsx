"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Box, ShoppingCart, TrendingUp, Truck, DollarSign, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { hasAccess, ModuleName } from '@/lib/permissions';
import { Role } from '@prisma/client';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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

function SidebarContent({ pathname, role, onItemClick }: { pathname: string; role: Role; onItemClick?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border/50">
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
                onClick={onItemClick}
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
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as Role;

  return (
    <div className="hidden md:flex h-full w-56 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SidebarContent pathname={pathname} role={role} />
    </div>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as Role;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden mr-2">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-r-sidebar-border">
        <SidebarContent pathname={pathname} role={role} onItemClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
