import { ShieldCheck, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Resources</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link href="#">Documentation</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">API Status</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link href="#">Settings</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="#">About</Link></DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <div className="md:hidden">
                <DropdownMenuLabel>Auth</DropdownMenuLabel>
                 <DropdownMenuItem asChild><Link href="/login">Login</Link></DropdownMenuItem>
                 <DropdownMenuItem asChild><Link href="/signup">Sign Up</Link></DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
