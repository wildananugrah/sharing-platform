'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/data/mockUsers';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface RichTextProps {
  /** Callback when content is exported/saved */
  onExport?: (html: string) => void | Promise<void>;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Callback when content changes */
  onChange?: (html: string) => void;
  /** Callback when a mention is clicked */
  onMentionClick?: (userId: string, username: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Initial HTML content to load */
  initialContent?: string;
  /** Minimum height of the editor in pixels */
  minHeight?: number;
  /** Enable/disable URL auto-detection */
  enableUrlDetection?: boolean;
  /** Enable/disable mention functionality */
  enableMentions?: boolean;
  /** Custom CSS classes for the editor container */
  className?: string;
  /** Whether to clear content after successful export */
  clearAfterExport?: boolean;
  /** Toolbar configuration */
  toolbar?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    orderedList?: boolean;
    unorderedList?: boolean;
  };
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  orderedList: boolean;
  unorderedList: boolean;
}

interface MentionPosition {
  top: number;
  left: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

const DEFAULT_TOOLBAR_CONFIG = {
  bold: true,
  italic: true,
  underline: true,
  orderedList: true,
  unorderedList: true,
};

const MENTION_STYLES = 'mention-tag bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium cursor-pointer inline-block transition-all duration-200 border border-blue-300 mx-0.5 hover:bg-blue-200 hover:border-blue-400 active:bg-blue-300 active:border-blue-500';

const LINK_STYLES = 'text-blue-600 hover:text-blue-800 underline';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RichText({
  onExport,
  onCancel,
  onChange,
  onMentionClick,
  placeholder = "Start typing...",
  initialContent = "",
  minHeight = 300,
  enableUrlDetection = true,
  enableMentions = true,
  className = "",
  clearAfterExport = false,
  toolbar = DEFAULT_TOOLBAR_CONFIG,
}: RichTextProps) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // STATE
  // ============================================================================

  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    orderedList: false,
    unorderedList: false,
  });

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<MentionPosition>({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [currentMentionRange, setCurrentMentionRange] = useState<Range | null>(null);
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [isExporting, setIsExporting] = useState(false);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  // Debounced search for users
  const searchUsersDebounced = useCallback(async (query: string) => {
    if (!enableMentions || query.length < 1) {
      setSearchedUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=100`);
      if (response.ok) {
        const users = await response.json();
        setSearchedUsers(users);
      } else {
        setSearchedUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchedUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [enableMentions]);

  // Search for users when mention query changes
  const searchUsers = useCallback((query: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      searchUsersDebounced(query);
    }, 300); // 300ms debounce
  }, [searchUsersDebounced]);

  const filteredUsers = useMemo(() => {
    if (!enableMentions) return [];
    return searchedUsers;
  }, [searchedUsers, enableMentions]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const clearEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      setCurrentContent('');
      if (onChange) {
        onChange('');
      }
    }
  }, [onChange]);

  const createMentionElement = useCallback((user: User): HTMLSpanElement => {
    const mentionSpan = document.createElement('span');
    mentionSpan.className = MENTION_STYLES;
    mentionSpan.contentEditable = 'false';
    mentionSpan.dataset.userId = user.id;
    mentionSpan.dataset.username = user.username;
    mentionSpan.textContent = `@${user.username}`;
    return mentionSpan;
  }, []);

  const createLinkElement = useCallback((url: string): HTMLAnchorElement => {
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.target = '_blank';
    linkElement.rel = 'noopener noreferrer';
    linkElement.textContent = url;
    linkElement.className = LINK_STYLES;
    return linkElement;
  }, []);

  // ============================================================================
  // MENTION DETECTION
  // ============================================================================

  const detectMention = useCallback(() => {
    if (!enableMentions) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const text = textNode.textContent || '';
    const cursorPosition = range.startOffset;

    // Look for @ symbol before cursor
    let atIndex = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (text[i] === '@') {
        atIndex = i;
        break;
      }
      // Stop if we hit a space or newline
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
    }

    if (atIndex !== -1) {
      const query = text.substring(atIndex + 1, cursorPosition);
      setMentionSearchQuery(query);

      // Search for users when query changes
      searchUsers(query);

      // Calculate dropdown position
      const tempRange = document.createRange();
      tempRange.setStart(textNode, atIndex);
      tempRange.setEnd(textNode, atIndex + 1);
      const rect = tempRange.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();

      if (editorRect) {
        setMentionPosition({
          top: rect.bottom - editorRect.top,
          left: rect.left - editorRect.left
        });
      }

      // Store the range for replacement
      const mentionRange = document.createRange();
      mentionRange.setStart(textNode, atIndex);
      mentionRange.setEnd(textNode, cursorPosition);
      setCurrentMentionRange(mentionRange);

      setShowMentionDropdown(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionDropdown(false);
      setCurrentMentionRange(null);
      setSearchedUsers([]);
    }
  }, [enableMentions, searchUsers]);

  // ============================================================================
  // MENTION INSERTION
  // ============================================================================

  const insertMention = useCallback((user: User) => {
    if (!currentMentionRange) return;

    const selection = window.getSelection();
    if (!selection) return;

    const mentionSpan = createMentionElement(user);

    // Replace the @query with the mention element
    currentMentionRange.deleteContents();
    currentMentionRange.insertNode(mentionSpan);

    // Add a space after the mention
    const spaceNode = document.createTextNode('\u00A0');
    mentionSpan.parentNode?.insertBefore(spaceNode, mentionSpan.nextSibling);

    // Move cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Clean up
    setShowMentionDropdown(false);
    setCurrentMentionRange(null);
    setMentionSearchQuery('');

    editorRef.current?.focus();

    // Trigger onChange
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [currentMentionRange, createMentionElement, onChange]);

  // ============================================================================
  // URL DETECTION & CONVERSION
  // ============================================================================

  const convertUrlsInText = useCallback(() => {
    if (!enableUrlDetection || !editorRef.current) return;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;

    while (node = walker.nextNode()) {
      const parent = (node as Text).parentElement;
      if (parent && !parent.closest('a') && !parent.classList.contains('mention-tag')) {
        textNodes.push(node as Text);
      }
    }

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const matches = [...text.matchAll(URL_REGEX)];

      if (matches.length > 0) {
        // Process in reverse to maintain positions
        matches.reverse().forEach(match => {
          const url = match[0];
          const startIndex = match.index!;

          const linkElement = createLinkElement(url);

          // Split text and insert link
          const beforeText = text.substring(0, startIndex);
          const afterText = text.substring(startIndex + url.length);

          const parent = textNode.parentNode!;

          if (beforeText) {
            parent.insertBefore(document.createTextNode(beforeText), textNode);
          }
          parent.insertBefore(linkElement, textNode);
          if (afterText) {
            parent.insertBefore(document.createTextNode(afterText), textNode);
          }
          parent.removeChild(textNode);

          // Update reference for next iteration
          if (afterText) {
            textNode = parent.lastChild as Text;
          }
        });
      }
    });
  }, [enableUrlDetection, createLinkElement]);

  // ============================================================================
  // FORMATTING FUNCTIONS
  // ============================================================================

  const updateActiveFormats = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as HTMLElement;

    if (!parentElement) return;

    const computedStyle = window.getComputedStyle(parentElement);
    const isInOrderedList = !!parentElement.closest('ol');
    const isInUnorderedList = !!parentElement.closest('ul');

    setActiveFormats({
      bold: computedStyle.fontWeight === 'bold' || computedStyle.fontWeight === '700' || !!parentElement.closest('b, strong'),
      italic: computedStyle.fontStyle === 'italic' || !!parentElement.closest('i, em'),
      underline: computedStyle.textDecoration.includes('underline') || !!parentElement.closest('u'),
      orderedList: isInOrderedList,
      unorderedList: isInUnorderedList,
    });
  }, []);

  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
  }, [updateActiveFormats]);

  const toggleList = useCallback((listType: 'ordered' | 'unordered') => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range) return;

    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as HTMLElement;

    if (!parentElement) return;

    const currentList = parentElement.closest('ol, ul');
    const isInList = !!currentList;
    const isSameListType = (listType === 'ordered' && currentList?.tagName === 'OL') ||
      (listType === 'unordered' && currentList?.tagName === 'UL');

    if (isInList && isSameListType) {
      // Exit the list
      const newParagraph = document.createElement('div');
      newParagraph.innerHTML = '<br>';
      currentList.parentNode?.insertBefore(newParagraph, currentList.nextSibling);

      const newRange = document.createRange();
      newRange.selectNodeContents(newParagraph);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else if (isInList && !isSameListType) {
      // Convert between list types
      const newListTag = listType === 'ordered' ? 'ol' : 'ul';
      const newList = document.createElement(newListTag);
      newList.innerHTML = currentList.innerHTML;
      currentList.parentNode?.replaceChild(newList, currentList);

      const newRange = document.createRange();
      const firstLi = newList.querySelector('li');
      if (firstLi) {
        newRange.selectNodeContents(firstLi);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // Create new list
      const selectedText = range.toString() || '';
      const lines = selectedText ? selectedText.split('\n').filter(line => line.trim()) : [''];

      const listElement = document.createElement(listType === 'ordered' ? 'ol' : 'ul');

      lines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line || '\u200B';
        listElement.appendChild(li);
      });

      if (range.toString()) {
        range.deleteContents();
      }

      range.insertNode(listElement);

      const newRange = document.createRange();
      const firstLi = listElement.querySelector('li');
      if (firstLi) {
        newRange.selectNodeContents(firstLi);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }

    editorRef.current.focus();
    updateActiveFormats();
  }, [updateActiveFormats]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setCurrentContent(html);
      if (onChange) {
        onChange(html);
      }
    }
    detectMention();
  }, [detectMention, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // URL detection on space
    if (e.key === ' ' && enableUrlDetection) {
      setTimeout(convertUrlsInText, 10);
    }

    // Mention dropdown navigation
    if (showMentionDropdown) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedMentionIndex(prev =>
            prev < filteredUsers.length - 1 ? prev + 1 : prev
          );
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : prev);
          return;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedMentionIndex]) {
            insertMention(filteredUsers[selectedMentionIndex]);
          }
          return;
        case 'Escape':
          e.preventDefault();
          setShowMentionDropdown(false);
          setCurrentMentionRange(null);
          return;
      }
    }

    // Formatting shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          return;
        case 'i':
          e.preventDefault();
          formatText('italic');
          return;
        case 'u':
          e.preventDefault();
          formatText('underline');
          return;
      }
    }

    // List handling
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const parentElement = container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container as HTMLElement;

      const listItem = parentElement?.closest('li');
      if (listItem) {
        const list = listItem.closest('ol, ul');

        // Double Enter to exit list
        if (listItem.textContent?.trim() === '' && list) {
          e.preventDefault();
          listItem.remove();

          const newParagraph = document.createElement('div');
          newParagraph.innerHTML = '<br>';
          list.parentNode?.insertBefore(newParagraph, list.nextSibling);

          const newRange = document.createRange();
          newRange.selectNodeContents(newParagraph);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          e.preventDefault();
          document.execCommand('insertHTML', false, '</li><li>');
        }
      }
    }
  }, [showMentionDropdown, filteredUsers, selectedMentionIndex, insertMention, formatText, enableUrlDetection, convertUrlsInText]);

  const handleMentionClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    let mentionElement = target;

    if (!mentionElement.classList.contains('mention-tag')) {
      mentionElement = target.closest('.mention-tag') as HTMLElement;
    }

    if (mentionElement && mentionElement.classList.contains('mention-tag')) {
      e.preventDefault();
      e.stopPropagation();

      const userId = mentionElement.dataset.userId;
      const username = mentionElement.dataset.username;

      if (userId && username) {
        if (onMentionClick) {
          onMentionClick(userId, username);
        } else {
          router.push(`/users/${userId}`);
        }
      }
    }
  }, [onMentionClick, router]);

  const handleExport = useCallback(async () => {
    if (editorRef.current && onExport) {
      const html = editorRef.current.innerHTML.trim();

      // Don't export if content is empty
      if (!html || html === '<br>' || html === '<p><br></p>') {
        return;
      }

      setIsExporting(true);
      try {
        await onExport(html);

        // Clear content after successful export if requested
        if (clearAfterExport) {
          clearEditor();
        }
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    }
  }, [onExport, clearAfterExport, clearEditor]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;

      // Add event listeners to existing mentions
      const mentions = editorRef.current.querySelectorAll('.mention-tag');
      mentions.forEach(mention => {
        (mention as HTMLElement).className = MENTION_STYLES;
      });

      // Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      if (selection) {
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [initialContent]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const toolbarConfig = { ...DEFAULT_TOOLBAR_CONFIG, ...toolbar };
  const showToolbar = Object.values(toolbarConfig).some(v => v);

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`}>
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
          {toolbarConfig.bold && (
            <button
              className={`flex items-center justify-center w-8 h-8 border border-transparent rounded transition-all duration-200 text-sm ${
                activeFormats.bold
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-100 hover:border-gray-300'
              }`}
              onClick={() => formatText('bold')}
              type="button"
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
          )}

          {toolbarConfig.italic && (
            <button
              className={`flex items-center justify-center w-8 h-8 border border-transparent rounded transition-all duration-200 text-sm ${
                activeFormats.italic
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-100 hover:border-gray-300'
              }`}
              onClick={() => formatText('italic')}
              type="button"
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </button>
          )}

          {toolbarConfig.underline && (
            <button
              className={`flex items-center justify-center w-8 h-8 border border-transparent rounded transition-all duration-200 text-sm ${
                activeFormats.underline
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-100 hover:border-gray-300'
              }`}
              onClick={() => formatText('underline')}
              type="button"
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </button>
          )}

          {(toolbarConfig.bold || toolbarConfig.italic || toolbarConfig.underline) &&
            (toolbarConfig.orderedList || toolbarConfig.unorderedList) && (
              <div className="w-px h-6 bg-gray-300 mx-1" />
            )}

          {toolbarConfig.orderedList && (
            <button
              className={`flex items-center justify-center w-8 h-8 border border-transparent rounded transition-all duration-200 text-sm ${
                activeFormats.orderedList
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-100 hover:border-gray-300'
              }`}
              onClick={() => toggleList('ordered')}
              type="button"
              title="Numbered List"
            >
              <span>1.</span>
            </button>
          )}

          {toolbarConfig.unorderedList && (
            <button
              className={`flex items-center justify-center w-8 h-8 border border-transparent rounded transition-all duration-200 text-sm ${
                activeFormats.unorderedList
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-100 hover:border-gray-300'
              }`}
              onClick={() => toggleList('unordered')}
              type="button"
              title="Bullet List"
            >
              <span>•</span>
            </button>
          )}

          <div className="w-px h-6 bg-gray-300 mx-1" />
        </div>
      )}

      <div className="relative">
        <div
          ref={editorRef}
          className={`p-4 outline-none text-base leading-relaxed prose prose-sm max-w-none
                     [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:pl-4 [&_ol]:my-2
                     [&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-4 [&_ul]:my-2
                     [&_li]:mb-1 [&_li]:list-item
                     empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400`}
          style={{ minHeight: `${minHeight}px` }}
          contentEditable
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onClick={handleMentionClick}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />

        {/* Mention Dropdown */}
        {showMentionDropdown && (loadingUsers || filteredUsers.length > 0) && (
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 min-w-[250px]"
            style={{
              top: `${mentionPosition.top + 20}px`,
              left: `${mentionPosition.left}px`
            }}
          >
            {loadingUsers ? (
              <div className="flex items-center justify-center p-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-500">Searching users...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={`flex items-center p-3 cursor-pointer transition-colors ${
                    index === selectedMentionIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => insertMention(user)}
                  onMouseEnter={() => setSelectedMentionIndex(index)}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full mr-3 object-cover"
                      onError={(e) => {
                        // Fallback to initial avatar on error
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4299e1&color=fff`;
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full mr-3 bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-gray-500 text-center">
                No users found
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {(onCancel || onExport) && (
          <div className="flex flex-row justify-end gap-1 p-2 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-row space-x-1">
              {onCancel && (
                <button
                  className="px-4 py-2 border border-gray-200 rounded-md bg-white text-sm font-medium
                           transition-all duration-200 shadow-sm active:bg-gray-100 active:border-gray-200 hover:shadow-md"
                  onClick={onCancel}
                  type="button"
                  title="Cancel"
                >
                  Cancel
                </button>
              )}
              {onExport && (
                <button
                  className={`px-4 py-2 border rounded-md text-sm font-medium transition-all duration-200 shadow-sm ${
                    isExporting || (!currentContent.trim() || currentContent.trim() === '<br>' || currentContent.trim() === '<p><br></p>')
                      ? 'border-gray-300 bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:border-blue-600 hover:shadow-md'
                  }`}
                  onClick={handleExport}
                  disabled={isExporting || (!currentContent.trim() || currentContent.trim() === '<br>' || currentContent.trim() === '<p><br></p>')}
                  title={isExporting ? 'Submitting...' : 'Save Changes'}
                >
                  {isExporting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
