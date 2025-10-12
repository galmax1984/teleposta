import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Phone, User } from "lucide-react";

interface TopBarProps {
  jobCount?: number;
}

export default function TopBar({ jobCount = 0 }: TopBarProps) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-slate-900 text-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3">
        <div className="flex items-center gap-2 font-extrabold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-white">
            <Phone className="h-4 w-4" />
          </div>
          <span className="text-lg">Teleposta</span>
        </div>
        <nav className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Maksim</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
