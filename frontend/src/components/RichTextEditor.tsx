'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  content: string;        // HTML-контент
  onChange: (html: string) => void;
  editable: boolean;
}

export default function RichTextEditor({ content, onChange, editable }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState('16');
  const [currentFontName, setCurrentFontName] = useState('Arial');

  // Инициализация контента
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = DOMPurify.sanitize(content);
    }
  }, [content]);

  // Обработчик ввода
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(DOMPurify.sanitize(html));
    }
  };

  // Применение команды к выделенному тексту
  const executeCommand = (command: string, value?: string) => {
    if (!editable) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput(); // обновить состояние
    }
  };

  // Применение стиля через span
  const applyStyle = (property: string, value: string) => {
    if (!editable) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // нет выделения

    const span = document.createElement('span');
    span.style.setProperty(property, value);
    try {
      range.surroundContents(span);
    } catch (e) {
      // fallback для сложных выделений
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    handleInput();
  };

  // Выбор размера шрифта
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value;
    setCurrentFontSize(size);
    applyStyle('font-size', size + 'px');
  };

  // Выбор шрифта
  const handleFontNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const font = e.target.value;
    setCurrentFontName(font);
    applyStyle('font-family', font);
  };

  // Вставка чек-листа
  const insertChecklist = () => {
    if (!editable) return;
    const html = '<div style="display:flex; align-items:center; gap:8px;"><input type="checkbox" style="margin:0;" /><span>Новая задача</span></div>';
    document.execCommand('insertHTML', false, html);
    handleInput();
  };

  // Очистка контента при удалении всего текста
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, text);
    handleInput();
  };

  return (
    <div className="border rounded">
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50">
          {/* Жирный, курсив, подчёркнутый */}
          <button onClick={() => executeCommand('bold')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="Жирный"><b>B</b></button>
          <button onClick={() => executeCommand('italic')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="Курсив"><i>I</i></button>
          <button onClick={() => executeCommand('underline')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="Подчёркнутый"><u>U</u></button>

          {/* Цвет текста */}
          <input
            type="color"
            onChange={(e) => executeCommand('foreColor', e.target.value)}
            className="w-8 h-8 p-0 border cursor-pointer"
            title="Цвет текста"
          />

          {/* Цвет фона (маркер) */}
          <input
            type="color"
            onChange={(e) => executeCommand('backColor', e.target.value)}
            className="w-8 h-8 p-0 border cursor-pointer"
            title="Цвет фона"
          />

          {/* Размер шрифта */}
          <select
            value={currentFontSize}
            onChange={handleFontSizeChange}
            className="bg-gray-200 rounded px-1 h-8 text-sm"
            title="Размер шрифта"
          >
            {[8,10,12,14,16,18,20,24,28,32,36,48].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>

          {/* Шрифт */}
          <select
            value={currentFontName}
            onChange={handleFontNameChange}
            className="bg-gray-200 rounded px-1 h-8 text-sm"
            title="Шрифт"
          >
            {['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Comic Sans MS'].map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>

          {/* Выравнивание */}
          <button onClick={() => executeCommand('justifyLeft')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="По левому краю">⇤</button>
          <button onClick={() => executeCommand('justifyCenter')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="По центру">⇔</button>
          <button onClick={() => executeCommand('justifyRight')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="По правому краю">⇥</button>

          {/* Списки */}
          <button onClick={() => executeCommand('insertUnorderedList')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="Маркированный список">•</button>
          <button onClick={() => executeCommand('insertOrderedList')} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="Нумерованный список">1.</button>

          {/* Чек-лист */}
          <button onClick={insertChecklist} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" title="Чек-лист">☑</button>
        </div>
      )}

      {/* Редактируемая область */}
      <div
        ref={editorRef}
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className={`p-3 min-h-[300px] outline-none ${editable ? 'bg-white' : 'bg-gray-100'}`}
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  );
}