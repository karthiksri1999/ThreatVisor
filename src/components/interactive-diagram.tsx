'use client';

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { DslInput, parseDsl, dumpDsl, Component as DslComponent, TrustBoundary } from '@/lib/dsl-parser';

const EditableLabel = ({ initialValue, onSave }: { initialValue: string; onSave: (newValue: string) => void }) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleBlur = () => {
        onSave(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSave(value);
        } else if (e.key === 'Escape') {
            onSave(initialValue);
        }
    };

    return (
        <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-center text-white p-0 m-0 w-full focus:outline-none"
        />
    );
};


const CustomNode = ({ data, id, selected }: { data: { label: string; type: string; onLabelChange: (id: string, label: string) => void }; id: string; selected: boolean }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    const iconMap: Record<string, string> = {
        actor: '👤',
        service: '⚙️',
        datastore: '🗄️',
    };

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleSave = (newLabel: string) => {
        setIsEditing(false);
        if (newLabel.trim() !== '' && newLabel !== data.label) {
            data.onLabelChange(id, newLabel);
        }
    };

    return (
        <div
            className={cn(
                "rounded-lg border-2 p-3 text-white shadow-md flex items-center gap-3 w-48",
                {
                    'border-accent': selected,
                    'border-primary/50 bg-primary/80': data.type === 'actor',
                    'border-secondary-foreground/50 bg-secondary/80': data.type === 'service',
                    'border-destructive/50 bg-destructive/80': data.type === 'datastore',
                }
            )}
            onDoubleClick={handleDoubleClick}
        >
            <div className="text-2xl">{iconMap[data.type] || '📦'}</div>
            <div className="flex-grow text-center">
                {isEditing ? (
                    <EditableLabel initialValue={data.label} onSave={handleSave} />
                ) : (
                    <span>{data.label}</span>
                )}
            </div>
        </div>
    );
};

const dslToFlow = (dsl: DslInput, onLabelChange: (id: string, label: string) => void) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    if (dsl.trust_boundaries) {
        dsl.trust_boundaries.forEach((boundary, i) => {
            nodes.push({
                id: boundary.id,
                data: { label: boundary.label },
                position: { x: 50, y: 50 + i * 600 },
                style: { 
                    backgroundColor: 'hsl(var(--accent) / 0.05)',
                    borderColor: 'hsl(var(--accent) / 0.3)',
                    borderWidth: 2,
                    width: '600px',
                    height: '500px',
                },
                type: 'group',
                zIndex: -1,
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
                position = { x: 50 + (idx % 2) * 250, y: 75 + Math.floor(idx / 2) * 150 };
                boundaryComponentIndex[parentBoundary.id] = idx + 1;
            } else {
                const nonBoundaryIndex = dsl.components.filter(c => !componentsInBoundaries.has(c.id)).findIndex(c => c.id === component.id);
                position = { x: 700 + (nonBoundaryIndex % 2) * 250, y: 100 + Math.floor(nonBoundaryIndex / 2) * 150 };
            }
        }
        
        nodes.push({
            id: component.id,
            data: { label: component.name, type: component.type, onLabelChange },
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
                position: { x: Math.round(node.position?.x || 0), y: Math.round(node.position?.y || 0) }
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
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
};

export function InteractiveDiagram({ dsl, onDslChange, onNodeSelect, selectedNodeId }: InteractiveDiagramProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [dslError, setDslError] = useState<string | null>(null);

  // This ref acts as the single source of truth for the current state of the diagram,
  // represented as a DSL string. This is key to preventing re-render loops.
  const flowDslRef = useRef<string>(dsl);

  const handleNodeLabelChange = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, label: newLabel } };
        }
        return node;
      })
    );
  }, []);

  const nodeTypes: NodeTypes = useMemo(() => ({
    custom: (props) => <CustomNode {...props} />,
  }), []);

  // Sync from parent DSL to React Flow state (e.g., when a template is loaded)
  useEffect(() => {
    if (dsl !== flowDslRef.current) {
        try {
            const parsedDsl = parseDsl(dsl);
            const { nodes: newNodes, edges: newEdges } = dslToFlow(parsedDsl, handleNodeLabelChange);
            setNodes(newNodes);
            setEdges(newEdges);
            flowDslRef.current = dsl;
            setDslError(null);
        } catch (e: any) {
            setDslError(e.message);
        }
    }
  }, [dsl, handleNodeLabelChange]);

  // Sync from React Flow state up to parent (when user interacts with the diagram)
  useEffect(() => {
    if (!nodes.length && !edges.length) return;

    const newDslString = dumpDsl(flowToDsl(nodes, edges));
    if (newDslString !== flowDslRef.current) {
        flowDslRef.current = newDslString;
        onDslChange(newDslString);
    }
  }, [nodes, edges, onDslChange]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed' },
        label: `New flow ${edges.length + 1}`,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [edges.length]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

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
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
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
