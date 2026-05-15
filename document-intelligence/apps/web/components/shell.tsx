import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cfdi', label: 'CFDI' },
  { href: '/laboral', label: 'Laboral' },
  { href: '/contratos', label: 'Contratos' },
  { href: '/settings', label: 'Ajustes' },
];

interface ShellProps {
  children: React.ReactNode;
  active: string;
  email: string;
  isPlatformAdmin: boolean;
  workspaceName: string;
}

export const Shell = ({ children, active, email, isPlatformAdmin, workspaceName }: ShellProps) => (
  <div className="flex min-h-screen">
    <aside className="w-64 border-r border-zinc-200 bg-zinc-50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/dashboard" className="block text-lg font-bold tracking-tight">
        JVP DI
      </Link>
      <p className="mt-1 text-xs text-zinc-500">{workspaceName}</p>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium',
              active === n.href
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800',
            )}
          >
            {n.label}
          </Link>
        ))}
        {isPlatformAdmin && (
          <Link
            href="/admin"
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium',
              active === '/admin'
                ? 'bg-red-600 text-white'
                : 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950',
            )}
          >
            Admin (plataforma)
          </Link>
        )}
      </nav>

      <div className="mt-auto pt-8">
        <p className="truncate text-xs text-zinc-500">{email}</p>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="mt-2 flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <LogOut className="h-3 w-3" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>

    <main className="flex-1 px-8 py-8">{children}</main>
  </div>
);
