'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Modal from '@/components/Modal';
import LoginForm from '@/components/LoginForm';

interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
  menuItems?: MenuItem[];
}

// Default public menu items
const defaultPublicMenuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )
  }
];

// MenuItem Component
const MenuItemComponent = ({
  item,
  isActive,
  onNavigate,
  level = 0,
  isExpanded,
  onToggleExpand,
  pathname
}: {
  item: MenuItem;
  isActive: boolean;
  onNavigate: (path: string) => void;
  level?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  pathname: string;
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const paddingLeft = `${level === 0 ? 20 : 20 + (level * 16)}px`;

  return (
    <div>
      <button
        className={`flex items-center justify-between w-full py-3 text-sm transition-colors ${
          isActive
            ? 'text-gray-900 bg-gray-200'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
        style={{ paddingLeft, paddingRight: '20px' }}
        onClick={() => {
          if (hasChildren && onToggleExpand) {
            onToggleExpand();
          } else if (item.path) {
            onNavigate(item.path);
          }
        }}
      >
        <div className="flex items-center">
          {item.icon}
          <span>{item.label}</span>
        </div>
        {hasChildren && (
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}
      </button>
      {hasChildren && isExpanded && (
        <div className="bg-gray-50">
          {item.children!.map((child) => {
            const childIsActive = child.path ? pathname === child.path : false;
            return (
              <MenuItemComponent
                key={child.id}
                item={child}
                isActive={childIsActive}
                onNavigate={onNavigate}
                level={level + 1}
                pathname={pathname}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function PublicLayout({
  children,
  title,
  menuItems = defaultPublicMenuItems
}: PublicLayoutProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const projectName = 'PM';

  // Toggle menu item expansion
  const toggleMenuItemExpansion = (itemId: string) => {
    setExpandedMenuItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Check if a menu item or any of its children is active
  const isMenuItemOrChildActive = (item: MenuItem): boolean => {
    if (item.path === pathname) return true;
    if (item.children) {
      return item.children.some(child => isMenuItemOrChildActive(child));
    }
    return false;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 fixed h-screen z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-5 border-b border-gray-200 flex justify-between items-center h-16">
          <div className="text-xl font-bold text-gray-900 truncate" title={projectName}>{projectName}</div>
          <button
            className="md:hidden p-2 text-gray-500 rounded hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav className="flex-1 py-5 overflow-y-scroll">
          {menuItems.map((item) => {
            const isActive = isMenuItemOrChildActive(item);
            const isExpanded = expandedMenuItems.has(item.id);
            return (
              <MenuItemComponent
                key={item.id}
                item={item}
                isActive={isActive}
                isExpanded={isExpanded}
                onNavigate={(path) => {
                  router.push(path);
                  setSidebarOpen(false); // Close sidebar on mobile after navigation
                }}
                onToggleExpand={() => toggleMenuItemExpansion(item.id)}
                pathname={pathname}
              />
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <button
              className="block md:hidden p-2 text-gray-500 rounded hover:bg-gray-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Login
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {title && (
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Login Modal */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Sign In"
        size="md"
      >
        <LoginForm />
      </Modal>
    </div>
  );
}
