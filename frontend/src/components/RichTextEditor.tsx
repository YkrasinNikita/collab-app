'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  FiBold, FiItalic, FiUnderline,
  FiAlignLeft, FiAlignCenter, FiAlignRight,
  FiList, FiClipboard
} from 'react-icons/fi';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable: boolean;
}

export default function RichTextEditor({ content, onChange, editable }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [currentFontName, setCurrentFontName] = useState('Arial');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = DOMPurify.sanitize(content);
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(DOMPurify.sanitize(html));
    }
  };

  const executeCommand = (command: string, value?: string) => {
    if (!editable) return;
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const applyStyle = (property: string, value: string) => {
    if (!editable) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement('span');
    span.style.setProperty(property, value);
    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    handleInput();
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentFontSize(e.target.value);
    applyStyle('font-size', e.target.value + 'px');
  };

  const handleFontNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentFontName(e.target.value);
    applyStyle('font-family', e.target.value);
  };

  const insertChecklist = () => {
    if (!editable) return;
    const html = '<div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" style="margin:0;" /><span>Новая задача</span></div>';
    document.execCommand('insertHTML', false, html);
    handleInput();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, text);
    handleInput();
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          <button onClick={() => executeCommand('bold')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Жирный"><FiBold size={14} /></button>
          <button onClick={() => executeCommand('italic')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Курсив"><FiItalic size={14} /></button>
          <button onClick={() => executeCommand('underline')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Подчёркнутый"><FiUnderline size={14} /></button>
          <input type="color" onChange={(e) => executeCommand('foreColor', e.target.value)} className="w-6 h-6 p-0 border cursor-pointer" title="Цвет текста" />
          <input type="color" onChange={(e) => executeCommand('backColor', e.target.value)} className="w-6 h-6 p-0 border cursor-pointer" title="Цвет фона" />
          <select value={currentFontSize} onChange={handleFontSizeChange} className="bg-transparent border border-gray-300 dark:border-gray-600 rounded text-sm px-1 h-8">
            {[8,10,12,14,16,18,20,24,28,32,36,48].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
          <select value={currentFontName} onChange={handleFontNameChange} className="bg-transparent border border-gray-300 dark:border-gray-600 rounded text-sm px-1 h-8">
            {['Arial','Times New Roman','Courier New','Georgia','Verdana','Comic Sans MS'].map(font => <option key={font} value={font}>{font}</option>)}
          </select>
          <button onClick={() => executeCommand('justifyLeft')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="По левому краю"><FiAlignLeft size={14} /></button>
          <button onClick={() => executeCommand('justifyCenter')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="По центру"><FiAlignCenter size={14} /></button>
          <button onClick={() => executeCommand('justifyRight')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="По правому краю"><FiAlignRight size={14} /></button>
          <button onClick={() => executeCommand('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Маркированный список"><FiList size={14} /></button>
          <button onClick={() => executeCommand('insertOrderedList')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Нумерованный список"><FiList size={14} />1.</button>
          <button onClick={insertChecklist} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Чек-лист"><FiClipboard size={14} /></button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className={`p-4 min-h-[300px] outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${editable ? '' : 'bg-gray-100 dark:bg-gray-800/50'}`}
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}