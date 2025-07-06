'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { parseDsl, DslInput } from '@/lib/dsl-parser';

function dslToMermaid(dsl: DslInput): string {
    // Mermaid doesn't handle some characters well in names/labels, escape them.
    const escape = (str: string) => str.replace(/"/g, '#quot;').replace(/'/g, '`');
    
    let mermaidGraph = 'graph TD;\n';

    // Node definitions with icons
    dsl.components.forEach(c => {
        const iconMap: Record<string, string> = {
            actor: 'fa:fa-user',
            service: 'fa:fa-server',
            datastore: 'fa:fa-database',
        };
        const icon = iconMap[c.type] || 'fa:fa-box';
        // Mermaid format: id["... content ..."]
        mermaidGraph += `    ${c.id}("${escape(c.name)}<br/>[<i class='${icon}'></i> ${escape(c.type)}]");\n`;
    });

    // Data Flows
    dsl.data_flows.forEach(flow => {
        mermaidGraph += `    ${flow.from} -- "${escape(flow.label)}" --> ${flow.to};\n`;
    });

    // Trust Boundaries
    if (dsl.trust_boundaries) {
        dsl.trust_boundaries.forEach(boundary => {
            mermaidGraph += `\n    subgraph ${escape(boundary.label)}\n`;
            boundary.components.forEach(componentId => {
                mermaidGraph += `        ${componentId}\n`;
            });
            mermaidGraph += `    end\n`;
        });
    }

    // Click handlers to link nodes to the details panel
    dsl.components.forEach(c => {
        mermaidGraph += `    click ${c.id} call handleNodeClick("${c.id}") "Click to see details";\n`;
    });

    return mermaidGraph;
}


type StaticDiagramProps = {
  dsl: string;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
};

export function StaticDiagram({ dsl, selectedNodeId, onNodeSelect }: StaticDiagramProps) {
  const { resolvedTheme } = useTheme();
  const [diagram, setDiagram] = useState('');
  const [dslError, setDslError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // Mermaid's click handler needs to be on the window object
  useEffect(() => {
    (window as any).handleNodeClick = (nodeId: string) => {
        // Toggle selection
        onNodeSelect(selectedNodeId === nodeId ? null : nodeId);
    };
    return () => {
        delete (window as any).handleNodeClick;
    }
  }, [onNodeSelect, selectedNodeId]);

  // Parse DSL and convert to Mermaid syntax whenever the input changes
  useEffect(() => {
    try {
      const parsedDsl = parseDsl(dsl);
      const mermaidGraph = dslToMermaid(parsedDsl);
      setDiagram(mermaidGraph);
      setDslError(null);
    } catch (e: any) {
      setDslError(e.message);
      setDiagram('');
    }
  }, [dsl]);


  // Render the diagram with Mermaid when the syntax or theme changes
  useEffect(() => {
    if (!diagram || !containerRef.current) return;

    // Use a key to force React to re-mount the div, ensuring mermaid re-renders cleanly
    const container = containerRef.current;
    container.innerHTML = `<div class="mermaid" key="${Date.now()}">${diagram}</div>`;
    
    const mermaidTheme = resolvedTheme === 'dark' ? 'dark' : 'default';

    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      fontFamily: 'Inter, sans-serif',
      flowchart: {
          useMaxWidth: true,
      },
      themeVariables: {
        background: resolvedTheme === 'dark' ? '#212836' : '#FFFFFF',
        primaryColor: resolvedTheme === 'dark' ? '#374151' : '#E5E7EB', // gray-700 / gray-200
        primaryTextColor: resolvedTheme === 'dark' ? '#F9FAFB' : '#111827', // gray-50 / gray-900
        primaryBorderColor: '#3F51B5', // primary
        lineColor: resolvedTheme === 'dark' ? '#4B5563' : '#9CA3AF', // gray-600 / gray-400
        secondaryColor: '#10B981', // emerald-500
      },
      securityLevel: 'loose'
    });

    mermaid.run({
      nodes: container.querySelectorAll('.mermaid'),
    });

  }, [diagram, resolvedTheme]);

   // Highlight the selected node
   useEffect(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    // Clear previous selections
    svg.querySelectorAll('.node.selected').forEach(el => el.classList.remove('selected'));

    if (selectedNodeId) {
        // Mermaid uses the node ID for the DOM element ID
        const nodeElement = svg.querySelector(`#${CSS.escape(selectedNodeId)}`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
    }
   }, [selectedNodeId, diagram, resolvedTheme]); // Rerun on diagram/theme change to re-apply selection


  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      event.preventDefault();
      const newZoom = zoom - event.deltaY * 0.001;
      setZoom(Math.min(Math.max(0.5, newZoom), 3));
    }
  };

  if (dslError) {
    return (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md h-full flex items-center justify-center">
          <div>
            <h3 className="font-semibold">DSL Error</h3>
            <p className="text-sm">Please fix the syntax in the editor.</p>
            <pre className="mt-2 text-sm whitespace-pre-wrap font-code bg-destructive/10 p-2 rounded">{dslError}</pre>
          </div>
        </div>
    );
  }

  return (
    <div onWheel={handleWheel} className="h-full w-full overflow-auto p-4 flex items-center justify-center bg-background relative">
        <style>
            {`
            .node.selected > rect, .node.selected > path {
                stroke: hsl(var(--accent)) !important;
                stroke-width: 4px !important;
            }
            .mermaid-container .mermaid svg {
                max-width: none !important;
                height: auto;
            }
            .zoom-wrapper {
                transition: transform 0.1s ease-in-out;
            }
            `}
        </style>
      <div className="zoom-wrapper" style={{ transform: `scale(${zoom})` }}>
        <div
            ref={containerRef}
            className="mermaid-container text-center"
        />
      </div>
       <div className="absolute bottom-4 right-4 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-md shadow-md pointer-events-none">
        Hold Ctrl + Scroll to zoom
      </div>
    </div>
  );
}
