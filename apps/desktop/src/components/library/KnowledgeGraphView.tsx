import { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface GraphNode {
    id: string;
    name: string;
    group: string;
    val?: number;
    color?: string;
}

interface GraphLink {
    source: string;
    target: string;
    value: number;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export function KnowledgeGraphView() {
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadGraph = async () => {
            try {
                const data = await TauriClient.generateKnowledgeGraph();
                
                // Process nodes to add visual properties
                const processedNodes = data.nodes.map(node => {
                    let color = '#ffffff';
                    let val = 5;
                    switch (node.group) {
                        case 'Lecture':
                            color = '#3b82f6'; // blue
                            val = 8;
                            break;
                        case 'Folder':
                            color = '#10b981'; // green
                            val = 12;
                            break;
                        case 'Subject':
                            color = '#8b5cf6'; // purple
                            val = 10;
                            break;
                        case 'Tag':
                            color = '#f59e0b'; // amber
                            val = 4;
                            break;
                    }
                    return { ...node, color, val };
                });

                setGraphData({ nodes: processedNodes, links: data.links });
            } catch (e) {
                console.error("Failed to load graph:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadGraph();
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const handleNodeClick = (node: any) => {
        if (node.group === 'Lecture') {
            navigate(`/viewer/${node.id}`);
        } else if (node.group === 'Folder') {
            window.location.search = `?folder=${node.id}`;
        } else {
            if (fgRef.current) {
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(8, 2000);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p>Generating Knowledge Graph...</p>
            </div>
        );
    }

    if (!graphData || graphData.nodes.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full min-h-[500px]">
                <p>No connections found yet. Add folders, tags, or subjects to your lectures!</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 w-full h-full relative min-h-[600px] overflow-hidden rounded-xl border border-border/50 bg-[#0a0a0a]">
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="name"
                nodeColor={node => (node as GraphNode).color || '#ffffff'}
                nodeVal={node => (node as GraphNode).val || 5}
                linkColor={() => '#ffffff33'}
                linkWidth={link => (link as GraphLink).value}
                onNodeClick={handleNodeClick}
                backgroundColor="#0a0a0a"
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12/globalScale;
                    ctx.font = `${fontSize}px Inter, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color;
                    ctx.fill();

                    if (globalScale > 1.5 || node.val > 6) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + node.val + 2 - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                        
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(label, node.x, node.y + node.val + 2);
                    }
                }}
            />
            
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md p-3 rounded-lg border border-border/50 text-xs shadow-xl pointer-events-none">
                <h3 className="font-semibold mb-2 text-foreground">Legend</h3>
                <div className="flex flex-col gap-1.5 text-muted-foreground">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Collections</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Lectures</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div> Subjects</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div> Tags</div>
                </div>
            </div>
        </div>
    );
}
