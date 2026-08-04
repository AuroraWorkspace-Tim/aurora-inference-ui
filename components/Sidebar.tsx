"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  KeyRound,
  BookOpen,
  PlayCircle,
  CreditCard,
  Zap,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/endpoints", label: "Endpoints", icon: Server },
  { href: "/models", label: "Models", icon: BookOpen },
  { href: "/playground", label: "Playground", icon: PlayCircle },
  { href: "/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-gray-800 flex items-center gap-2">
        <Zap className="w-5 h-5 text-violet-400" />
        <span className="font-semibold text-white tracking-tight">Aurora</span>
        <span className="text-xs text-gray-500 ml-1">Console</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-violet-600/20 text-violet-300 font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">Aurora Inference</div>
        <div className="text-xs text-gray-600">v0.1.0</div>
      </div>
    </aside>
  );
}
