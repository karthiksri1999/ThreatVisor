'use client';

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { cn } from '@/lib/utils';
import { DslInput, parseDsl } from '@/lib/dsl-parser';
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


const CustomNode = ({ data, id, selected }: { data: { label: string; type: string; }; id: string; selected: boolean }) => {
    const iconMap: Record<string, string> = {
        actor: '👤',
        service: '⚙️',
        datastore: '🗄️',
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
        >
            <Handle type="source" position={Position.Top} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <Handle type="target" position={Position.Right} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <Handle type="target" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <Handle type="source" position={Position.Left} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-teal-500" isConnectable={false}/>
            <div className="text-2xl">{iconMap[data.type] || '📦'}</div>
            <div className="flex-grow text-center">
                <span>{data.label}</span>
            </div>
        </div>
    );
};

const dslToFlowElements = (dsl: DslInput) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    dsl.components.forEach((component) => {
        const parentBoundary = dsl.trust_boundaries?.find(b => b.components.includes(component.id));
        nodes.push({
            id: component.id,
            data: { label: component.name, type: component.type },
            position: { x: 0, y: 0 },
            parentNode: parentBoundary?.id,
            extent: parentBoundary ? 'parent' : undefined,
            type: 'custom',
            selectable: true,
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
                selectable: false,
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
            selectable: false,
        });
    });

    return { nodes, edges };
};

type InteractiveDiagramProps = {
  dsl: string;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
};

function DiagramLayout({ dsl, onNodeSelect }: InteractiveDiagramProps) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [dslError, setDslError] = useState<string | null>(null);
    const { fitView } = useReactFlow();
  
    const nodeTypes: NodeTypes = useMemo(() => ({
      custom: CustomNode,
    }), []);
  
    useEffect(() => {
        let isMounted = true;
        const layout = async () => {
            try {
                const parsedDsl = parseDsl(dsl);
                const { nodes: initialNodes, edges: initialEdges } = dslToFlowElements(parsedDsl);
                
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
    }, [dsl, fitView]);
  
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
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="react-flow-node-selector"
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
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
