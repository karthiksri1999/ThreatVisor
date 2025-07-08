
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
import { AlertCircle, Download, FileCode, Loader2, Sparkles, Wand2, ShieldCheck, Database, Server, User, ArrowUp, ArrowDown } from 'lucide-react';
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
import { dslToMermaid, initializeMermaid } from '@/lib/mermaid-utils';
import { parseDsl } from '@/lib/dsl-parser';
import { useTheme } from 'next-themes';


const initialState = {
  threats: null,
  error: null,
  components: null,
  analyzedDsl: null,
  analyzedMethodology: null,
};

function VulnerabilityLink({ type, id }: { type: 'CVE' | 'CWE'; id: string }) {
    if (!id) return <>-</>;

    const baseUrl = type === 'CVE' 
        ? 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=' 
        : 'https://cwe.mitre.org/data/definitions/';
    
    const href = type === 'CWE'
        ? `${baseUrl}${id.split('-')[1]}.html`
        : `${baseUrl}${id}`;
    
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
            {id}
        </a>
    )
}

type ThreatSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

function ThreatsTable({ threats, components }: { threats: ThreatSuggestionsOutput['threats'], components: Component[] }) {
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    const getSeverityVariant = (severity: ThreatSeverity) => {
        switch (severity) {
            case 'Critical': return 'destructive';
            case 'High': return 'default';
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
        const severityValues: { [key in ThreatSeverity]: number } = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return [...threats].sort((a, b) => {
            const valA = severityValues[a.severity as ThreatSeverity];
            const valB = severityValues[b.severity as ThreatSeverity];
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        });
    }, [threats, sortOrder]);


  return (
     <div className="relative h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
          <TableRow>
            <TableHead className="w-[120px] pl-6">
                 <Button type="button" variant="ghost" onClick={toggleSortOrder} className="px-0 hover:bg-transparent flex items-center gap-1">
                    Severity
                    {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
            </TableHead>
            <TableHead className="min-w-[200px]">Affected Component</TableHead>
            <TableHead>Threat</TableHead>
            <TableHead>Mitigation</TableHead>
            <TableHead className="w-[80px] text-right">CVSS</TableHead>
            <TableHead className="min-w-[150px]">CVE</TableHead>
            <TableHead className="min-w-[120px] pr-6">CWE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedThreats.map((threat, index) => (
            <TableRow key={index} className="even:bg-muted/30">
              <TableCell className="pl-6"><Badge variant={getSeverityVariant(threat.severity as ThreatSeverity)}>{threat.severity}</Badge></TableCell>
              <TableCell className="font-medium">{componentMap.get(threat.affectedComponentId) || threat.affectedComponentId}</TableCell>
              <TableCell className="text-sm">{threat.threat}</TableCell>
              <TableCell className="text-sm">{threat.mitigation}</TableCell>
              <TableCell className="text-right font-mono">{threat.cvss?.toFixed(1) || '-'}</TableCell>
              <TableCell className="font-mono text-xs"><VulnerabilityLink type="CVE" id={threat.cve || ''} /></TableCell>
              <TableCell className="font-mono text-xs pr-6"><VulnerabilityLink type="CWE" id={threat.cwe || ''} /></TableCell>
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
    
    const getSeverityVariant = (severity: ThreatSeverity) => {
        switch (severity) {
            case 'Critical': return 'destructive';
            case 'High': return 'default';
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
                                <TableCell><Badge variant={getSeverityVariant(threat.severity as ThreatSeverity)}>{threat.severity}</Badge></TableCell>
                                <TableCell>{threat.threat}</TableCell>
                                <TableCell>{threat.mitigation}</TableCell>
                                <TableCell className="font-mono">{threat.cvss?.toFixed(1) || '-'}</TableCell>
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
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        // On initial load or after a reset, state.analyzedDsl is null. Use the template.
        // If an analysis fails, state.analyzedDsl will have the user's attempted DSL, so we preserve it.
        if (state.analyzedDsl) {
            setDslInput(state.analyzedDsl);
        } else {
            setDslInput(TEMPLATES[0].content);
        }
    }, [state.analyzedDsl]);
    
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
    const isSelectsLocked = isPending || analysisHasRun;
    
    const normalize = (s: string | null | undefined) => (s || '').replace(/\r\n/g, '\n').trim();
    const dslHasChanged = analysisHasRun && normalize(state.analyzedDsl) !== normalize(dslInput);

    /**
     * Generates a "clean" SVG for exporting. This function renders the diagram headlessly
     * with specific options to make it safe for conversion to other formats like PNG,
     * avoiding browser security errors related to external resources or complex HTML.
     * @param dslString The architecture definition string.
     * @returns A promise that resolves with the clean SVG string.
     */
    const generateDiagramSvgForExport = (dslString: string, theme: 'dark' | 'light' | 'default'): Promise<string> => {
        const parsedDsl = parseDsl(dslString);
        // Generate a definition that is safe for export (no complex HTML or icons).
        const mermaidGraph = dslToMermaid(parsedDsl, {
            interactive: false,
            includeIcons: false, // Prevents <foreignObject> which can taint canvas
            useHtmlLabels: false, // Prevents <br> which can also taint canvas
        });

        return new Promise<string>(async (resolve, reject) => {
            try {
                // Dynamically import mermaid to ensure it's only loaded on the client-side
                // and to avoid potential bundling issues where `document` is not available.
                const mermaid = (await import('mermaid')).default;
                
                // IMPORTANT: Mermaid MUST be initialized before calling render.
                initializeMermaid(theme);
                
                mermaid.render(`headless-export-${Date.now()}`, mermaidGraph, (svgCode) => {
                    // The output of mermaid.render might still contain the 'Inter' font from global config.
                    // Replace it with a generic font to be 100% safe.
                    const finalSvg = svgCode.replace(/font-family:\s*['"]Inter['"]/g, "font-family: 'sans-serif'");
                    resolve(finalSvg);
                });
            } catch (e) {
                console.error("Headless mermaid render failed:", e);
                reject(new Error("Failed to render diagram for export."));
            }
        });
    };

    const handlePdfExport = async () => {
        if (!state.threats || !state.components || !state.analyzedDsl || !resolvedTheme) return;
        try {
            const diagramSvg = await generateDiagramSvgForExport(state.analyzedDsl, resolvedTheme as any);
            if (!diagramSvg) return;
            await generatePdfReport(state.threats, state.components, state.analyzedDsl, diagramSvg);
        } catch(e) {
            console.error("PDF Export failed:", e);
        }
    };

    const handleMarkdownExport = async () => {
        if (!state.threats || !state.components || !state.analyzedDsl || !resolvedTheme) return;
        try {
            // For consistency and to prevent any potential rendering issues in different markdown viewers,
            // we use the same clean SVG generation method as the PDF export.
            const diagramSvg = await generateDiagramSvgForExport(state.analyzedDsl, resolvedTheme as any);
            if (!diagramSvg) return;

            const markdownContent = generateMarkdownReport(state.threats, state.components, state.analyzedDsl, diagramSvg);
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'ThreatVisor-Report.md';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(e) {
             console.error("Markdown Export failed:", e);
        }
    };
    
    return (
        <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={40} minSize={25}>
                <div className="flex flex-col h-full p-4 gap-4">
                    <h2 className="text-lg font-semibold tracking-tight">Configuration</h2>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Templates</label>
                        <Select 
                            onValueChange={handleTemplateChange} 
                            defaultValue={TEMPLATES[0].name} 
                            disabled={isSelectsLocked}
                        >
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
                            className="font-code text-sm resize-none h-full"
                            value={dslInput}
                            onChange={(e) => setDslInput(e.target.value)}
                            required
                            disabled={isPending}
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="methodology-select" className="text-sm font-medium">
                            Threat Modeling Methodology
                        </label>
                        <Select 
                            name="methodology" 
                            defaultValue={state.analyzedMethodology || "STRIDE"}
                            key={state.analyzedMethodology} // Re-mount when methodology changes
                            required 
                            disabled={isSelectsLocked}
                        >
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
                    
                    {isPending ? (
                        <Button disabled={true} className="w-full">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                        </Button>
                    ) : !analysisHasRun ? (
                        <Button type="submit" className="w-full">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Analyze Threats
                        </Button>
                    ) : dslHasChanged ? (
                        <Button type="submit" className="w-full">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Reanalyze Threats
                        </Button>
                    ) : (
                        <Button type="button" onClick={onReset} className="w-full">
                            <Wand2 className="mr-2 h-4 w-4" />
                            Start New Analysis
                        </Button>
                    )}

                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="w-full" onClick={handlePdfExport} disabled={!analysisHasRun || isPending}>
                            <Download className="mr-2 h-4 w-4"/> PDF
                        </Button>
                        <Button type="button" variant="outline" className="w-full" onClick={handleMarkdownExport} disabled={!analysisHasRun || isPending}>
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
                    <p className="text-muted-foreground">The system is identifying potential threats. This may take a moment.</p>
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
                    <TabsContent value="diagram" className="flex-1 overflow-hidden m-0 data-[state=inactive]:absolute data-[state=inactive]:-left-[9999px] data-[state=inactive]:top-auto data-[state=inactive]:h-1 data-[state=inactive]:w-1">
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
                            Define your architecture using our YAML-based language, choose a threat modeling methodology, and let the system do the heavy lifting.
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
