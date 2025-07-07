'use client';

import { useState } from 'react';
import { ShieldCheck, Menu, GitCompareArrows, Book, Info } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { AboutDialog } from './about-dialog';

export function Header() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold tracking-tighter">ThreatVisor</h1>
          </Link>
          <div className="flex items-center gap-2">
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" asChild>
                <Link href="/diff">
                  <GitCompareArrows className="mr-2 h-4 w-4" /> Compare Models
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/documentation">
                  <Book className="mr-2 h-4 w-4" /> Documentation
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => setAboutOpen(true)}>
                <Info className="mr-2 h-4 w-4" /> About
              </Button>
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
                  <DropdownMenuItem asChild>
                    <Link href="/diff">Compare Models</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/documentation">Documentation</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                    About
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}
