'use client';

import { ReactNode } from 'react';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  hidden?: boolean;
}

export interface DropdownMenuGroup {
  id: string;
  items: DropdownMenuItem[];
  separator?: boolean; // Add separator after this group
}

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: DropdownMenuItem[];
  groups?: DropdownMenuGroup[];
  position?: 'left' | 'right';
  className?: string;
  width?: string;
}

export default function DropdownMenu({
  isOpen,
  onClose,
  items = [],
  groups = [],
  position = 'right',
  className = '',
  width = 'w-48'
}: DropdownMenuProps) {
  if (!isOpen) return null;

  // If items are provided, treat them as a single group
  const menuGroups: DropdownMenuGroup[] = items.length > 0
    ? [{ id: 'default', items, separator: false }]
    : groups;

  const getItemClassName = (item: DropdownMenuItem) => {
    const baseClass = "w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors";

    if (item.disabled) {
      return `${baseClass} text-gray-400 cursor-not-allowed`;
    }

    if (item.variant === 'danger') {
      return `${baseClass} text-red-600 hover:bg-red-50 cursor-pointer`;
    }

    return `${baseClass} text-gray-700 hover:bg-gray-50 cursor-pointer`;
  };

  const positionClass = position === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`absolute ${positionClass} top-8 ${width} bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 ${className}`}>
      {menuGroups.map((group, groupIndex) => (
        <div key={group.id}>
          {group.items
            .filter(item => !item.hidden)
            .map((item) => (
              <button
                key={item.id}
                className={getItemClassName(item)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.disabled) {
                    item.onClick();
                    onClose();
                  }
                }}
                disabled={item.disabled}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          {group.separator && groupIndex < menuGroups.length - 1 && (
            <div className="border-t border-gray-100 my-1"></div>
          )}
        </div>
      ))}
    </div>
  );
}