import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tighter">ThreatVisor</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
