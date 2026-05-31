'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

interface MindMapEditorProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onChange: (nodes: Node[], edges: Edge[]) => void;
  editable: boolean;
}

// Кастомный узел с динамическим размером и поддержкой тёмной темы
function EditableNode({ data, id }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState((data as any).label || '');
  const editableRef = useRef<HTMLSpanElement>(null);

  const handleDoubleClick = () => {
    if (!(data as any).editable) return;
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const finishEditing = () => {
    setIsEditing(false);
    const onLabelChange = (data as any).onLabelChange;
    if (onLabelChange && editableRef.current) {
      const newText = editableRef.current.textContent || '';
      onLabelChange(id, newText);
      setLabel(newText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing();
    }
    if (e.key === 'Escape') {
      setLabel((data as any).label || '');
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`px-4 py-2 bg-white dark:bg-gray-700 border-2 border-blue-400 dark:border-blue-500 rounded-lg shadow-md relative ${
        isEditing ? '' : 'cursor-pointer'
      }`}
      style={{ minWidth: 80, maxWidth: isEditing ? undefined : 200 }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
      {isEditing ? (
        <span
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          className="text-sm font-medium outline-none text-gray-800 dark:text-gray-200 inline-block whitespace-nowrap"
          style={{ minWidth: 20 }}
        >
          {label}
        </span>
      ) : (
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
      )}
    </div>
  );
}

export default function MindMapEditor({
  initialNodes,
  initialEdges,
  onChange,
  editable,
}: MindMapEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  useEffect(() => {
    onChange(nodes, edges);
  }, [nodes, edges, onChange]);

  const handleLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, label: newLabel } }
            : node
        )
      );
    },
    [setNodes]
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          editable,
          onLabelChange: handleLabelChange,
        },
      }))
    );
  }, [editable, handleLabelChange, setNodes]);

  const addNode = () => {
    if (!editable) return;
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {
        label: 'Новый узел',
        editable,
        onLabelChange: handleLabelChange,
      },
      type: 'editableNode',
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelected = useCallback(() => {
    if (!editable) return;
    setNodes((nds) => nds.filter((n) => !selectedNodes.includes(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedEdges.includes(e.id)));
  }, [editable, selectedNodes, selectedEdges, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && editable) {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, editable]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const nodeTypes = { editableNode: EditableNode };

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={addNode}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:shadow-md transition text-sm"
          >
            <FiPlus size={14} /> Узел
          </button>
          <button
            onClick={deleteSelected}
            disabled={!selectedNodes.length && !selectedEdges.length}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg shadow hover:shadow-md transition text-sm disabled:opacity-50"
          >
            <FiTrash2 size={14} /> Удалить
          </button>
        </div>
      )}
      <div className="w-full h-[500px] md:h-[600px] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={editable ? onNodesChange : undefined}
          onEdgesChange={editable ? onEdgesChange : undefined}
          onConnect={editable ? onConnect : undefined}
          onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
            setSelectedNodes(selNodes.map((n) => n.id));
            setSelectedEdges(selEdges.map((e) => e.id));
          }}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={editable}
          nodesConnectable={editable}
          elementsSelectable={editable}
        >
          <Controls className="!bg-white dark:!bg-gray-800 !border-gray-300 dark:!border-gray-600 !rounded-lg !shadow" />
          <MiniMap className="!bg-gray-100 dark:!bg-gray-700 !rounded-lg !border-gray-300 dark:!border-gray-600" />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#9ca3af" />
        </ReactFlow>
      </div>
    </div>
  );
}