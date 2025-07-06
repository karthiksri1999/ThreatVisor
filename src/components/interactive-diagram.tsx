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
  Handle,
  Position,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { DslInput, parseDsl, dumpDsl, Component as DslComponent, TrustBoundary } from '@/lib/dsl-parser';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.layered.unnecessaryBendpoints': 'true',
};

const getLayoutedElements = async (nodes: Node[], edges: Edge[]): Promise<{ nodes: Node[], edges: Edge[] }> => {
    const graph = {
        id: 'root',
        layoutOptions: elkOptions,
        children: nodes.map(node => ({
            ...node,
            width: 192,
            height: 68,
        })),
        edges: edges,
    };

    const layoutedGraph = await elk.layout(graph);
    
    const layoutedNodes = nodes.map(node => {
        const nodeFromLayout = layoutedGraph.children?.find(n => n.id === node.id);
        if (nodeFromLayout) {
            return {
                ...node,
                position: { x: nodeFromLayout.x, y: nodeFromLayout.y }
            };
        }
        return node;
    });

    return { nodes: layoutedNodes, edges: layoutedGraph.edges ?? edges };
};


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
            className="nodrag bg-transparent text-center text-white p-0 m-0 w-full focus:outline-none"
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
                "rounded-lg border-2 p-3 text-white shadow-md flex items-center gap-3 w-48 nodrag",
                {
                    'border-accent': selected,
                    'border-primary/50 bg-primary/80': data.type === 'actor',
                    'border-secondary-foreground/50 bg-secondary/80': data.type === 'service',
                    'border-destructive/50 bg-destructive/80': data.type === 'datastore',
                }
            )}
            onDoubleClick={handleDoubleClick}
        >
            <Handle type="source" position={Position.Top} className="!w-3 !h-3 !bg-teal-500" />
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-teal-500" />
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-teal-500" />
            <Handle type="target" position={Position.Right} className="!w-3 !h-3 !bg-teal-500" />
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-500" />
            <Handle type="target" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-500" />
            <Handle type="source" position={Position.Left} className="!w-3 !h-3 !bg-teal-500" />
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-teal-500" />
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

const dslToFlowElements = (dsl: DslInput, onLabelChange: (id: string, label: string) => void) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Note: Advanced group layouting with ELK is complex.
    // This implementation will layout components and draw trust boundaries around them later.
    // For now, we'll create the component nodes and edges for layouting.

    dsl.components.forEach((component) => {
        const parentBoundary = dsl.trust_boundaries?.find(b => b.components.includes(component.id));
        nodes.push({
            id: component.id,
            data: { label: component.name, type: component.type, onLabelChange },
            position: { x: 0, y: 0 }, // Placeholder for auto-layout
            parentNode: parentBoundary?.id,
            extent: parentBoundary ? 'parent' : undefined,
            type: 'custom',
        });
    });

    if (dsl.trust_boundaries) {
        dsl.trust_boundaries.forEach((boundary) => {
            nodes.push({
                id: boundary.id,
                data: { label: boundary.label },
                position: { x: 0, y: 0 },
                className: 'light:bg-slate-100 dark:bg-slate-900 !border-accent/50',
                style: {
                    backgroundColor: 'hsl(var(--accent) / 0.05)',
                },
                type: 'group',
                zIndex: -1,
            });
        });
    }

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
        } else if (node.type === 'custom' && node.data.label) {
            components.push({
                id: node.id,
                name: node.data.label,
                type: node.data.type,
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

function DiagramLayout({ dsl, onDslChange, onNodeSelect }: InteractiveDiagramProps) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [dslError, setDslError] = useState<string | null>(null);
    const { fitView } = useReactFlow();
  
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
  
    useEffect(() => {
        let isMounted = true;
        const layout = async () => {
            try {
                const parsedDsl = parseDsl(dsl);
                const { nodes: initialNodes, edges: initialEdges } = dslToFlowElements(parsedDsl, handleNodeLabelChange);
                
                if (initialNodes.length === 0) {
                    if (isMounted) {
                        setNodes([]);
                        setEdges([]);
                        setDslError(null);
                    }
                    return;
                }

                const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(initialNodes, initialEdges);

                if (isMounted) {
                    setNodes(layoutedNodes);
                    setEdges(layoutedEdges);
                    setDslError(null);
                    // Defer fitView to ensure nodes are rendered
                    setTimeout(() => fitView({ duration: 400 }), 10);
                }
            } catch (e: any) {
                if (isMounted) {
                    setDslError(e.message);
                }
            }
        };
        layout();

        return () => { isMounted = false; };
    }, [dsl, handleNodeLabelChange, fitView]);
  
    useEffect(() => {
        if (!nodes.length && !edges.length) return;
        const newDslObject = flowToDsl(nodes, edges);
        const newDslString = dumpDsl(newDslObject);
        const oldDslObject = parseDsl(dsl);
        const oldDslString = dumpDsl(oldDslObject);
        if (newDslString !== oldDslString) {
            onDslChange(newDslString);
        }
    }, [nodes, edges, dsl, onDslChange]);
  
    const onNodesChange: OnNodesChange = useCallback((changes) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);
  
    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    }, []);
  
    const onConnect: OnConnect = useCallback(
      (connection) => {
          if (connection.source === connection.target) return;
        const newEdge = {
          ...connection,
          id: `e-${connection.source}-${connection.target}-${Math.random()}`,
          type: 'smoothstep',
          markerEnd: { type: 'arrowclosed' },
          label: `New flow`,
        };
        setEdges((eds) => addEdge(newEdge, eds));
      },
      []
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
          className="react-flow-node-selector"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
    );
  }


export function InteractiveDiagram(props: InteractiveDiagramProps) {
    return (
        <div style={{ height: '100%', width: '100%', background: 'hsl(var(--background))' }}>
            <ReactFlowProvider>
                <DiagramLayout {...props} />
            </ReactFlowProvider>
        </div>
    );
}