import Link from "next/link";
import { BarChart3, FileCheck2, FileSpreadsheet, Gavel, Settings, ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/cfdi", label: "CFDI", icon: FileSpreadsheet },
  { href: "/laboral", label: "Laboral", icon: FileCheck2 },
  { href: "/contratos", label: "Contratos", icon: Gavel },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
            JVP
          </span>
          <span>
            <span className="block text-sm font-semibold">Document Intelligence</span>
            <span className="block text-xs text-slate-500">Marvicqui Inc</span>
          </span>
        </Link>
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Workspace activo</p>
          <p className="mt-1 text-sm font-semibold">Demo Constructora SA</p>
        </div>
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
