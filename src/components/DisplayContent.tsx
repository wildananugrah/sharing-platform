'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';

interface DisplayContentProps {
  content: string;
  className?: string;
  onMentionClick?: (userId: string, username: string) => void;
}

export default function DisplayContent({ content, className = '', onMentionClick }: DisplayContentProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  // URL regex pattern for detecting URLs
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

  const convertUrlsToLinks = useCallback(() => {
    if (!contentRef.current) return;

    // Walk through all text nodes to find URLs
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.parentElement && !node.parentElement.closest('a') && !node.parentElement.classList.contains('mention-tag')) {
        textNodes.push(node as Text);
      }
    }

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const matches = [...text.matchAll(urlRegex)];

      if (matches.length > 0) {
        // Process matches in reverse order to maintain positions
        matches.reverse().forEach(match => {
          const url = match[0];
          const startIndex = match.index!;
          const endIndex = startIndex + url.length;

          // Create a link element
          const linkElement = document.createElement('a');
          linkElement.href = url;
          linkElement.target = '_blank';
          linkElement.rel = 'noopener noreferrer';
          linkElement.textContent = url;
          linkElement.className = 'text-blue-600 hover:text-blue-800 underline';

          // Split the text node and insert the link
          const beforeText = text.substring(0, startIndex);
          const afterText = text.substring(endIndex);

          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText);

          const parent = textNode.parentNode!;
          parent.insertBefore(beforeNode, textNode);
          parent.insertBefore(linkElement, textNode);
          parent.insertBefore(afterNode, textNode);
          parent.removeChild(textNode);

          // Update the textNode reference for the next iteration
          if (afterText) {
            textNode = afterNode;
          }
        });
      }
    });
  }, [urlRegex]);

  useEffect(() => {
    if (!contentRef.current) return;

    // Find all mention tags and make them clickable
    const mentionTags = contentRef.current.querySelectorAll('.mention-tag');

    mentionTags.forEach((mentionElement) => {
      const span = mentionElement as HTMLElement;

      // Add Tailwind CSS classes for styling
      span.className = 'mention-tag bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium cursor-pointer inline-block transition-all duration-200 border border-blue-300 mx-0.5 hover:bg-blue-200 hover:border-blue-400 active:bg-blue-300 active:border-blue-500';

      // Remove existing click handler to avoid duplicates
      const newSpan = span.cloneNode(true) as HTMLElement;
      span.parentNode?.replaceChild(newSpan, span);

      // Add click handler
      newSpan.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const userId = newSpan.dataset.userId;
        const username = newSpan.dataset.username;

        console.log('Mention clicked in display:', { userId, username });

        if (userId && username) {
          if (onMentionClick) {
            onMentionClick(userId, username);
          } else {
            router.push(`/users/${userId}`);
          }
        }
      });
    });

    // Convert URLs to clickable links
    convertUrlsToLinks();
  }, [content, router, onMentionClick, convertUrlsToLinks]);

  return (
    <div
      ref={contentRef}
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}