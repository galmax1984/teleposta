import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Phone, User, LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

interface TopBarProps {
  jobCount?: number;
}

export default function TopBar({ jobCount = 0 }: TopBarProps) {
  const location = useLocation();
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (data.authenticated) setUser(data.user);
        else setUser(null);
      } catch {}
    };
    load();
  }, []);

  const handleLogin = () => {
    window.location.href = "http://localhost:3001/api/auth/google";
  };

  const handleLogout = async () => {
    await fetch("http://localhost:3001/api/auth/logout", { credentials: "include" });
    setUser(null);
  };

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
          {!user && (
            <button onClick={handleLogin} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm">
              <LogIn className="h-4 w-4" /> Sign in with Google
            </button>
          )}
          {!!user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{user.name || user.email}</span>
              </div>
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
