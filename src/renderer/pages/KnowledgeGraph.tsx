import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Network, RefreshCw, Trash2, Loader2, ZoomIn, ZoomOut, X, Search } from 'lucide-react';

const api = (window as any).api;

interface KgNode {
  id: number;
  name: string;
  category: string;
  description: string;
  questionCount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface KgEdge {
  id: number;
  source: number;
  target: number;
  relation: string;
  weight: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
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

const COLOR_CACHE = new Map<string, string>();
function getColor(category: string): string {
  const cached = COLOR_CACHE.get(category);
  if (cached) return cached;
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.includes(key) || key.includes(category)) {
      COLOR_CACHE.set(category, color);
      return color;
    }
  }
  COLOR_CACHE.set(category, CATEGORY_COLORS['common']);
  return CATEGORY_COLORS['common'];
}

function getRadius(questionCount: number): number {
  return Math.max(18, Math.min(44, 18 + Math.sqrt(questionCount) * 4));
}

const STABLE_THRESHOLD = 0.05;
const STABLE_FRAMES = 40;

const KnowledgeGraph: React.FC = () => {
  const [nodes, setNodes] = useState<KgNode[]>([]);
  const [edges, setEdges] = useState<KgEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KgNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<KgNode[]>([]);
  const edgesRef = useRef<KgEdge[]>([]);
  const sizeRef = useRef({ w: 800, h: 600 });
  const dragRef = useRef<{ nodeId: number | null; startX: number; startY: number }>({ nodeId: null, startX: 0, startY: 0 });
  const panDragRef = useRef<{ active: boolean; startX: number; startY: number; panX: number; panY: number }>({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const hoveredRef = useRef<number | null>(null);
  const selectedRef = useRef<number | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const stableRef = useRef(false);
  const stableCountRef = useRef(0);
  const searchRef = useRef('');
  const toastIdRef = useRef(0);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { selectedRef.current = selectedNode?.id ?? null; }, [selectedNode]);
  useEffect(() => { searchRef.current = searchQuery; draw(); }, [searchQuery]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const z = zoomRef.current;
    const p = panRef.current;
    return {
      x: (sx - sizeRef.current.w / 2 - p.x) / z + sizeRef.current.w / 2,
      y: (sy - sizeRef.current.h / 2 - p.y) / z + sizeRef.current.h / 2,
    };
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const fitView = useCallback(() => {
    const ns = nodesRef.current;
    if (ns.length === 0) return;
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of ns) {
      const r = getRadius(n.questionCount);
      minX = Math.min(minX, n.x - r);
      maxX = Math.max(maxX, n.x + r);
      minY = Math.min(minY, n.y - r);
      maxY = Math.max(maxY, n.y + r);
    }
    const gw = maxX - minX + 120;
    const gh = maxY - minY + 120;
    const z = Math.min(w / gw, h / gh, 1.5);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoom(z);
    setPan({ x: w / 2 - cx * z, y: h / 2 - cy * z });
  }, []);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.kg.getGraph();
      const count = (data.nodes || []).length;
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      const cx = w / 2, cy = h / 2;
      const angleStep = (2 * Math.PI) / Math.max(count, 1);
      const radius = Math.min(w, h) * 0.3;
      const loadedNodes: KgNode[] = (data.nodes || []).map((n: any, i: number) => ({
        ...n,
        x: cx + Math.cos(i * angleStep + Math.random() * 0.3) * (radius + Math.random() * 60),
        y: cy + Math.sin(i * angleStep + Math.random() * 0.3) * (radius + Math.random() * 60),
        vx: 0,
        vy: 0,
      }));
      setNodes(loadedNodes);
      setEdges(data.edges || []);
      nodesRef.current = loadedNodes;
      edgesRef.current = data.edges || [];
      stableRef.current = false;
      stableCountRef.current = 0;
    } catch (err) {
      console.error('[KG] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = (width: number, height: number) => {
      sizeRef.current = { w: width, h: height };
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        draw();
      }
    };

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      updateSize(rect.width, rect.height);
    }

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) updateSize(width, height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [nodes]);

  // Native wheel listener for proper preventDefault (React's is passive)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const oldZ = zoomRef.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZ = Math.max(0.3, Math.min(3, oldZ * factor));
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      const p = panRef.current;
      setPan({
        x: sx - w / 2 - ((sx - w / 2 - p.x) / oldZ) * newZ,
        y: sy - h / 2 - ((sy - h / 2 - p.y) / oldZ) * newZ,
      });
      setZoom(newZ);
      draw();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [nodes.length > 0]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSearchQuery('');
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3, z * 1.2));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(0.3, z * 0.8));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const result: any = await api.kg.build();
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast(`知识图谱构建完成：${result.nodes} 个节点，${result.edges} 条关系`);
        await loadGraph();
      }
    } catch {
      showToast('构建失败', 'error');
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
    showToast('已清空知识图谱');
  };

  // Physics simulation — stops when stable to save CPU
  useEffect(() => {
    if (nodes.length === 0) return;
    let running = true;
    stableRef.current = false;
    stableCountRef.current = 0;

    const tick = () => {
      if (!running) return;
      const ns = nodesRef.current;
      const es = edgesRef.current;
      if (ns.length === 0) return;

      const nodeMap = new Map(ns.map((n) => [n.id, n]));
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      const cx = w / 2, cy = h / 2;

      for (const n of ns) { n.vx *= 0.6; n.vy *= 0.6; }

      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          if (dx === 0 && dy === 0) { dx = (Math.random() - 0.5) * 2; dy = (Math.random() - 0.5) * 2; }
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          const force = 8000 / (distSq + 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      for (const e of es) {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 160;
        const force = (dist - idealDist) * 0.008;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      for (const n of ns) {
        n.vx += (cx - n.x) * 0.0003;
        n.vy += (cy - n.y) * 0.0003;
      }

      let totalKE = 0;
      for (const n of ns) {
        if (dragRef.current.nodeId === n.id) continue;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(w - 30, n.x));
        n.y = Math.max(30, Math.min(h - 30, n.y));
        totalKE += n.vx * n.vx + n.vy * n.vy;
      }

      draw();

      if (totalKE < STABLE_THRESHOLD) {
        stableCountRef.current++;
        if (stableCountRef.current > STABLE_FRAMES) {
          stableRef.current = true;
          return;
        }
      } else {
        stableCountRef.current = 0;
        stableRef.current = false;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [nodes, edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    const z = zoomRef.current;
    const p = panRef.current;
    const ns = nodesRef.current;
    const es = edgesRef.current;
    const nodeMap = new Map(ns.map((n) => [n.id, n]));
    const selId = selectedRef.current;
    const hovId = hoveredRef.current;
    const search = searchRef.current;

    const connectedIds = new Set<number>();
    if (selId !== null) {
      for (const e of es) {
        if (e.source === selId) connectedIds.add(e.target);
        if (e.target === selId) connectedIds.add(e.source);
      }
    }

    const matchedIds = new Set<number>();
    if (search) {
      const q = search.toLowerCase();
      for (const n of ns) {
        if (n.name.toLowerCase().includes(q) || n.category.toLowerCase().includes(q)) {
          matchedIds.add(n.id);
        }
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (w / 2 + p.x) - dpr * z * w / 2, dpr * (h / 2 + p.y) - dpr * z * h / 2);

    // Edges
    ctx.lineCap = 'round';
    for (const e of es) {
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (!a || !b) continue;

      const isHighlighted = selId !== null && (selId === a.id || selId === b.id);
      const dimmed = selId !== null && !isHighlighted;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isHighlighted ? '#c2410c' : '#d1d5db';
      ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
      ctx.globalAlpha = dimmed ? 0.15 : isHighlighted ? 1 : 0.5;
      ctx.stroke();

      // Arrowhead
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const rB = getRadius(b.questionCount);
        const nx = dx / dist, ny = dy / dist;
        const tipX = b.x - nx * (rB + 2);
        const tipY = b.y - ny * (rB + 2);
        const arrLen = isHighlighted ? 10 : 7;
        const arrW = arrLen * 0.45;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - nx * arrLen + ny * arrW, tipY - ny * arrLen - nx * arrW);
        ctx.lineTo(tipX - nx * arrLen - ny * arrW, tipY - ny * arrLen + nx * arrW);
        ctx.closePath();
        ctx.fillStyle = isHighlighted ? '#c2410c' : '#d1d5db';
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Relation label
      if (z > 0.7) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = isHighlighted ? '#c2410c' : '#9ca3af';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = dimmed ? 0.2 : 0.8;
        ctx.fillText(e.relation, mx, my - 8);
        ctx.globalAlpha = 1;
      }
    }

    // Nodes
    for (const n of ns) {
      const r = getRadius(n.questionCount);
      const color = getColor(n.category);
      const isSelected = selId === n.id;
      const isHovered = hovId === n.id;
      const isConnected = connectedIds.has(n.id);
      const isMatched = matchedIds.has(n.id);
      const dimmed = selId !== null && !isSelected && !isConnected;

      ctx.globalAlpha = dimmed ? 0.25 : 1;

      // Search ring
      if (search && isMatched && !isSelected) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.globalAlpha = dimmed ? 0.25 : 1;
      }

      // Glow
      if (isSelected || isHovered) {
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 16 : 10;
      }

      // Circle with subtle gradient
      const grad = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r);
      grad.addColorStop(0, color + 'ee');
      grad.addColorStop(1, color);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }

      // Label with background
      if (z > 0.5) {
        const fontSize = Math.round(12 / Math.max(z, 0.8));
        ctx.font = `${isSelected ? 'bold ' : ''}${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = n.name.length > 10 ? n.name.slice(0, 9) + '…' : n.name;
        const labelY = n.y + r + 5;
        const metrics = ctx.measureText(label);
        const lw = metrics.width + 6;
        const lh = fontSize + 4;

        ctx.globalAlpha = dimmed ? 0.15 : 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const lx = n.x - lw / 2, ly = labelY - 1, br = 3;
        ctx.moveTo(lx + br, ly);
        ctx.lineTo(lx + lw - br, ly);
        ctx.quadraticCurveTo(lx + lw, ly, lx + lw, ly + br);
        ctx.lineTo(lx + lw, ly + lh - br);
        ctx.quadraticCurveTo(lx + lw, ly + lh, lx + lw - br, ly + lh);
        ctx.lineTo(lx + br, ly + lh);
        ctx.quadraticCurveTo(lx, ly + lh, lx, ly + lh - br);
        ctx.lineTo(lx, ly + br);
        ctx.quadraticCurveTo(lx, ly, lx + br, ly);
        ctx.fill();

        ctx.globalAlpha = dimmed ? 0.25 : 1;
        ctx.fillStyle = '#1f2937';
        ctx.fillText(label, n.x, labelY);
      }

      ctx.globalAlpha = 1;
    }
  }, []);

  const getNodeAt = useCallback((wx: number, wy: number): KgNode | null => {
    const ns = nodesRef.current;
    for (let i = ns.length - 1; i >= 0; i--) {
      const n = ns[i];
      const r = getRadius(n.questionCount);
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return n;
    }
    return null;
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const node = getNodeAt(wx, wy);

    if (node) {
      dragRef.current = { nodeId: node.id, startX: wx - node.x, startY: wy - node.y };
      setSelectedNode(node);
    } else {
      panDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current.nodeId !== null) {
      const { x: wx, y: wy } = screenToWorld(sx, sy);
      const node = nodesRef.current.find((n) => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = wx - dragRef.current.startX;
        node.y = wy - dragRef.current.startY;
        node.vx = 0;
        node.vy = 0;
        stableRef.current = false;
        stableCountRef.current = 0;
      }
      draw();
    } else if (panDragRef.current.active) {
      const dx = e.clientX - panDragRef.current.startX;
      const dy = e.clientY - panDragRef.current.startY;
      setPan({ x: panDragRef.current.panX + dx, y: panDragRef.current.panY + dy });
      draw();
    } else {
      const { x: wx, y: wy } = screenToWorld(sx, sy);
      const node = getNodeAt(wx, wy);
      const newId = node?.id ?? null;
      if (newId !== hoveredRef.current) {
        hoveredRef.current = newId;
        draw();
      }
    }
  };

  const handleMouseUp = () => {
    dragRef.current = { nodeId: null, startX: 0, startY: 0 };
    panDragRef.current = { ...panDragRef.current, active: false };
  };

  const categories = [...new Set(nodes.map((n) => n.category))];

  return (
    <div className="flex flex-col h-full bg-surface-0 dark:bg-surface-900">
      <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-surface-200 dark:border-surface-700">
        <h1 className="text-base font-bold text-surface-900 dark:text-surface-0 font-display flex items-center gap-2">
          <Network className="w-5 h-5 text-brand-500" />
          知识图谱
          {nodes.length > 0 && <span className="text-xs font-normal text-surface-400 ml-2">{nodes.length} 个知识点 · {edges.length} 条关系</span>}
        </h1>
        <div className="flex items-center gap-2">
          {nodes.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索知识点..."
                  className="w-36 pl-7 pr-2 py-1 text-xs border border-surface-200 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-0 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 focus:border-brand-300"
                />
              </div>
              <button onClick={fitView} className="px-2 py-1 text-xs text-surface-400 dark:text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded hover:bg-surface-100 dark:hover:bg-surface-800" title="适应视图">
                适应
              </button>
              <button onClick={() => setZoom((z) => Math.min(3, z * 1.2))} className="p-1.5 text-surface-400 dark:text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded hover:bg-surface-100 dark:hover:bg-surface-800" title="放大 (+)">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))} className="p-1.5 text-surface-400 dark:text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded hover:bg-surface-100 dark:hover:bg-surface-800" title="缩小 (-)">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-2 py-1 text-xs text-surface-400 dark:text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 rounded hover:bg-surface-100 dark:hover:bg-surface-800">
                重置
              </button>
            </>
          )}
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative" ref={containerRef}>
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
              className="absolute inset-0"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          )}

          {/* Hover tooltip */}
          {hoveredRef.current !== null && (() => {
            const n = nodesRef.current.find((nd) => nd.id === hoveredRef.current);
            if (!n || selectedNode?.id === n.id) return null;
            return (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-surface-800/95 backdrop-blur-sm rounded-lg border border-surface-200 dark:border-surface-700 shadow-card px-4 py-2.5 text-xs pointer-events-none z-10 max-w-xs">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColor(n.category) }} />
                  <span className="font-semibold text-surface-800 dark:text-surface-400">{n.name}</span>
                  <span className="text-surface-400 dark:text-surface-400">{n.category}</span>
                </div>
                {n.description && <p className="text-surface-500 dark:text-surface-400 leading-relaxed">{n.description}</p>}
                <p className="text-surface-400 dark:text-surface-400 mt-1">关联 {n.questionCount} 道题目</p>
              </div>
            );
          })()}

          {/* Legend */}
          {nodes.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-surface-800/90 backdrop-blur rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-xs space-y-1.5 pointer-events-none">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(cat) }} />
                  <span className="text-surface-600 dark:text-surface-400">{cat}</span>
                  <span className="text-surface-300 dark:text-surface-600 ml-auto">{nodes.filter((n) => n.category === cat).length}</span>
                </div>
              ))}
              <div className="pt-1.5 border-t border-surface-100 dark:border-surface-700 text-surface-400 dark:text-surface-400">
                滚轮缩放 · 拖拽平移 · Esc 取消
              </div>
            </div>
          )}

          {/* Toasts */}
          <div className="absolute top-4 right-4 space-y-2 z-20 pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`px-4 py-2.5 rounded-lg shadow-card text-sm font-medium animate-[fadeIn_0.2s_ease-out] pointer-events-auto ${
                  t.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
                }`}
              >
                {t.message}
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div className="w-72 shrink-0 border-l border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 flex flex-col overflow-hidden">
            <div className="p-5 pb-4 border-b border-surface-100 dark:border-surface-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: getColor(selectedNode.category) }} />
                  <h3 className="text-sm font-bold text-surface-900 dark:text-surface-0 truncate">{selectedNode.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 text-surface-300 dark:text-surface-400 hover:text-surface-500 dark:hover:text-surface-300 rounded hover:bg-surface-50 dark:hover:bg-surface-700 shrink-0"
                  title="关闭 (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <div className="space-y-2.5 text-xs text-surface-600 dark:text-surface-400">
                <div className="flex justify-between items-center">
                  <span className="text-surface-400">分类</span>
                  <span className="font-medium px-2 py-0.5 rounded bg-surface-50 dark:bg-surface-700">{selectedNode.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-surface-400">关联题目</span>
                  <span className="font-medium">{selectedNode.questionCount} 道</span>
                </div>
                {selectedNode.description && (
                  <div className="pt-2.5 border-t border-surface-100 dark:border-surface-700">
                    <p className="text-surface-500 dark:text-surface-400 leading-relaxed">{selectedNode.description}</p>
                  </div>
                )}
                <div className="pt-2.5 border-t border-surface-100 dark:border-surface-700">
                  <p className="text-surface-400 font-medium mb-2">关联知识点</p>
                  <div className="space-y-1.5">
                    {edges
                      .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                      .map((e) => {
                        const otherId = e.source === selectedNode.id ? e.target : e.source;
                        const other = nodes.find((n) => n.id === otherId);
                        if (!other) return null;
                        return (
                          <button
                            key={e.id}
                            onClick={() => setSelectedNode(other)}
                            className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors text-left"
                          >
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColor(other.category) }} />
                            <span className="text-surface-700 dark:text-surface-400 flex-1 truncate">{other.name}</span>
                            <span className="text-surface-300 dark:text-surface-600 text-[10px]">{e.relation}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;
