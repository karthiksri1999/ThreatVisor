'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { DslInput, parseDsl, dumpDsl, Component as DslComponent, TrustBoundary } from '@/lib/dsl-parser';
import { useTheme } from 'next-themes';

const CustomNode = ({ data, id, selected }: { data: { label: string, type: string }, id: string, selected: boolean }) => {
    const iconMap: Record<string, string> = {
        actor: '👤',
        service: '⚙️',
        datastore: '🗄️',
    };
    const colorMap: Record<string, string> = {
        actor: '#3F51B5',
        service: '#212836',
        datastore: '#4a148c',
    }

    return (
        <div style={{
            padding: '10px 15px',
            borderRadius: '8px',
            border: `2px solid ${selected ? '#009688' : (colorMap[data.type] || '#ccc')}`,
            backgroundColor: colorMap[data.type] || '#eee',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        }}>
            <span style={{ fontSize: '1.5rem' }}>{iconMap[data.type] || '📦'}</span>
            <span>{data.label}</span>
        </div>
    );
};


const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const dslToFlow = (dsl: DslInput) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    if (dsl.trust_boundaries) {
        dsl.trust_boundaries.forEach((boundary) => {
            nodes.push({
                id: boundary.id,
                data: { label: boundary.label },
                position: { x: 0, y: 0 },
                className: 'light',
                style: { 
                    backgroundColor: 'rgba(0, 150, 136, 0.05)',
                    borderColor: 'rgba(0, 150, 136, 0.3)',
                    width: '500px',
                    height: '500px',
                },
                type: 'group',
            });
        });
    }
    
    const componentsInBoundaries = new Set<string>();
    if(dsl.trust_boundaries) {
        dsl.trust_boundaries.forEach(b => b.components.forEach(c => componentsInBoundaries.add(c)));
    }
    
    let boundaryComponentIndex: { [key: string]: number } = {};
    
    dsl.components.forEach((component) => {
        const parentBoundary = dsl.trust_boundaries?.find(b => b.components.includes(component.id));
        let position;
        if (component.position) {
            position = component.position;
        } else {
             if (parentBoundary) {
                const idx = boundaryComponentIndex[parentBoundary.id] || 0;
                position = { x: 50 + (idx % 2) * 200, y: 50 + Math.floor(idx / 2) * 120 };
                boundaryComponentIndex[parentBoundary.id] = idx + 1;
            } else {
                const nonBoundaryIndex = dsl.components.filter(c => !componentsInBoundaries.has(c.id)).findIndex(c => c.id === component.id);
                position = { x: 100 + (nonBoundaryIndex % 4) * 250, y: 600 + Math.floor(nonBoundaryIndex / 4) * 150 };
            }
        }
        
        nodes.push({
            id: component.id,
            data: { label: component.name, type: component.type },
            position,
            parentNode: parentBoundary?.id,
            extent: parentBoundary ? 'parent' : undefined,
            type: 'custom',
        });
    });

    dsl.data_flows.forEach((flow, index) => {
        edges.push({
            id: `e-${flow.from}-${flow.to}-${index}`,
            source: flow.from,
            target: flow.to,
            label: flow.label,
            type: 'smoothstep',
            markerEnd: { type: 'arrowclosed' },
        });
    });

    return { nodes, edges };
};

const flowToDsl = (nodes: Node[], edges: Edge[]): DslInput => {
    const components: DslComponent[] = [];
    const data_flows: any[] = [];
    const trust_boundaries: TrustBoundary[] = [];

    nodes.forEach(node => {
        if (node.type === 'group') {
            trust_boundaries.push({
                id: node.id,
                label: node.data.label,
                components: nodes.filter(n => n.parentNode === node.id).map(n => n.id)
            });
        } else if (node.data.label) {
            components.push({
                id: node.id,
                name: node.data.label,
                type: node.data.type,
                position: { x: Math.round(node.position.x), y: Math.round(node.position.y) }
            });
        }
    });

    edges.forEach(edge => {
        if (edge.source && edge.target) {
            data_flows.push({
                from: edge.source,
                to: edge.target,
                label: edge.label as string,
            });
        }
    });
    
    components.sort((a, b) => a.id.localeCompare(b.id));

    return { components, data_flows, trust_boundaries };
};

type InteractiveDiagramProps = {
  dsl: string;
  onDslChange: (newDsl: string) => void;
};

export function InteractiveDiagram({ dsl, onDslChange }: InteractiveDiagramProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [dslError, setDslError] = useState<string | null>(null);
  const dslRef = useRef(dsl);

  useEffect(() => {
    dslRef.current = dsl;
    // Basic check to prevent update loops if the flow state caused this change
    const currentFlowAsDsl = dumpDsl(flowToDsl(nodes, edges));
    if (currentFlowAsDsl === dsl) return;

    try {
      const parsedDsl = parseDsl(dsl);
      const { nodes: newNodes, edges: newEdges } = dslToFlow(parsedDsl);
      setNodes(newNodes);
      setEdges(newEdges);
      setDslError(null);
    } catch (e: any) {
        setDslError(e.message);
    }
  }, [dsl, nodes, edges]);
  
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect: OnConnect = useCallback((connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', markerEnd: { type: 'arrowclosed' }, label: 'New flow' }, eds));
  }, []);

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      const handler = setTimeout(() => {
        const newDslObject = flowToDsl(nodes, edges);
        const newDslString = dumpDsl(newDslObject);
        if (newDslString !== dslRef.current) {
          onDslChange(newDslString);
        }
      }, 500);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [nodes, edges, onDslChange]);

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
    <div style={{ height: '100%', width: '100%', background: 'hsl(var(--background))' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
