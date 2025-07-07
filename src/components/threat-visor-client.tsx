
'use client';

import { useActionState, useEffect, useState, useMemo } from 'react';
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
import { AlertCircle, Download, FileCode, Link as LinkIcon, Loader2, Sparkles, Wand2, ShieldCheck, Database, Server, User, ArrowUp, ArrowDown, Plus, Minus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { StaticDiagram } from './static-diagram';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ThreatSuggestionsOutput } from '@/ai/flows/threat-suggestions';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Component } from '@/lib/dsl-parser';
import { generateMarkdownReport, generatePdfReport } from '@/lib/exporter';


const initialState = {
  threats: null,
  error: null,
  components: null,
  analyzedDsl: null,
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

function VulnerabilityLink({ type, id }: { type: 'CVE' | 'CWE'; id: string }) {
    if (!id) return <>-</>;

    const baseUrl = type === 'CVE' 
        ? 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=' 
        : 'https://cwe.mitre.org/data/definitions/';
    
    const href = type === 'CWE'
        ? `${baseUrl}${id.split('-')[1]}.html`
        : `${baseUrl}${id}`;
    
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-primary">
            {id}
            <LinkIcon className="h-3 w-3" />
        </a>
    )
}

function ThreatsTable({ threats, components }: { threats: ThreatSuggestionsOutput['threats'], components: Component[] }) {
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

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
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const sortedThreats = useMemo(() => {
        const severityValues: { [key in 'High' | 'Medium' | 'Low']: number } = { High: 3, Medium: 2, Low: 1 };
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
            <TableHead className="w-[8%]">
                 <Button type="button" variant="ghost" onClick={toggleSortOrder} className="px-0 hover:bg-transparent -ml-4">
                    Severity
                    {sortOrder === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />}
                </Button>
            </TableHead>
            <TableHead className="w-[15%]">Affected Component</TableHead>
            <TableHead className="w-[25%]">Threat</TableHead>
            <TableHead className="w-[30%]">Mitigation</TableHead>
            <TableHead className="w-[7%] text-right">CVSS</TableHead>
            <TableHead className="w-[8%]">CVE</TableHead>
            <TableHead className="w-[7%]">CWE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedThreats.map((threat, index) => (
            <TableRow key={index}>
              <TableCell><Badge variant={getSeverityVariant(threat.severity)}>{threat.severity}</Badge></TableCell>
              <TableCell className="font-medium">{componentMap.get(threat.affectedComponentId) || threat.affectedComponentId}</TableCell>
              <TableCell>{threat.threat}</TableCell>
              <TableCell>{threat.mitigation}</TableCell>
              <TableCell className="text-right font-mono">{threat.cvss || '-'}</TableCell>
              <TableCell className="font-mono text-xs"><VulnerabilityLink type="CVE" id={threat.cve || ''} /></TableCell>
              <TableCell className="font-mono text-xs"><VulnerabilityLink type="CWE" id={threat.cwe || ''} /></TableCell>
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
                                <TableCell className="font-mono text-xs"><VulnerabilityLink type="CVE" id={threat.cve || ''} /></TableCell>
                                <TableCell className="font-mono text-xs"><VulnerabilityLink type="CWE" id={threat.cwe || ''} /></TableCell>
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

function ThreatVisorForm({ state, isPending, onReset }: { state: typeof initialState; isPending: boolean; onReset: () => void; }) {
    const [dslInput, setDslInput] = useState('');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    useEffect(() => {
        const initialContent = TEMPLATES[0].content;
        setDslInput(initialContent);
    }, []);
    
    // Reset node selection if the underlying data changes
    useEffect(() => {
        setSelectedNodeId(null);
    }, [state.analyzedDsl]);

    const handleTemplateChange = (templateName: string) => {
        const template = TEMPLATES.find((t) => t.name === templateName);
        if (template) {
            setDslInput(template.content);
            setSelectedNodeId(null);
        }
    };
    
    const analysisHasRun = !!state.threats;
    const analysisComponents = state.components || [];
    const dslForDiagram = state.analyzedDsl || dslInput;
    const isConfigLocked = isPending || analysisHasRun;

    const handlePdfExport = async () => {
        if (state.threats && state.components && state.analyzedDsl) {
            const svgEl = document.querySelector('.mermaid-container > svg');
            const diagramSvg = svgEl ? svgEl.outerHTML : '';
            await generatePdfReport(state.threats, state.components, state.analyzedDsl, diagramSvg);
        }
    };

    const handleMarkdownExport = () => {
        if (state.threats && state.components && state.analyzedDsl) {
            const svgEl = document.querySelector('.mermaid-container > svg');
            const diagramSvg = svgEl ? svgEl.outerHTML : '<!-- Diagram could not be generated -->';
            const markdownContent = generateMarkdownReport(state.threats, state.components, state.analyzedDsl, diagramSvg);
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
                            className="font-code text-sm resize-none flex-1"
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
                        <Button type="button" onClick={onReset} className="w-full">
                            <Wand2 className="mr-2 h-4 w-4" />
                            Start New Analysis
                        </Button>
                    ) : (
                        <SubmitButton pending={isPending} />
                    )}

                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="w-full" onClick={handlePdfExport} disabled={!analysisHasRun}>
                            <Download className="mr-2 h-4 w-4"/> PDF
                        </Button>
                        <Button type="button" variant="outline" className="w-full" onClick={handleMarkdownExport} disabled={!analysisHasRun}>
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
                ) : state.error ? (
                <div className="flex h-full items-center justify-center p-8">
                    <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Analysis Failed</AlertTitle>
                    <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                </div>
                ) : analysisHasRun ? (
                <Tabs defaultValue="threats" className="flex flex-col h-full">
                    <div className="p-4 border-b">
                        <TabsList>
                            <TabsTrigger value="threats">Threats</TabsTrigger>
                            <TabsTrigger value="diagram">Diagram</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="threats" className="flex-1 overflow-auto data-[state=inactive]:hidden">
                        <ThreatsTable threats={state.threats.threats} components={analysisComponents} />
                    </TabsContent>
                    <TabsContent 
                        value="diagram" 
                        className="flex-1 overflow-hidden m-0 p-0 data-[state=inactive]:absolute data-[state=inactive]:h-px data-[state=inactive]:w-px data-[state=inactive]:-left-[9999px]"
                    >
                        <ResizablePanelGroup direction="vertical">
                            <ResizablePanel defaultSize={70}>
                                <StaticDiagram 
                                    dsl={dslForDiagram} 
                                    selectedNodeId={selectedNodeId}
                                    onNodeSelect={setSelectedNodeId}
                                />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={30} minSize={20}>
                                <ThreatDetailsPanel 
                                    selectedNodeId={selectedNodeId}
                                    threats={state.threats.threats}
                                    components={analysisComponents}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </TabsContent>
                </Tabs>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center p-8">
                        <ShieldCheck className="h-12 w-12 text-primary/50 mb-4" />
                        <h3 className="text-xl font-semibold">Welcome to ThreatVisor</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                            Define your architecture using our YAML-based language, choose a threat modeling methodology, and let our AI do the heavy lifting.
                        </p>
                    </div>
                )}
            </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    )
}

export function ThreatVisorClient() {
  const [state, formAction, isPending] = useActionState(analyzeThreatsAction, initialState);
  const [formKey, setFormKey] = useState(0);

  const handleReset = () => {
    setFormKey(prev => prev + 1);
  }
  
  // The header is h-16 which is 4rem. 100vh - 4rem gives the remaining height for the main content.
  return (
    <form action={formAction} className="h-[calc(100vh-4rem)]" key={formKey}>
      <ThreatVisorForm state={state} isPending={isPending} onReset={handleReset} />
    </form>
  );
}
