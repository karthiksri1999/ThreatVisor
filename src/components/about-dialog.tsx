'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import Link from 'next/link';

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>About ThreatVisor</DialogTitle>
          <DialogDescription>
            Threat Modeling as Code. An intuitive tool to visualize and analyze
            application security architectures.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground">Created By</h3>
            <p>Karthik Srikanth</p>
            <a
              href="mailto:karthiksrikanth535@gmail.com"
              className="text-primary underline"
            >
              karthiksrikanth535@gmail.com
            </a>
          </div>
          <div className="text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground">License</h3>
            <p>
              This project is licensed under the MIT License.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
