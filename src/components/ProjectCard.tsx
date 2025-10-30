'use client';

import { useState, useEffect } from 'react';
import DropdownMenu, { DropdownMenuGroup } from './DropdownMenu';

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  deadline: string;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
}

interface ProjectCardProps {
  project: Project;
  onProjectClick: (project: Project) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: number) => void;
  onMembersClick?: (project: Project) => void;
  onSettingsClick?: (project: Project) => void;
  onCreatorClick?: (userId: string) => void;
  dropdownMenuGroups?: DropdownMenuGroup[];
  showDefaultActions?: boolean; // Whether to show default Edit/Delete actions
  taskProgress?: ProjectProgress; // Task progress data
}

export default function ProjectCard({
  project,
  onProjectClick,
  onEditProject,
  onDeleteProject,
  onMembersClick,
  onSettingsClick,
  onCreatorClick,
  dropdownMenuGroups,
  showDefaultActions = true,
  taskProgress,
}: ProjectCardProps) {
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const toggleDropdown = (projectId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdownId(openDropdownId === projectId ? null : projectId);
  };

  // Create default menu groups if not provided
  const getMenuGroups = (): DropdownMenuGroup[] => {
    if (dropdownMenuGroups) {
      return dropdownMenuGroups;
    }

    const groups: DropdownMenuGroup[] = [];

    // Primary actions group
    const primaryActions = [];
    if (onMembersClick) {
      primaryActions.push({
        id: 'members',
        label: 'Members',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="m22 21-3-3m0 0a5 5 0 0 0-7-7 5 5 0 0 0 7 7Z"></path>
          </svg>
        ),
        onClick: () => onMembersClick(project),
      });
    }

    if (onSettingsClick) {
      primaryActions.push({
        id: 'settings',
        label: 'Settings',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        ),
        onClick: () => onSettingsClick(project),
      });
    }

    if (primaryActions.length > 0) {
      groups.push({
        id: 'primary',
        items: primaryActions,
        separator: showDefaultActions && (!!onEditProject || !!onDeleteProject),
      });
    }

    // Default actions group (Edit/Delete)
    if (showDefaultActions) {
      const defaultActions = [];

      if (onEditProject) {
        defaultActions.push({
          id: 'edit',
          label: 'Edit Project',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          ),
          onClick: () => onEditProject(project),
        });
      }

      if (onDeleteProject) {
        defaultActions.push({
          id: 'delete',
          label: 'Delete Project',
          variant: 'danger' as const,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          ),
          onClick: () => onDeleteProject(project.id),
        });
      }

      if (defaultActions.length > 0) {
        groups.push({
          id: 'actions',
          items: defaultActions,
          separator: false,
        });
      }
    }

    return groups;
  };

  const formatStatus = (status: string) => {
    return status.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper function to strip HTML tags for preview text
  const stripHtml = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Helper function to truncate text for preview
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-5 cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
      onClick={() => onProjectClick(project)}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-base font-semibold text-gray-900 m-0">{project.name}</h3>
        <div className="relative dropdown-container">
          <button
            className="p-1 text-gray-500 rounded hover:bg-gray-100 hover:text-gray-900 transition-colors"
            onClick={(e) => toggleDropdown(project.id, e)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <DropdownMenu
            isOpen={openDropdownId === project.id}
            onClose={() => setOpenDropdownId(null)}
            groups={getMenuGroups()}
          />
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-4 h-10">{truncateText(stripHtml(project.description || 'No description available'))}</p>

      {/* Task Progress Bar */}
      {taskProgress && taskProgress.total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-700">Tasks Progress</span>
            <span className="text-xs text-gray-500">{taskProgress.completed}/{taskProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${taskProgress.percentage}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{taskProgress.percentage}% complete</div>
        </div>
      )}

      {/* Creator Information */}
      {project.user && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="text-xs text-gray-500 mb-1">Created by</div>
          <div
            className={`flex items-center gap-2 ${onCreatorClick ? 'cursor-pointer hover:bg-gray-100 rounded p-1 -m-1 transition-colors' : ''}`}
            onClick={onCreatorClick ? (e) => {
              e.stopPropagation();
              onCreatorClick(project.user!.id);
            } : undefined}
          >
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {project.user.name ? project.user.name.charAt(0).toUpperCase() : project.user.email.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs text-gray-700 font-medium">
              {project.user.name || project.user.email}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${project.status === 'planning' ? 'bg-blue-100 text-blue-600' :
          project.status === 'in-progress' ? 'bg-orange-100 text-orange-600' :
            project.status === 'review' ? 'bg-purple-100 text-purple-600' :
              'bg-green-100 text-green-600'
          }`}>
          {formatStatus(project.status)}
        </span>
        <span className="flex items-center gap-1 text-gray-500 text-xs">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {formatDate(project.deadline)}
        </span>
      </div>
    </div>
  );
}