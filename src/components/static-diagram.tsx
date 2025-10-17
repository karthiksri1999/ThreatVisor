'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { parseDsl } from '@/lib/dsl-parser';
import { Button } from './ui/button';
import { Plus, Minus, Maximize } from 'lucide-react';
import { dslToMermaid, initializeMermaid } from '@/lib/mermaid-utils';

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // Mermaid's click handler needs to be on the window object
  useEffect(() => {
    (window as any).handleNodeClick = (nodeId: string) => {
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
      const mermaidGraph = dslToMermaid(parsedDsl, { interactive: true });
      setDiagram(mermaidGraph);
      setDslError(null);
    } catch (e: any) {
      setDslError(e.message);
      setDiagram('');
    }
  }, [dsl]);


  const handleFitToScreen = () => {
    if (!containerRef.current || !viewportRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const viewportWidth = viewportRef.current.clientWidth;
    const viewportHeight = viewportRef.current.clientHeight;

    // The SVG's width/height attributes might not be reliable, use getBBox
    const { width: svgWidth, height: svgHeight } = svg.getBBox();
    
    if (svgWidth === 0 || svgHeight === 0) return;

    const padding = 32; // Add some padding
    const scaleX = (viewportWidth - padding) / svgWidth;
    const scaleY = (viewportHeight - padding) / svgHeight;

    const newZoom = Math.min(scaleX, scaleY);
    // Clamp the auto-fit zoom to reasonable bounds
    setZoom(Math.min(Math.max(0.1, newZoom), 5));
  };


  // Render the diagram with Mermaid when the syntax or theme changes
  useEffect(() => {
    if (!diagram || !containerRef.current) return;

    const container = containerRef.current;
    // Add a key to the div to force re-render, which can help with mermaid's reactivity
    container.innerHTML = `<div class="mermaid" key="${Date.now()}">${diagram}</div>`;
    
    initializeMermaid(resolvedTheme as any);

    mermaid.run({
      nodes: container.querySelectorAll('.mermaid'),
      suppressErrors: true,
    }).then(() => {
        // After rendering, fit the diagram to the screen.
        // A small delay ensures the bounding box is calculated correctly.
        setTimeout(handleFitToScreen, 100);
    }).catch(err => {
        console.error("Mermaid rendering failed:", err);
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
        // Use CSS escaping for IDs that might contain special characters
        const nodeElement = svg.querySelector(`#${CSS.escape(selectedNodeId)}`);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
    }
   }, [selectedNodeId, diagram, resolvedTheme]); // Rerun when diagram changes to re-apply selection


  const handleZoom = (direction: 'in' | 'out') => {
    const zoomStep = 0.25;
    setZoom(prevZoom => {
        const newZoom = direction === 'in' ? prevZoom + zoomStep : prevZoom - zoomStep;
        return Math.min(Math.max(0.2, newZoom), 5); // Clamp zoom level up to 500%
    });
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
    <div className="h-full w-full bg-background relative">
        <style>
            {`
            .node.selected > rect, .node.selected > path, .node.selected > polygon {
                stroke: hsl(var(--accent)) !important;
                stroke-width: 4px !important;
            }
            .mermaid-container .mermaid svg {
                max-width: none !important;
                height: auto;
            }
            .zoom-wrapper {
                transition: transform 0.1s ease-in-out;
                flex-shrink: 0;
            }
            `}
        </style>
       <div ref={viewportRef} className="h-full w-full overflow-auto p-4 flex justify-center items-center">
        <div className="zoom-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
            <div
                ref={containerRef}
                className="mermaid-container"
            />
        </div>
      </div>
       <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => handleZoom('out')} aria-label="Zoom out">
                <Minus className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center bg-background/50 backdrop-blur-sm rounded">
                {Math.round(zoom * 100)}%
            </span>
            <Button type="button" variant="outline" size="icon" onClick={() => handleZoom('in')} aria-label="Zoom in">
                <Plus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={handleFitToScreen} aria-label="Fit to screen">
                <Maximize className="h-4 w-4" />
            </Button>
       </div>
    </div>
  );
}
