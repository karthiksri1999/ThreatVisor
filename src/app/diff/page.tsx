import { GitCompareArrows } from 'lucide-react';

export default function DiffPage() {
  return (
    <div className="container mx-auto p-8 text-center flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
      <GitCompareArrows className="mx-auto h-16 w-16 text-primary mb-4" />
      <h1 className="text-3xl font-bold tracking-tight">Compare Threat Models</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        This feature will allow you to upload two different architecture files and see a visual diff of the identified threats.
      </p>
      <div className="mt-8 text-lg font-semibold p-4 bg-secondary/50 rounded-lg">
        Coming Soon!
      </div>
    </div>
  );
}
