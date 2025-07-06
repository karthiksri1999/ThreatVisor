'use client';

import { useActionState, useEffect, useState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { analyzeThreatsAction } from '@/app/actions';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TEMPLATES } from '@/lib/templates';
import { AlertCircle, Download, FileCode, Loader2, Sparkles, Wand2, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InteractiveDiagram } from './interactive-diagram';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

const initialState = {
  threats: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      Analyze Threats
    </Button>
  );
}

function ThreatsTable({ threats }: { threats: ThreatSuggestionsOutput['threats'] }) {
    const getSeverityVariant = (severity: 'High' | 'Medium' | 'Low') => {
        switch (severity) {
            case 'High': return 'destructive';
            case 'Medium': return 'secondary';
            case 'Low': return 'outline';
            default: return 'default';
        }
    }
  return (
     <div className="relative h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
          <TableRow>
            <TableHead className="w-1/12">Severity</TableHead>
            <TableHead className="w-3/12">Affected Component</TableHead>
            <TableHead className="w-4/12">Threat</TableHead>
            <TableHead className="w-4/12">Mitigation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {threats.map((threat, index) => (
            <TableRow key={index}>
              <TableCell><Badge variant={getSeverityVariant(threat.severity)}>{threat.severity}</Badge></TableCell>
              <TableCell className="font-medium">{threat.affectedComponent}</TableCell>
              <TableCell>{threat.threat}</TableCell>
              <TableCell>{threat.mitigation}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ResultsSkeleton() {
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
    )
}

export function ThreatVisorClient() {
  const [state, formAction] = useActionState(analyzeThreatsAction, initialState);
  const [dslInput, setDslInput] = useState('');
  const { pending } = useFormStatus();

  useEffect(() => {
    // Pre-load the first template on initial render
    const initialContent = TEMPLATES[0].content;
    setDslInput(initialContent);
  }, []);
  
  const handleTemplateChange = (templateName: string) => {
    const template = TEMPLATES.find((t) => t.name === templateName);
    if (template) {
      setDslInput(template.content);
    }
  };

  const handleDslChange = useCallback((newDsl: string) => {
    setDslInput(newDsl);
  }, []);


  return (
    <form action={formAction} className="h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={40} minSize={25}>
          <div className="flex flex-col h-full p-4 gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Configuration</h2>
            <div className="grid gap-2">
                <label className="text-sm font-medium">Templates</label>
                <Select onValueChange={handleTemplateChange} defaultValue={TEMPLATES[0].name}>
                    <SelectTrigger>
                        <SelectValue placeholder="Load a template..." />
                    </SelectTrigger>
                    <SelectContent>
                        {TEMPLATES.map((template) => (
                        <SelectItem key={template.name} value={template.name}>
                            {template.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2 flex-1">
                <label htmlFor="dsl-input" className="text-sm font-medium">
                    Architecture Definition (YAML/JSON)
                </label>
                <Textarea
                    id="dsl-input"
                    name="dsl"
                    placeholder="Describe your architecture here..."
                    className="flex-1 font-code text-sm resize-none"
                    value={dslInput}
                    onChange={(e) => setDslInput(e.target.value)}
                    required
                />
            </div>
            <div className="grid gap-2">
                <label htmlFor="methodology-select" className="text-sm font-medium">
                    Threat Modeling Methodology
                </label>
                <Select name="methodology" defaultValue="STRIDE" required>
                    <SelectTrigger id="methodology-select">
                        <SelectValue placeholder="Select methodology" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="STRIDE">STRIDE</SelectItem>
                        <SelectItem value="LINDDUN">LINDDUN</SelectItem>
                        <SelectItem value="PASTA">PASTA</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <SubmitButton />
             <div className="flex items-center gap-2">
                <Button variant="outline" className="w-full" disabled><Download className="mr-2 h-4 w-4"/> PDF</Button>
                <Button variant="outline" className="w-full" disabled><FileCode className="mr-2 h-4 w-4"/> Markdown</Button>
             </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="flex flex-col h-full">
            {pending ? (
                <div className="flex flex-col h-full items-center justify-center p-8">
                   <Wand2 className="h-12 w-12 text-primary animate-pulse" />
                   <p className="mt-4 text-lg font-medium">Analyzing your architecture...</p>
                   <p className="text-muted-foreground">The AI is identifying potential threats. This may take a moment.</p>
                   <ResultsSkeleton />
                </div>
            ) : state?.error ? (
              <div className="flex h-full items-center justify-center p-8">
                <Alert variant="destructive" className="max-w-lg">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Analysis Failed</AlertTitle>
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              </div>
            ) : state?.threats || dslInput ? (
              <Tabs defaultValue="threats" className="flex flex-col h-full">
                <div className="p-4 border-b">
                    <TabsList>
                        <TabsTrigger value="threats">Threats</TabsTrigger>
                        <TabsTrigger value="diagram">Diagram</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="threats" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                  {state.threats ? <ThreatsTable threats={state.threats.threats} /> : (
                      <div className="flex h-full flex-col items-center justify-center text-center p-8">
                           <p className="text-muted-foreground">Threat analysis not yet performed.</p>
                      </div>
                  )}
                </TabsContent>
                <TabsContent value="diagram" className="flex-1 overflow-auto data-[state=inactive]:hidden m-0">
                    <InteractiveDiagram dsl={dslInput} onDslChange={handleDslChange} />
                </TabsContent>
              </Tabs>
            ) : (
                <div className="flex h-full flex-col items-center justify-center text-center p-8">
                    <div className="p-4 rounded-full bg-primary/10 mb-4">
                        <ShieldCheck className="h-12 w-12 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold">Welcome to ThreatVisor</h2>
                    <p className="mt-2 max-w-md text-muted-foreground">
                        Define your architecture in the panel on the left, select a threat modeling methodology, and click 'Analyze Threats' to begin.
                    </p>
                </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </form>
  );
}
