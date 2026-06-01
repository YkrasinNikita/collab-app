'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable: boolean;
}

export default function RichTextEditor({ content, onChange, editable }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeStyles, setActiveStyles] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    justifyLeft: boolean;
    justifyCenter: boolean;
    justifyRight: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: true,
    justifyCenter: false,
    justifyRight: false,
  });

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

  const updateActiveStyles = useCallback(() => {
    if (!editable) return;
    const b = document.queryCommandState('bold');
    const i = document.queryCommandState('italic');
    const u = document.queryCommandState('underline');
    const jl = document.queryCommandState('justifyLeft');
    const jc = document.queryCommandState('justifyCenter');
    const jr = document.queryCommandState('justifyRight');
    setActiveStyles({
      bold: b,
      italic: i,
      underline: u,
      justifyLeft: jl,
      justifyCenter: jc,
      justifyRight: jr,
    });
  }, [editable]);

  useEffect(() => {
    if (!editable) return;
    document.addEventListener('selectionchange', updateActiveStyles);
    return () => document.removeEventListener('selectionchange', updateActiveStyles);
  }, [editable, updateActiveStyles]);

  const executeCommand = (command: string, value?: string) => {
    if (!editable) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
      updateActiveStyles();
    }
  };

  return (
    <div className="border rounded dark:border-gray-600">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
          <button
            onClick={() => executeCommand('bold')}
            className={`px-2 py-1 rounded ${activeStyles.bold ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-600'} hover:bg-gray-300 dark:hover:bg-gray-500 dark:text-gray-200`}
            title="Жирный"
          >
            <b>B</b>
          </button>
          <button
            onClick={() => executeCommand('italic')}
            className={`px-2 py-1 rounded ${activeStyles.italic ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-600'} hover:bg-gray-300 dark:hover:bg-gray-500 dark:text-gray-200`}
            title="Курсив"
          >
            <i>I</i>
          </button>
          <button
            onClick={() => executeCommand('underline')}
            className={`px-2 py-1 rounded ${activeStyles.underline ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-600'} hover:bg-gray-300 dark:hover:bg-gray-500 dark:text-gray-200`}
            title="Подчёркнутый"
          >
            <u>U</u>
          </button>

          <button
            onClick={() => executeCommand('justifyLeft')}
            className={`px-2 py-1 rounded ${activeStyles.justifyLeft ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-600'} hover:bg-gray-300 dark:hover:bg-gray-500 dark:text-gray-200`}
            title="По левому краю"
          >
            ⇤
          </button>
          <button
            onClick={() => executeCommand('justifyCenter')}
            className={`px-2 py-1 rounded ${activeStyles.justifyCenter ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-600'} hover:bg-gray-300 dark:hover:bg-gray-500 dark:text-gray-200`}
            title="По центру"
          >
            ⇔
          </button>
          <button
            onClick={() => executeCommand('justifyRight')}
            className={`px-2 py-1 rounded ${activeStyles.justifyRight ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-600'} hover:bg-gray-300 dark:hover:bg-gray-500 dark:text-gray-200`}
            title="По правому краю"
          >
            ⇥
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={handleInput}
        className={`p-3 min-h-[300px] outline-none ${
          editable
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200'
            : 'bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400'
        }`}
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}