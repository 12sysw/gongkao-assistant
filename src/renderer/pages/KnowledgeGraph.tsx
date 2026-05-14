import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Network, RefreshCw, Trash2, Loader2 } from 'lucide-react';

const api = (window as any).api;

interface KgNode {
  id: number;
  name: string;
  category: string;
  description: string;
  questionCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface KgEdge {
  id: number;
  source: number;
  target: number;
  relation: string;
  weight: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  '行测-言语理解': '#3b82f6',
  '行测-数量关系': '#ef4444',
  '行测-判断推理': '#8b5cf6',
  '行测-资料分析': '#f59e0b',
  '行测-常识判断': '#10b981',
  '申论': '#ec4899',
  'common': '#6b7280',
};

function getColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['common'];
}

function getRadius(questionCount: number): number {
  return Math.max(16, Math.min(40, 16 + questionCount * 2));
}

const KnowledgeGraph: React.FC = () => {
  const [nodes, setNodes] = useState<KgNode[]>([]);
  const [edges, setEdges] = useState<KgEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<KgNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<KgNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<KgNode[]>([]);
  const edgesRef = useRef<KgEdge[]>([]);
  const dragRef = useRef<{ nodeId: number | null; offsetX: number; offsetY: number }>({ nodeId: null, offsetX: 0, offsetY: 0 });

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.kg.getGraph();
      const loadedNodes = (data.nodes || []).map((n: KgNode, i: number) => ({
        ...n,
        x: 400 + Math.cos(i * 2.4) * (150 + Math.random() * 100),
        y: 300 + Math.sin(i * 2.4) * (150 + Math.random() * 100),
        vx: 0,
        vy: 0,
      }));
      setNodes(loadedNodes);
      setEdges(data.edges || []);
      nodesRef.current = loadedNodes;
      edgesRef.current = data.edges || [];
    } catch (err) {
      console.error('[KG] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const result: any = await api.kg.build();
      if (result.error) {
        alert(result.error);
      } else {
        alert(`知识图谱构建完成：${result.nodes} 个节点，${result.edges} 条关系`);
        await loadGraph();
      }
    } catch (err) {
      alert('构建失败');
    } finally {
      setBuilding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('确定清空知识图谱？')) return;
    await api.kg.clear();
    setNodes([]);
    setEdges([]);
    nodesRef.current = [];
    edgesRef.current = [];
    setSelectedNode(null);
  };

  // Force-directed layout simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      if (ns.length === 0) return;

      const nodeMap = new Map(ns.map((n) => [n.id, n]));

      // Repulsion between all nodes
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          const dx = b.x! - a.x!;
          const dy = b.y! - a.y!;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 3000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx! -= fx;
          a.vy! -= fy;
          b.vx! += fx;
          b.vy! += fy;
        }
      }

      // Attraction along edges
      for (const e of es) {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) continue;
        const dx = b.x! - a.x!;
        const dy = b.y! - a.y!;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist - 120) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx! += fx;
        a.vy! += fy;
        b.vx! -= fx;
        b.vy! -= fy;
      }

      // Center gravity
      for (const n of ns) {
        const cx = 400, cy = 300;
        n.vx! += (cx - n.x!) * 0.001;
        n.vy! += (cy - n.y!) * 0.001;
      }

      // Apply velocity with damping
      for (const n of ns) {
        if (dragRef.current.nodeId === n.id) continue;
        n.vx! *= 0.85;
        n.vy! *= 0.85;
        n.x! += n.vx!;
        n.y! += n.vy!;
        n.x = Math.max(50, Math.min(750, n.x!));
        n.y = Math.max(50, Math.min(550, n.y!));
      }

      draw();
      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ns = nodesRef.current;
    const es = edgesRef.current;
    const nodeMap = new Map(ns.map((n) => [n.id, n]));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    for (const e of es) {
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (!a || !b) continue;

      ctx.beginPath();
      ctx.moveTo(a.x!, a.y!);
      ctx.lineTo(b.x!, b.y!);
      ctx.strokeStyle = selectedNode && (selectedNode.id === a.id || selectedNode.id === b.id)
        ? '#c2410c'
        : '#e5e7eb';
      ctx.lineWidth = selectedNode && (selectedNode.id === a.id || selectedNode.id === b.id) ? 2 : 1;
      ctx.stroke();

      // Draw relation label at midpoint
      const mx = (a.x! + b.x!) / 2;
      const my = (a.y! + b.y!) / 2;
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.textAlign = 'center';
      ctx.fillText(e.relation, mx, my - 4);
    }

    // Draw nodes
    for (const n of ns) {
      const r = getRadius(n.questionCount);
      const color = getColor(n.category);
      const isSelected = selectedNode?.id === n.id;
      const isHovered = hoveredNode?.id === n.id;

      ctx.beginPath();
      ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? color : isHovered ? color + 'cc' : color + '99';
      ctx.fill();
      if (isSelected || isHovered) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Node label
      ctx.font = `${isSelected ? 'bold ' : ''}11px sans-serif`;
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.fillText(n.name.length > 8 ? n.name.slice(0, 7) + '…' : n.name, n.x!, n.y! + r + 14);
    }
  }, [selectedNode, hoveredNode]);

  // Mouse interaction
  const getNodeAt = (x: number, y: number): KgNode | null => {
    for (const n of nodesRef.current) {
      const r = getRadius(n.questionCount);
      const dx = x - n.x!;
      const dy = y - n.y!;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = getNodeAt(x, y);
    if (node) {
      dragRef.current = { nodeId: node.id, offsetX: x - node.x!, offsetY: y - node.y! };
      setSelectedNode(node);
    } else {
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragRef.current.nodeId !== null) {
      const node = nodesRef.current.find((n) => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = x - dragRef.current.offsetX;
        node.y = y - dragRef.current.offsetY;
        node.vx = 0;
        node.vy = 0;
      }
    } else {
      const node = getNodeAt(x, y);
      setHoveredNode(node);
    }
  };

  const handleMouseUp = () => {
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
  };

  const categories = [...new Set(nodes.map((n) => n.category))];

  return (
    <div className="flex flex-col h-full bg-surface-0">
      <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-surface-200">
        <h1 className="text-base font-bold text-surface-900 font-display flex items-center gap-2">
          <Network className="w-5 h-5 text-brand-500" />
          知识图谱
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBuild}
            disabled={building}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {building ? '构建中...' : '构建图谱'}
          </button>
          {nodes.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-200 text-surface-600 rounded-lg hover:bg-surface-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-surface-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              加载中...
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-surface-400">
              <Network className="w-16 h-16 mb-4 text-surface-300" />
              <p className="text-lg font-medium">暂无知识图谱</p>
              <p className="text-sm mt-2">点击「构建图谱」从题库自动提取知识点关系</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: dragRef.current.nodeId ? 'grabbing' : hoveredNode ? 'pointer' : 'default' }}
            />
          )}

          {/* Legend */}
          {nodes.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg border border-surface-200 p-3 text-xs space-y-1.5">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(cat) }} />
                  <span className="text-surface-600">{cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div className="w-64 shrink-0 border-l border-surface-200 bg-white p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getColor(selectedNode.category) }} />
              <h3 className="text-sm font-bold text-surface-900">{selectedNode.name}</h3>
            </div>
            <div className="space-y-2 text-xs text-surface-600">
              <div className="flex justify-between">
                <span>分类</span>
                <span className="font-medium">{selectedNode.category}</span>
              </div>
              <div className="flex justify-between">
                <span>关联题目</span>
                <span className="font-medium">{selectedNode.questionCount} 道</span>
              </div>
              {selectedNode.description && (
                <div className="pt-2 border-t border-surface-100">
                  <p className="text-surface-500">{selectedNode.description}</p>
                </div>
              )}
              <div className="pt-2 border-t border-surface-100">
                <p className="text-surface-400 font-medium mb-1">关联知识点：</p>
                {edges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e) => {
                    const otherId = e.source === selectedNode.id ? e.target : e.source;
                    const other = nodes.find((n) => n.id === otherId);
                    return other ? (
                      <div key={e.id} className="flex items-center gap-1.5 py-0.5">
                        <span className="text-surface-500">→</span>
                        <span className="text-surface-700">{other.name}</span>
                        <span className="text-surface-400">({e.relation})</span>
                      </div>
                    ) : null;
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;
