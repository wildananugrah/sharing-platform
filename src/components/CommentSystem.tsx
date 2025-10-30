'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import RichText from '@/components/RichText';
import DisplayContent from '@/components/DisplayContent';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface AttachmentInfo {
  id: number;
  fileName: string;
  fileUrl: string;
}

interface Comment {
  id: number;
  taskId?: number;
  attachmentId?: number;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  user: User;
  commentType?: 'task' | 'attachment';
  attachmentInfo?: AttachmentInfo;
  replies?: Comment[];
  _count?: {
    replies: number;
  };
}

interface Attachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
}

interface CommentSystemProps {
  taskId: number;
}

type CommentFilter = 'all' | 'attachment' | 'non-attachment';

export default function CommentSystem({ taskId }: CommentSystemProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<CommentFilter>('all');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());

  const loadComments = async (currentFilter: CommentFilter = filter) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/all-comments?filter=${currentFilter}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttachments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  useEffect(() => {
    loadComments();
    loadAttachments();
  }, [taskId, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (newFilter: CommentFilter) => {
    setFilter(newFilter);
    loadComments(newFilter);
  };

  const handleAddComment = async () => {
    if (!newCommentContent.trim() || !session?.user?.id) return;

    try {
      setIsSubmittingComment(true);

      // If an attachment is selected, create an attachment comment
      if (selectedAttachmentId) {
        const response = await fetch(`/api/attachments/${selectedAttachmentId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newCommentContent,
          }),
        });

        if (response.ok) {
          await loadComments(); // Reload all comments
          setNewCommentContent('');
          setIsAddingComment(false);
          setSelectedAttachmentId(null);
        }
      } else {
        // Create regular task comment
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId,
            content: newCommentContent,
          }),
        });

        if (response.ok) {
          await loadComments(); // Reload all comments
          setNewCommentContent('');
          setIsAddingComment(false);
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number, commentType?: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      let response;
      if (commentType === 'attachment') {
        // Find which attachment this comment belongs to
        const comment = comments.find(c => c.id === commentId);
        if (comment?.attachmentId) {
          response = await fetch(`/api/attachments/${comment.attachmentId}/comments/${commentId}`, {
            method: 'DELETE',
          });
        }
      } else {
        response = await fetch(`/api/comments/${commentId}`, {
          method: 'DELETE',
        });
      }

      if (response?.ok) {
        await loadComments(); // Reload all comments
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) return;

    try {
      setIsSubmittingEdit(true);
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent,
        }),
      });

      if (response.ok) {
        await loadComments(); // Reload all comments
        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CommentItem = ({ comment }: { comment: Comment }) => {
    const isOwner = session?.user?.id === comment.userId;
    const isEditing = editingComment === comment.id;
    const isAttachmentComment = comment.commentType === 'attachment';

    return (
      <div className="mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {/* Attachment Indicator */}
          {isAttachmentComment && comment.attachmentInfo && (
            <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1.5 w-fit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <button
                onClick={() => router.push(`/design-review?id=${comment.attachmentInfo?.id}&type=attachment`)}
                className="hover:underline font-medium"
              >
                {comment.attachmentInfo.fileName}
              </button>
            </div>
          )}

          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {comment.user.name ? comment.user.name.charAt(0).toUpperCase() : comment.user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {comment.user.name || 'Unknown User'}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(comment.createdAt)}
                  {comment.updatedAt && comment.updatedAt !== comment.createdAt && ' (edited)'}
                </div>
              </div>
            </div>
            {isOwner && !isAttachmentComment && (
              <div className="flex gap-1">
                <button
                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  title="Edit"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  onClick={() => handleDeleteComment(comment.id, comment.commentType)}
                  title="Delete"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2v2"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mb-3">
              <RichText
                placeholder="Edit your comment..."
                onChange={setEditContent}
                initialContent={editContent}
                onExport={() => handleEditComment(comment.id)}
                onCancel={() => {
                  setEditingComment(null);
                  setEditContent('');
                }}
                enableMentions={true}
              />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none mb-3">
              <DisplayContent content={comment.content} />
            </div>
          )}

          {/* Replies Section */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => toggleReplies(comment.id)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>{expandedReplies.has(comment.id) ? '▼' : '▶'}</span>
                <span>{comment._count?.replies || comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
              </button>

              {expandedReplies.has(comment.id) && (
                <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-200 pl-3">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {reply.user.name ? reply.user.name.charAt(0).toUpperCase() : reply.user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-900">
                              {reply.user.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(reply.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <DisplayContent content={reply.content} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Filter Tabs */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
          <button
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setIsAddingComment(!isAddingComment)}
            disabled={isSubmittingComment}
          >
            {isSubmittingComment ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Add Comment
              </>
            )}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('non-attachment')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'non-attachment'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Task Comments
          </button>
          <button
            onClick={() => handleFilterChange('attachment')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'attachment'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Attachment Comments
          </button>
        </div>
      </div>

      {/* Add Comment Form */}
      {isAddingComment && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {/* Attachment Selector */}
          {attachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment on (optional):
              </label>
              <select
                value={selectedAttachmentId || ''}
                onChange={(e) => setSelectedAttachmentId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Task (general comment)</option>
                {attachments.map(attachment => (
                  <option key={attachment.id} value={attachment.id}>
                    📎 {attachment.fileName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <RichText
            placeholder={selectedAttachmentId ? "Write a comment about this attachment..." : "Write a comment..."}
            onChange={setNewCommentContent}
            initialContent=""
            onExport={handleAddComment}
            onCancel={() => {
              setIsAddingComment(false);
              setNewCommentContent('');
              setSelectedAttachmentId(null);
            }}
            enableMentions={true}
          />
        </div>
      )}

      {/* Comments List */}
      {isLoading && comments.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3 className="text-base font-semibold text-gray-900 mb-2">No comments yet</h3>
          <p className="mb-4">Be the first to add a comment to this task</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentItem key={`${comment.commentType}-${comment.id}`} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
