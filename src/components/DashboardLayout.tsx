'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MenuItem {
  id: string;
  label: string;
  path?: string;
  icon: React.ReactNode;
  isActive?: boolean;
  children?: MenuItem[];
  isExpanded?: boolean;
  roles?: string[]; // Which roles can access this menu item
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  headerActions?: React.ReactNode;
  menuItems?: MenuItem[];
}

// Default menu items
const defaultMenuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    )
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    path: '/subscriptions',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    )
  },
  {
    id: 'history',
    label: 'History',
    path: '/history',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    )
  },
  {
    id: 'your-videos',
    label: 'Your Videos',
    path: '/your-videos',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    )
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    )
  },
];

const stripHtml = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

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
        className={`flex items-center justify-between w-full py-3 text-sm transition-colors ${isActive
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
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''
              }`}
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

export default function DashboardLayout({
  children,
  title,
  searchPlaceholder = "Search...",
  onSearch,
  headerActions,
  menuItems = defaultMenuItems
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState('PM');

  // Load notifications when session is available
  useEffect(() => {
    if (status === 'loading') return;
    loadNotifications();
  }, [session, status, router]);

  // Refresh notifications every 30 seconds
  useEffect(() => {
    // if (!session) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Close notification dropdown if clicking outside
      if (notificationDropdownOpen && !target.closest('[data-notification-dropdown]')) {
        setNotificationDropdownOpen(false);
      }

      // Close user dropdown if clicking outside
      if (userDropdownOpen && !target.closest('[data-user-dropdown]')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationDropdownOpen, userDropdownOpen]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Load notifications from API
  const loadNotifications = async () => {
    // if (!session) return;

    setIsLoadingNotifications(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const notificationsData = await response.json();
        setNotifications(notificationsData);
      } else {
        console.error('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      // Reload notifications from server to ensure state is in sync
      if (response.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      // Reload notifications from server to ensure state is in sync
      if (response.ok) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    // Validate input
    if (!dateString) {
      console.error('formatRelativeTime: dateString is null or undefined');
      return 'Unknown date';
    }

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('formatRelativeTime: Invalid date string:', dateString);
      return 'Unknown date';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => n.isRead === false).length;

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

  // Filter menu items by user role
  const filterMenuItemsByRole = (items: MenuItem[], userRole: string): MenuItem[] => {
    return items
      .filter(item => !item.roles || item.roles.includes(userRole))
      .map(item => ({
        ...item,
        children: item.children ? filterMenuItemsByRole(item.children, userRole) : undefined
      }))
      .filter(item => !item.children || item.children.length > 0); // Remove parent items with no accessible children
  };

  // Check if a menu item or any of its children is active
  const isMenuItemOrChildActive = (item: MenuItem): boolean => {
    if (item.path === pathname) return true;
    if (item.children) {
      return item.children.some(child => isMenuItemOrChildActive(child));
    }
    return false;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // if (!session) {
  //   return null;
  // }

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
            {onSearch && (
              <div className="relative flex items-center">
                <svg className="absolute left-3 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  className="pl-10 pr-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 w-72 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {headerActions}

            {/* Notification Menu */}
            <div className="relative" data-notification-dropdown>
              <button
                className="relative p-2 text-gray-500 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className={`absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-80 z-50 transition-all duration-200 ${notificationDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${notification.isRead === false ? 'bg-blue-50' : ''
                          }`}
                        onClick={async () => {
                          // Mark as read if unread
                          if (notification.isRead === false) {
                            await markNotificationAsRead(notification.id);
                          }

                          // Close dropdown
                          setNotificationDropdownOpen(false);

                          // Navigate to the task detail page if notification has taskId
                          if (notification.relatedTaskId) {
                            router.push(`/tasks/${notification.relatedTaskId}`);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.type === 'task_assigned' ? 'bg-green-500' :
                            notification.type === 'task_unassigned' ? 'bg-gray-500' :
                              notification.type === 'task_reassigned' ? 'bg-orange-500' :
                                notification.type === 'comment_mention' ? 'bg-yellow-500' :
                                  notification.type === 'task_status_updated' ? 'bg-purple-500' :
                                    'bg-blue-500'
                            }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2 break-words">
                              {stripHtml(notification.message)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatRelativeTime(notification.timestamp)}
                            </p>
                          </div>
                          {notification.isRead === false && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h5v12z" />
                      </svg>
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-200 space-y-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="w-full text-center text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button
                      onClick={() => {
                        router.push('/notifications');
                        setNotificationDropdownOpen(false);
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="relative" data-user-dropdown>
              {session ? <button
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                {session ? session.user?.image ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-900">
                    {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                  </div>
                ) : null}

                {session ? <>
                  <span className="text-sm text-gray-900 font-medium">{session.user?.name || session.user?.email}</span>
                  <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </> : null}

              </button> : <Link onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

              }} href="/login">Login</Link>}
              <div className={`absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg min-w-[180px] py-2 z-50 transition-all duration-200 ${userDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                  onClick={() => {
                    router.push('/live/studio');
                    setUserDropdownOpen(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Z" />
                  </svg>
                  Go Live
                </button>
                <div className='border-b border-gray-200'></div>
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                  onClick={() => {
                    router.push('/profile');
                    setUserDropdownOpen(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Profile
                </button>
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                  onClick={async () => {
                    setUserDropdownOpen(false);
                    // Clear session and redirect to home
                    await signOut({
                      callbackUrl: '/',
                      redirect: true
                    });
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}