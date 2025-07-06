
'use client';

import { useActionState, useEffect, useState, useCallback, useMemo } from 'react';
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
import { AlertCircle, Download, FileCode, Loader2, Sparkles, Wand2, ShieldCheck, Database, Server, User, ArrowUp, ArrowDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InteractiveDiagram } from './interactive-diagram';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { parseDsl, Component } from '@/lib/dsl-parser';
import { generateMarkdownReport, generatePdfReport } from '@/lib/exporter';


const initialState = {
  threats: null,
  error: null,
};

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Analyze Threats
        </>
      )}
    </Button>
  );
}

function ThreatsTable({ threats, components }: { threats: ThreatSuggestionsOutput['threats'], components: Component[] }) {
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'none'>('desc');

    const getSeverityVariant = (severity: 'High' | 'Medium' | 'Low') => {
        switch (severity) {
            case 'High': return 'destructive';
            case 'Medium': return 'secondary';
            case 'Low': return 'outline';
            default: return 'default';
        }
    }
    const componentMap = useMemo(() => new Map(components.map(c => [c.id, c.name])), [components]);
    
    const toggleSortOrder = () => {
        if (sortOrder === 'desc') setSortOrder('asc');
        else if (sortOrder === 'asc') setSortOrder('none');
        else setSortOrder('desc');
    };

    const sortedThreats = useMemo(() => {
        const severityValues: { [key in 'High' | 'Medium' | 'Low']: number } = { High: 3, Medium: 2, Low: 1 };
        if (sortOrder === 'none') {
            return threats;
        }
        return [...threats].sort((a, b) => {
            const valA = severityValues[a.severity];
            const valB = severityValues[b.severity];
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        });
    }, [threats, sortOrder]);


  return (
     <div className="relative h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
          <TableRow>
            <TableHead className="w-[10%]">
                 <Button type="button" variant="ghost" onClick={toggleSortOrder} className="px-0 hover:bg-transparent -ml-4">
                    Severity
                    {sortOrder === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                    {sortOrder === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                </Button>
            </TableHead>
            <TableHead className="w-[15%]">Affected Component</TableHead>
            <TableHead className="w-[30%]">Threat</TableHead>
            <TableHead className="w-[35%]">Mitigation</TableHead>
            <TableHead className="w-[10%] text-right">CVSS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedThreats.map((threat, index) => (
            <TableRow key={index}>
              <TableCell><Badge variant={getSeverityVariant(threat.severity)}>{threat.severity}</Badge></TableCell>
              <TableCell className="font-medium">{componentMap.get(threat.affectedComponentId) || threat.affectedComponentId}</TableCell>
              <TableCell>{threat.threat}</TableCell>
              <TableCell>{threat.mitigation}</TableCell>
              <TableCell className="text-right font-mono">{threat.cvss || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ThreatDetailsPanel({ selectedNodeId, threats, components }: { selectedNodeId: string | null; threats: ThreatSuggestionsOutput['threats'] | undefined; components: Component[] }) {
    const selectedComponent = useMemo(() => components.find(c => c.id === selectedNodeId), [components, selectedNodeId]);
    const filteredThreats = useMemo(() => threats?.filter(t => t.affectedComponentId === selectedNodeId) || [], [threats, selectedNodeId]);
    
    if (!selectedNodeId || !selectedComponent) {
        return (
            <div className="flex h-full items-center justify-center text-center p-4">
                <div className="text-muted-foreground">
                    <p>Click on a component in the diagram to view its specific threats.</p>
                </div>
            </div>
        );
    }
    
    const getSeverityVariant = (severity: 'High' | 'Medium' | 'Low') => {
        switch (severity) {
            case 'High': return 'destructive';
            case 'Medium': return 'secondary';
            case 'Low': return 'outline';
            default: return 'default';
        }
    };

    const iconMap: Record<string, React.FC<any>> = {
        actor: User,
        service: Server,
        datastore: Database,
    };
    const Icon = iconMap[selectedComponent.type] || Server;

    return (
        <div className="h-full flex flex-col p-4 gap-4 overflow-auto">
            <CardHeader className="flex flex-row items-center gap-4 p-0">
                <Icon className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>{selectedComponent.name}</CardTitle>
                    <CardDescription>Threats associated with this component</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
                {filteredThreats.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Severity</TableHead>
                            <TableHead>Threat</TableHead>
                            <TableHead>Mitigation</TableHead>
                            <TableHead>CVSS</TableHead>
                            <TableHead>CVE</TableHead>
                            <TableHead>CWE</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredThreats.map((threat, index) => (
                            <TableRow key={index}>
                                <TableCell><Badge variant={getSeverityVariant(threat.severity)}>{threat.severity}</Badge></TableCell>
                                <TableCell>{threat.threat}</TableCell>
                                <TableCell>{threat.mitigation}</TableCell>
                                <TableCell className="font-mono">{threat.cvss || '-'}</TableCell>
                                <TableCell className="font-mono">{threat.cve || '-'}</TableCell>
                                <TableCell className="font-mono">{threat.cwe || '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>No specific threats identified for this component.</p>
                    </div>
                )}
            </CardContent>
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

function ThreatVisorForm({ state, isPending }: { state: typeof initialState; isPending: boolean }) {
    const [dslInput, setDslInput] = useState('');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    useEffect(() => {
        const initialContent = TEMPLATES[0].content;
        setDslInput(initialContent);
    }, []);

    const handleTemplateChange = (templateName: string) => {
        const template = TEMPLATES.find((t) => t.name === templateName);
        if (template) {
            setDslInput(template.content);
            setSelectedNodeId(null);
        }
    };

    const handleDslChange = useCallback((newDsl: string) => {
        setDslInput(newDsl);
    }, []);

    const components = useMemo(() => {
        try {
            return parseDsl(dslInput).components;
        } catch (e) {
            return [];
        }
    }, [dslInput]);
    
    const isConfigLocked = isPending || !!state.threats || !!state.error;

    const handlePdfExport = () => {
        if (state.threats) {
            generatePdfReport(state.threats, components, dslInput);
        }
    };

    const handleMarkdownExport = () => {
        if (state.threats) {
            const markdownContent = generateMarkdownReport(state.threats, components, dslInput);
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'ThreatVisor-Report.md';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={40} minSize={25}>
                <div className="flex flex-col h-full p-4 gap-4">
                    <h2 className="text-lg font-semibold tracking-tight">Configuration</h2>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Templates</label>
                        <Select onValueChange={handleTemplateChange} defaultValue={TEMPLATES[0].name} disabled={isConfigLocked}>
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
                    <div className="flex flex-col gap-2 flex-1 min-h-0">
                        <label htmlFor="dsl-input" className="text-sm font-medium">
                            Architecture Definition (YAML or JSON)
                        </label>
                        <Textarea
                            id="dsl-input"
                            name="dsl"
                            placeholder="Describe your architecture here..."
                            className="flex-1 font-code text-sm resize-none bg-muted/50"
                            value={dslInput}
                            onChange={(e) => setDslInput(e.target.value)}
                            required
                            disabled={isConfigLocked}
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="methodology-select" className="text-sm font-medium">
                            Threat Modeling Methodology
                        </label>
                        <Select name="methodology" defaultValue="STRIDE" required disabled={isConfigLocked}>
                            <SelectTrigger id="methodology-select">
                                <SelectValue placeholder="Select methodology" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STRIDE">STRIDE</SelectItem>
                                <SelectItem value="LINDDUN">LINDDUN</SelectItem>
                                <SelectItem value="PASTA">PASTA</SelectItem>
                                <SelectItem value="OWASP Top 10">OWASP Top 10</SelectItem>
                                <SelectItem value="OWASP API Top 10">OWASP API Top 10</SelectItem>
                                <SelectItem value="MITRE ATT&CK">MITRE ATT&CK</SelectItem>
                                <SelectItem value="OCTAVE">OCTAVE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {isConfigLocked && !isPending ? (
                        <Button type="button" onClick={() => window.location.reload()} className="w-full">
                            <Wand2 className="mr-2 h-4 w-4" />
                            Start New Analysis
                        </Button>
                    ) : (
                        <SubmitButton pending={isPending} />
                    )}

                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="w-full" onClick={handlePdfExport} disabled={!state.threats}>
                            <Download className="mr-2 h-4 w-4"/> PDF
                        </Button>
                        <Button type="button" variant="outline" className="w-full" onClick={handleMarkdownExport} disabled={!state.threats}>
                            <FileCode className="mr-2 h-4 w-4"/> Markdown
                        </Button>
                    </div>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60} minSize={30}>
            <div className="flex flex-col h-full">
                {isPending ? (
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
                ) : (
                <Tabs defaultValue="threats" className="flex flex-col h-full">
                    <div className="p-4 border-b">
                        <TabsList>
                            <TabsTrigger value="threats">Threats</TabsTrigger>
                            <TabsTrigger value="diagram">Diagram</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="threats" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                    {state.threats ? <ThreatsTable threats={state.threats.threats} components={components} /> : (
                        <div className="flex h-full flex-col items-center justify-center text-center p-8">
                            <ShieldCheck className="h-12 w-12 text-primary/50 mb-4" />
                            <p className="text-muted-foreground">Run an analysis to see the list of threats.</p>
                        </div>
                    )}
                    </TabsContent>
                    <TabsContent value="diagram" className="flex-1 overflow-auto data-[state=inactive]:hidden m-0 p-0">
                        <ResizablePanelGroup direction="vertical">
                            <ResizablePanel defaultSize={70}>
                                <InteractiveDiagram 
                                    dsl={dslInput} 
                                    onDslChange={handleDslChange}
                                    selectedNodeId={selectedNodeId}
                                    onNodeSelect={setSelectedNodeId}
                                />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={30}>
                                <ThreatDetailsPanel 
                                    selectedNodeId={selectedNodeId}
                                    threats={state.threats?.threats}
                                    components={components}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </TabsContent>
                </Tabs>
                )}
            </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}

export function ThreatVisorClient() {
  const [state, formAction, isPending] = useActionState(analyzeThreatsAction, initialState);

  return (
    <form action={formAction} className="h-full">
      <ThreatVisorForm state={state} isPending={isPending} />
    </form>
  );
}
