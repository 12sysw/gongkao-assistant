import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, FolderOpen } from 'lucide-react';

/* ─── Types ─── */

interface MindMapNode {
  id: string;
  topic: string;
  children?: MindMapNode[];
}

interface MindMapItem {
  id: number;
  title: string;
  subject: string;
  data: string;
  created_at: string;
  updated_at: string;
}

interface LayoutNode {
  node: MindMapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  children: LayoutNode[];
}

interface LayoutPoint {
  node: MindMapNode;
  x: number;
  y: number;
  level: number;
}

interface LayoutEdge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  level: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/* ─── Constants ─── */

const NODE_WIDTH = 140;
const NODE_HEIGHT = 40;
const H_GAP = 60;
const V_GAP = 16;
const LEVEL_COLORS = [
  '#c2410c', '#862b08', '#166534', '#ca8a04', '#dc2626', '#0891b2',
];

let idCounter = 0;
function genId(): string {
  return `node_${Date.now()}_${++idCounter}`;
}

function createNode(topic: string = '新节点'): MindMapNode {
  return { id: genId(), topic, children: [] };
}

function getApi() {
  return (window as unknown as Window & { api?: Record<string, any> }).api;
}

const MIND_MAP_STORAGE_KEY = 'gongkao_assistant_mind_maps_local';

function readLocalMindMaps(): MindMapItem[] {
  try {
    const raw = localStorage.getItem(MIND_MAP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('读取本地思维导图失败', error);
    return [];
  }
}

function writeLocalMindMaps(maps: MindMapItem[]) {
  localStorage.setItem(MIND_MAP_STORAGE_KEY, JSON.stringify(maps));
}

function saveLocalMindMap(item: Omit<MindMapItem, 'id' | 'created_at' | 'updated_at'> & { id?: number | null }): MindMapItem {
  const now = new Date().toISOString();
  const maps = readLocalMindMaps();
  const existing = typeof item.id === 'number' ? maps.find((map) => map.id === item.id) : null;
  const id = existing?.id ?? (item.id && item.id < 0 ? item.id : -Date.now());
  const nextItem: MindMapItem = {
    id,
    title: item.title,
    subject: item.subject,
    data: item.data,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  const nextMaps = maps.filter((map) => map.id !== id);
  nextMaps.unshift(nextItem);
  writeLocalMindMaps(nextMaps);
  return nextItem;
}

function removeLocalMindMap(id: number) {
  writeLocalMindMaps(readLocalMindMaps().filter((map) => map.id !== id));
}

function mergeMindMapItems(remoteMaps: MindMapItem[], localMaps: MindMapItem[]) {
  const merged = new Map<number, MindMapItem>();
  for (const item of remoteMaps) merged.set(item.id, item);
  for (const item of localMaps) merged.set(item.id, item);
  return [...merged.values()].sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')));
}

/* ─── Tree layout algorithms ─── */

function calcSubtreeSize(node: MindMapNode): { width: number; height: number } {
  if (!node.children || node.children.length === 0) {
    return { width: NODE_WIDTH, height: NODE_HEIGHT };
  }
  let totalHeight = 0;
  let maxWidth = 0;
  for (const child of node.children) {
    const size = calcSubtreeSize(child);
    totalHeight += size.height;
    maxWidth = Math.max(maxWidth, size.width);
  }
  totalHeight += (node.children.length - 1) * V_GAP;
  return {
    width: NODE_WIDTH + H_GAP + maxWidth,
    height: Math.max(NODE_HEIGHT, totalHeight),
  };
}

function layoutTree(node: MindMapNode, x: number, y: number, level: number): LayoutNode {
  const size = calcSubtreeSize(node);
  const layoutChildren: LayoutNode[] = [];

  if (node.children && node.children.length > 0) {
    let childY = y;
    const childX = x + NODE_WIDTH + H_GAP;
    for (const child of node.children) {
      const childSize = calcSubtreeSize(child);
      const childLayout = layoutTree(child, childX, childY, level + 1);
      layoutChildren.push(childLayout);
      childY += childSize.height + V_GAP;
    }
  }

  const nodeY =
    layoutChildren.length > 0
      ? (layoutChildren[0].y + layoutChildren[layoutChildren.length - 1].y) / 2
      : y + size.height / 2 - NODE_HEIGHT / 2;

  return {
    node,
    x,
    y: nodeY,
    width: size.width,
    height: size.height,
    level,
    children: layoutChildren,
  };
}

function collectLayout(layout: LayoutNode): LayoutPoint[] {
  const result: LayoutPoint[] = [{ node: layout.node, x: layout.x, y: layout.y, level: layout.level }];
  for (const child of layout.children) {
    result.push(...collectLayout(child));
  }
  return result;
}

function collectEdges(layout: LayoutNode): LayoutEdge[] {
  const edges: LayoutEdge[] = [];
  const fromX = layout.x + NODE_WIDTH;
  const fromY = layout.y + NODE_HEIGHT / 2;
  for (const child of layout.children) {
    edges.push({
      from: { x: fromX, y: fromY },
      to: { x: child.x, y: child.y + NODE_HEIGHT / 2 },
      level: child.level,
    });
    edges.push(...collectEdges(child));
  }
  return edges;
}

/* ─── Tree mutation helpers ─── */

function findAndAddChild(root: MindMapNode, parentId: string): MindMapNode {
  if (root.id === parentId) {
    return { ...root, children: [...(root.children || []), createNode()] };
  }
  if (root.children) {
    return { ...root, children: root.children.map((c) => findAndAddChild(c, parentId)) };
  }
  return root;
}

function findAndUpdateTopic(root: MindMapNode, nodeId: string, topic: string): MindMapNode {
  if (root.id === nodeId) {
    return { ...root, topic };
  }
  if (root.children) {
    return { ...root, children: root.children.map((c) => findAndUpdateTopic(c, nodeId, topic)) };
  }
  return root;
}

function findAndDelete(root: MindMapNode, nodeId: string): MindMapNode {
  if (root.children) {
    const newChildren = root.children
      .filter((c) => c.id !== nodeId)
      .map((c) => findAndDelete(c, nodeId));
    return { ...root, children: newChildren };
  }
  return root;
}

/* ─── Sub-components ─── */

const MapList: React.FC<{
  maps: MindMapItem[];
  currentMapId: number | null;
  onLoad: (map: MindMapItem) => void;
  onDelete: (id: number) => void;
}> = ({ maps, currentMapId, onLoad, onDelete }) => (
  <div className="w-56 shrink-0 space-y-2">
    <h3 className="text-sm font-medium text-surface-500 mb-2">我的导图</h3>
    {maps.length === 0 ? (
      <p className="text-xs text-surface-400 py-4 text-center">暂无导图</p>
    ) : (
      maps.map((map) => (
        <div
          key={map.id}
          onClick={() => onLoad(map)}
          className={`p-3 rounded-lg cursor-pointer border transition-colors ${
            currentMapId === map.id
              ? 'border-brand-300 bg-brand-50'
              : 'border-surface-200 bg-white hover:border-surface-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-surface-700 truncate flex-1">{map.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(map.id);
              }}
              className="text-surface-400 hover:text-danger ml-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center mt-1 text-xs text-surface-400">
            <span className="px-1.5 py-0.5 bg-surface-100 text-surface-500 rounded">{map.subject}</span>
          </div>
        </div>
      ))
    )}
  </div>
);

const Toolbar: React.FC<{
  title: string;
  subject: string;
  selectedNode: string | null;
  isRootSelected: boolean;
  onTitleChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onAddChild: () => void;
  onDeleteNode: () => void;
}> = ({
  title,
  subject,
  selectedNode,
  isRootSelected,
  onTitleChange,
  onSubjectChange,
  onAddChild,
  onDeleteNode,
}) => (
  <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-100 bg-surface-0">
    <input
      value={title}
      onChange={(e) => onTitleChange(e.target.value)}
      className="text-sm font-medium text-surface-900 bg-transparent border-none focus:outline-none focus:border-b focus:border-brand-500 px-1"
    />
    <select
      value={subject}
      onChange={(e) => onSubjectChange(e.target.value)}
      className="text-xs px-2 py-1 border border-surface-200 rounded-lg bg-white"
    >
      <option value="行测">行测</option>
      <option value="申论">申论</option>
      <option value="面试">面试</option>
      <option value="综合">综合</option>
    </select>
    <div className="ml-auto flex items-center gap-2">
      <button
        onClick={onAddChild}
        disabled={!selectedNode}
        className="text-xs px-2 py-1 bg-brand-100 text-brand-600 rounded-lg hover:bg-brand-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + 子节点
      </button>
      <button
        onClick={onDeleteNode}
        disabled={!selectedNode || isRootSelected}
        className="text-xs px-2 py-1 bg-danger-light text-danger-dark rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        删除
      </button>
    </div>
  </div>
);

const EmptyCanvas: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-24 text-surface-400">
    <FolderOpen className="w-16 h-16 mb-3 text-surface-300" />
    <p className="text-lg">选择或新建一个思维导图</p>
    <p className="text-sm mt-1">点击"新建"开始构建知识体系</p>
  </div>
);

const MindMapCanvas: React.FC<{
  root: MindMapNode;
  selectedNode: string | null;
  editingNode: string | null;
  editText: string;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string, topic: string) => void;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
}> = ({
  root,
  selectedNode,
  editingNode,
  editText,
  onNodeClick,
  onNodeDoubleClick,
  onEditChange,
  onEditCommit,
}) => {
  const layout = useMemo(() => layoutTree(root, 40, 40, 0), [root]);
  const allNodes = useMemo(() => collectLayout(layout), [layout]);
  const allEdges = useMemo(() => collectEdges(layout), [layout]);

  const svgWidth = Math.max(800, layout.width + 80);
  const svgHeight = Math.max(500, layout.height + 80);

  return (
    <div className="overflow-auto p-4" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      <svg width={svgWidth} height={svgHeight} className="min-w-full">
        {/* Edges */}
        {allEdges.map((edge, i) => (
          <path
            key={`edge-${i}`}
            d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x + H_GAP / 2} ${edge.from.y}, ${
              edge.to.x - H_GAP / 2
            } ${edge.to.y}, ${edge.to.x} ${edge.to.y}`}
            fill="none"
            stroke={LEVEL_COLORS[edge.level % LEVEL_COLORS.length]}
            strokeWidth="2"
            opacity="0.4"
          />
        ))}
        {/* Nodes */}
        {allNodes.map(({ node, x, y, level }) => (
          <g
            key={node.id}
            onClick={() => onNodeClick(node.id)}
            onDoubleClick={() => onNodeDoubleClick(node.id, node.topic)}
            className="cursor-pointer"
          >
            <rect
              x={x}
              y={y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={8}
              fill={selectedNode === node.id ? '#f9ebd8' : '#ffffff'}
              stroke={LEVEL_COLORS[level % LEVEL_COLORS.length]}
              strokeWidth={selectedNode === node.id ? 2.5 : 1.5}
              className="mind-node"
            />
            {editingNode === node.id ? (
              <foreignObject x={x + 4} y={y + 4} width={NODE_WIDTH - 8} height={NODE_HEIGHT - 8}>
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => onEditChange(e.target.value)}
                  onBlur={onEditCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onEditCommit();
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    textAlign: 'center',
                    background: 'transparent',
                  }}
                />
              </foreignObject>
            ) : (
              <text
                x={x + NODE_WIDTH / 2}
                y={y + NODE_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fill="#1c1917"                className="pointer-events-none select-none"
              >
                {node.topic.length > 10 ? node.topic.slice(0, 10) + '...' : node.topic}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

const SaveButton: React.FC<{
  disabled: boolean;
  status: SaveStatus;
  onSave: () => void;
}> = ({ disabled, status, onSave }) => {
  const statusClass =
    status === 'saved'
      ? 'bg-success text-white'
      : status === 'error'
      ? 'bg-danger text-white'
      : status === 'saving'
      ? 'bg-surface-400 text-white'
      : 'bg-brand-500 text-white hover:bg-brand-600';

  const label =
    status === 'saving' ? '保存中...' : status === 'saved' ? '已保存 ✓' : status === 'error' ? '保存失败' : '保存';

  return (
    <button
      onClick={onSave}
      disabled={disabled || status === 'saving'}
      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${statusClass} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Save className="w-4 h-4 mr-1" />
      {label}
    </button>
  );
};

/* ─── Main Page ─── */

const MindMap: React.FC = () => {
  const [maps, setMaps] = useState<MindMapItem[]>([]);
  const [currentMap, setCurrentMap] = useState<MindMapNode | null>(null);
  const [currentMapId, setCurrentMapId] = useState<number | null>(null);
  const [mapTitle, setMapTitle] = useState('新建思维导图');
  const [mapSubject, setMapSubject] = useState('行测');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const loadMaps = useCallback(async () => {
    const localMaps = readLocalMindMaps();
    try {
      const api = getApi();
      if (!api?.mindMap?.getAll) {
        setMaps(localMaps);
        return;
      }
      const data = (await api.mindMap.getAll()) as MindMapItem[];
      setMaps(mergeMindMapItems(data || [], localMaps));
    } catch (e) {
      console.error('加载导图列表失败', e);
      setMaps(localMaps);
    }
  }, []);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  const handleNew = useCallback(() => {
    const root = createNode('中心主题');
    setCurrentMap(root);
    setCurrentMapId(null);
    setMapTitle('新建思维导图');
    setMapSubject('行测');
    setSelectedNode(null);
  }, []);

  const handleLoad = useCallback(async (map: MindMapItem) => {
    if (map.id < 0) {
      setCurrentMap(JSON.parse(map.data) as MindMapNode);
      setCurrentMapId(map.id);
      setMapTitle(map.title);
      setMapSubject(map.subject);
      setSelectedNode(null);
      return;
    }

    try {
      const api = getApi();
      if (!api?.mindMap?.getById) {
        setCurrentMap(JSON.parse(map.data) as MindMapNode);
        setCurrentMapId(map.id);
        setMapTitle(map.title);
        setMapSubject(map.subject);
        setSelectedNode(null);
        return;
      }
      const full = (await api.mindMap.getById(map.id)) as MindMapItem | null;
      if (full) {
        setCurrentMap(JSON.parse(full.data) as MindMapNode);
        setCurrentMapId(full.id);
        setMapTitle(full.title);
        setMapSubject(full.subject);
        setSelectedNode(null);
      }
    } catch (e) {
      console.error('加载导图失败', e);
      setCurrentMap(JSON.parse(map.data) as MindMapNode);
      setCurrentMapId(map.id);
      setMapTitle(map.title);
      setMapSubject(map.subject);
      setSelectedNode(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentMap) return;
    setSaveStatus('saving');
    const payload = {
      id: currentMapId || undefined,
      title: mapTitle,
      subject: mapSubject,
      data: JSON.stringify(currentMap),
    };
    try {
      const api = getApi();
      if (!api?.mindMap?.save) {
        const saved = saveLocalMindMap(payload);
        setCurrentMapId(saved.id);
        setSaveStatus('saved');
        loadMaps();
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }
      const result = (await api.mindMap.save(payload)) as { id?: number } | null;
      if (result?.id && !currentMapId) {
        setCurrentMapId(result.id);
      }
      loadMaps();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('保存导图失败，改用本地存储', e);
      try {
        const saved = saveLocalMindMap(payload);
        setCurrentMapId(saved.id);
        loadMaps();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (fallbackError) {
        console.error('本地保存导图也失败', fallbackError);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }
  }, [currentMap, currentMapId, mapTitle, mapSubject, loadMaps]);

  const handleDeleteMap = useCallback(
    async (id: number) => {
      if (!confirm('确定要删除这个思维导图吗？')) return;
      try {
        const api = getApi();
        if (api?.mindMap?.delete && id >= 0) {
          await api.mindMap.delete(id);
        }
        removeLocalMindMap(id);
        if (currentMapId === id) {
          setCurrentMap(null);
          setCurrentMapId(null);
        }
        loadMaps();
      } catch (e) {
        console.error('删除导图失败', e);
        removeLocalMindMap(id);
        if (currentMapId === id) {
          setCurrentMap(null);
          setCurrentMapId(null);
        }
        loadMaps();
      }
    },
    [currentMapId, loadMaps]
  );

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string, currentTopic: string) => {
    setEditingNode(nodeId);
    setEditText(currentTopic);
  }, []);

  const handleEditCommit = useCallback(() => {
    if (!currentMap || !editingNode) return;
    setCurrentMap(findAndUpdateTopic(currentMap, editingNode, editText));
    setEditingNode(null);
  }, [currentMap, editingNode, editText]);

  const handleAddChild = useCallback(() => {
    if (!currentMap || !selectedNode) return;
    setCurrentMap(findAndAddChild(currentMap, selectedNode));
  }, [currentMap, selectedNode]);

  const handleDeleteNode = useCallback(() => {
    if (!currentMap || !selectedNode || currentMap.id === selectedNode) return;
    setCurrentMap(findAndDelete(currentMap, selectedNode));
    setSelectedNode(null);
  }, [currentMap, selectedNode]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 font-display">思维导图</h1>
          <p className="text-sm text-surface-500 mt-1">构建知识体系，梳理考点脉络</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="flex items-center px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建
          </button>
          <SaveButton
            disabled={!currentMap}
            status={saveStatus}
            onSave={handleSave}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <MapList
          maps={maps}
          currentMapId={currentMapId}
          onLoad={handleLoad}
          onDelete={handleDeleteMap}
        />

        <div className="flex-1 bg-white rounded-xl border border-surface-200 overflow-hidden">
          {currentMap ? (
            <>
              <Toolbar
                title={mapTitle}
                subject={mapSubject}
                selectedNode={selectedNode}
                isRootSelected={currentMap.id === selectedNode}
                onTitleChange={setMapTitle}
                onSubjectChange={setMapSubject}
                onAddChild={handleAddChild}
                onDeleteNode={handleDeleteNode}
              />
              <MindMapCanvas
                root={currentMap}
                selectedNode={selectedNode}
                editingNode={editingNode}
                editText={editText}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onEditChange={setEditText}
                onEditCommit={handleEditCommit}
              />
            </>
          ) : (
            <EmptyCanvas />
          )}
        </div>
      </div>
    </div>
  );
};

export default MindMap;
