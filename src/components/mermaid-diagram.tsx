'use client';

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

type MermaidDiagramProps = {
  chart: string;
};

// Initialize Mermaid on mount
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
        darkMode: true,
        background: 'transparent',
    }
  });
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = useId();
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      try {
        if (chart) {
            const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, chart);
            if(isMounted) {
                setSvg(renderedSvg);
                setError(null);
            }
        }
      } catch (e: any) {
        if(isMounted) {
            setError(e.message || 'Error rendering diagram.');
        }
      }
    };

    renderDiagram();

    return () => {
        isMounted = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
        <h3 className="font-semibold">Diagram Error</h3>
        <pre className="text-sm whitespace-pre-wrap font-code">{error}</pre>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {svg ? (
        <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="text-muted-foreground">Generating diagram...</p>
      )}
    </div>
  );
}
