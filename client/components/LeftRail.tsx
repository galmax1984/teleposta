import { Link, useLocation } from "react-router-dom";
import { Megaphone, List } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LeftRail() {
  const location = useLocation();
  const items = [
    { icon: Megaphone, label: "Campaigns", href: "/campaigns" },
    { icon: List, label: "Logs", href: "/logs" },
  ];

  return (
    <aside className="hidden shrink-0 border-r bg-surface-base/80 md:block h-full" aria-label="Sidebar">
      <div className="flex w-16 h-full flex-col items-center gap-3 py-4">
        {items.map((Item) => {
          const isActive = location.pathname === Item.href;
          return (
            <Link 
              key={Item.href} 
              to={Item.href} 
              className={cn(
                "group flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                isActive && "bg-slate-100 text-slate-900"
              )}
            >
              <Item.icon className="h-5 w-5" />
              <span className="sr-only">{Item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
