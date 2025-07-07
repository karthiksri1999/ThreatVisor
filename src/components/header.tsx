import { ShieldCheck, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tighter">ThreatVisor</h1>
        </Link>
        <div className="flex items-center gap-2">
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
             <Button variant="ghost" asChild><Link href="#">Documentation</Link></Button>
             <Button variant="ghost" asChild><Link href="#">API Status</Link></Button>
             <Button variant="ghost" asChild><Link href="#">About</Link></Button>
          </nav>
          
          <ThemeToggle />
          
          {/* Mobile nav */}
          <div className="md:hidden">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link href="#">Documentation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="#">API Status</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="#">About</Link></DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
