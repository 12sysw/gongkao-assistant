import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Save, FolderOpen } from 'lucide-react';

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

// 思维导图渲染参数
const NODE_WIDTH = 140;
const NODE_HEIGHT = 40;
const H_GAP = 60;
const V_GAP = 16;
const LEVEL_COLORS = [
  '#2563eb', // 蓝
  '#7c3aed', // 紫
  '#059669', // 绿
  '#d97706', // 橙
  '#dc2626', // 红
  '#0891b2', // 青
];

let idCounter = 0;
function genId(): string {
  return `node_${Date.now()}_${++idCounter}`;
}

function createNode(topic: string = '新节点'): MindMapNode {
  return { id: genId(), topic, children: [] };
}

// 布局算法：计算每个节点子树的高度，递归布局
interface LayoutNode {
  node: MindMapNode;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  children: LayoutNode[];
}

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

  // 垂直居中
  const nodeY = layoutChildren.length > 0
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

function collectLayout(layout: LayoutNode): { node: MindMapNode; x: number; y: number; level: number }[] {
  const result: { node: MindMapNode; x: number; y: number; level: number }[] = [];
  result.push({ node: layout.node, x: layout.x, y: layout.y, level: layout.level });
  for (const child of layout.children) {
    result.push(...collectLayout(child));
  }
  return result;
}

function collectEdges(layout: LayoutNode): { from: { x: number; y: number }; to: { x: number; y: number }; level: number }[] {
  const edges: { from: { x: number; y: number }; to: { x: number; y: number }; level: number }[] = [];
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

// 查找并修改节点
function findAndAddChild(root: MindMapNode, parentId: string): MindMapNode {
  if (root.id === parentId) {
    return { ...root, children: [...(root.children || []), createNode()] };
  }
  if (root.children) {
    return { ...root, children: root.children.map(c => findAndAddChild(c, parentId)) };
  }
  return root;
}

function findAndUpdateTopic(root: MindMapNode, nodeId: string, topic: string): MindMapNode {
  if (root.id === nodeId) {
    return { ...root, topic };
  }
  if (root.children) {
    return { ...root, children: root.children.map(c => findAndUpdateTopic(c, nodeId, topic)) };
  }
  return root;
}

function findAndDelete(root: MindMapNode, nodeId: string): MindMapNode {
  if (root.children) {
    const newChildren = root.children
      .filter(c => c.id !== nodeId)
      .map(c => findAndDelete(c, nodeId));
    return { ...root, children: newChildren };
  }
  return root;
}

const MindMap: React.FC = () => {
  const [maps, setMaps] = useState<MindMapItem[]>([]);
  const [currentMap, setCurrentMap] = useState<MindMapNode | null>(null);
  const [currentMapId, setCurrentMapId] = useState<number | null>(null);
  const [mapTitle, setMapTitle] = useState('新建思维导图');
  const [mapSubject, setMapSubject] = useState('行测');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadMaps();
  }, []);

  async function loadMaps() {
    try {
      const api = (window as any).api;
      if (!api) return;
      const data = await api.mindMap.getAll();
      setMaps(data || []);
    } catch (e) {
      console.error('加载导图列表失败', e);
    }
  }

  function handleNew() {
    const root = createNode('中心主题');
    setCurrentMap(root);
    setCurrentMapId(null);
    setMapTitle('新建思维导图');
    setMapSubject('行测');
    setSelectedNode(null);
  }

  async function handleLoad(map: MindMapItem) {
    try {
      const api = (window as any).api;
      if (!api) return;
      const full = await api.mindMap.getById(map.id);
      if (full) {
        setCurrentMap(JSON.parse(full.data));
        setCurrentMapId(full.id);
        setMapTitle(full.title);
        setMapSubject(full.subject);
        setSelectedNode(null);
      }
    } catch (e) {
      console.error('加载导图失败', e);
    }
  }

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSave() {
    if (!currentMap) return;
    setSaveStatus('saving');
    try {
      const api = (window as any).api;
      if (!api) {
        setSaveStatus('error');
        return;
      }
      const result = await api.mindMap.save({
        id: currentMapId || undefined,
        title: mapTitle,
        subject: mapSubject,
        data: JSON.stringify(currentMap),
      });
      // 保存后更新 currentMapId，确保后续保存走 UPDATE
      if (result && result.id && !currentMapId) {
        setCurrentMapId(result.id);
      }
      loadMaps();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('保存导图失败', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }

  async function handleDeleteMap(id: number) {
    if (!confirm('确定要删除这个思维导图吗？')) return;
    try {
      const api = (window as any).api;
      if (!api) return;
      await api.mindMap.delete(id);
      if (currentMapId === id) {
        setCurrentMap(null);
        setCurrentMapId(null);
      }
      loadMaps();
    } catch (e) {
      console.error('删除导图失败', e);
    }
  }

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

  // 渲染思维导图
  let layoutResult: LayoutNode | null = null;
  let allNodes: { node: MindMapNode; x: number; y: number; level: number }[] = [];
  let allEdges: { from: { x: number; y: number }; to: { x: number; y: number }; level: number }[] = [];
  let svgWidth = 800;
  let svgHeight = 500;

  if (currentMap) {
    layoutResult = layoutTree(currentMap, 40, 40, 0);
    allNodes = collectLayout(layoutResult);
    allEdges = collectEdges(layoutResult);
    if (layoutResult) {
      svgWidth = Math.max(800, layoutResult.width + 80);
      svgHeight = Math.max(500, layoutResult.height + 80);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">思维导图</h1>
          <p className="text-sm text-gray-500 mt-1">构建知识体系，梳理考点脉络</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建
          </button>
          <button
            onClick={handleSave}
            disabled={!currentMap || saveStatus === 'saving'}
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : saveStatus === 'saving'
                ? 'bg-green-400 text-white cursor-wait'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Save className="w-4 h-4 mr-1" />
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存 ✓' : saveStatus === 'error' ? '保存失败' : '保存'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 左侧导图列表 */}
        <div className="w-56 shrink-0 space-y-2">
          <h3 className="text-sm font-medium text-gray-500 mb-2">我的导图</h3>
          {maps.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">暂无导图</p>
          ) : (
            maps.map(map => (
              <div
                key={map.id}
                onClick={() => handleLoad(map)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                  currentMapId === map.id
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 truncate flex-1">{map.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteMap(map.id); }}
                    className="text-gray-400 hover:text-red-500 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center mt-1 text-xs text-gray-400">
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded">{map.subject}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 右侧导图编辑区 */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {currentMap ? (
            <>
              {/* 工具栏 */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
                <input
                  value={mapTitle}
                  onChange={e => setMapTitle(e.target.value)}
                  className="text-sm font-medium text-gray-800 bg-transparent border-none focus:outline-none focus:border-b focus:border-primary-400 px-1"
                />
                <select
                  value={mapSubject}
                  onChange={e => setMapSubject(e.target.value)}
                  className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                >
                  <option value="行测">行测</option>
                  <option value="申论">申论</option>
                  <option value="面试">面试</option>
                  <option value="综合">综合</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleAddChild}
                    disabled={!selectedNode}
                    className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + 子节点
                  </button>
                  <button
                    onClick={handleDeleteNode}
                    disabled={!selectedNode || currentMap.id === selectedNode}
                    className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* 导图画布 */}
              <div className="overflow-auto p-4" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                <svg ref={svgRef} width={svgWidth} height={svgHeight} className="min-w-full">
                  {/* 连线 */}
                  {allEdges.map((edge, i) => (
                    <path
                      key={`edge-${i}`}
                      d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x + H_GAP / 2} ${edge.from.y}, ${edge.to.x - H_GAP / 2} ${edge.to.y}, ${edge.to.x} ${edge.to.y}`}
                      fill="none"
                      stroke={LEVEL_COLORS[edge.level % LEVEL_COLORS.length]}
                      strokeWidth="2"
                      opacity="0.4"
                    />
                  ))}
                  {/* 节点 */}
                  {allNodes.map(({ node, x, y, level }) => (
                    <g
                      key={node.id}
                      onClick={() => handleNodeClick(node.id)}
                      onDoubleClick={() => handleNodeDoubleClick(node.id, node.topic)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={x}
                        y={y}
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx={8}
                        fill={selectedNode === node.id ? '#dbeafe' : 'white'}
                        stroke={LEVEL_COLORS[level % LEVEL_COLORS.length]}
                        strokeWidth={selectedNode === node.id ? 2.5 : 1.5}
                        className="mind-node"
                      />
                      {editingNode === node.id ? (
                        <foreignObject x={x + 4} y={y + 4} width={NODE_WIDTH - 8} height={NODE_HEIGHT - 8}>
                          <input
                            autoFocus
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onBlur={handleEditCommit}
                            onKeyDown={e => { if (e.key === 'Enter') handleEditCommit(); }}
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
                          fill="#1f2937"
                          className="pointer-events-none select-none"
                        >
                          {node.topic.length > 10 ? node.topic.slice(0, 10) + '...' : node.topic}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <FolderOpen className="w-16 h-16 mb-3 text-gray-300" />
              <p className="text-lg">选择或新建一个思维导图</p>
              <p className="text-sm mt-1">点击"新建"开始构建知识体系</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MindMap;
