import { prisma } from '@/lib/prisma';
import {
  sendTaskAssignmentEmail,
  sendTaskUnassignmentEmail,
  sendTaskReassignmentEmail,
  sendCommentMentionEmail,
  sendDueDateReminderEmail,
  sendOverdueTaskEmail,
} from '@/lib/email';

interface CreateNotificationParams {
  userId: string;
  type: 'task_assigned' | 'task_unassigned' | 'task_reassigned' | 'comment_mention' | 'task_due_reminder' | 'task_overdue';
  title: string;
  message: string;
  taskId?: number;
  commentId?: number;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        taskId: params.taskId || null,
        commentId: params.commentId || null
      }
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Helper function to check if user has email notifications enabled
async function shouldSendEmail(userId: string): Promise<{ enabled: boolean; email?: string; name?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserExtension: true,
      },
    });

    if (!user || !user.email) {
      return { enabled: false };
    }

    const emailEnabled = true;

    return {
      enabled: emailEnabled,
      email: user.email,
      name: user.name || user.email,
    };
  } catch (error) {
    console.error('Error checking email preferences:', error);
    return { enabled: false };
  }
}

export async function createTaskAssignmentNotification(
  assigneeId: string,
  taskId: number,
  taskName: string,
  taskDescription: string = '',
  priority: string = 'medium',
  deadline?: string
) {
  // Create in-app notification
  const notification = await createNotification({
    userId: assigneeId,
    type: 'task_assigned',
    title: 'New task assigned',
    message: `You have been assigned to task #${taskId}: "${taskName}"`,
    taskId
  });

  // Send email if user has enabled email notifications
  const emailPrefs = await shouldSendEmail(assigneeId);
  if (emailPrefs.enabled && emailPrefs.email && emailPrefs.name) {
    await sendTaskAssignmentEmail(
      emailPrefs.email,
      emailPrefs.name,
      taskId,
      taskName,
      taskDescription,
      priority,
      deadline
    ).catch(error => {
      console.error('Failed to send task assignment email:', error);
      // Don't fail the notification if email fails
    });
  }

  return notification;
}

export async function createTaskUnassignmentNotification(
  previousAssigneeId: string,
  taskId: number,
  taskName: string
) {
  // Create in-app notification
  const notification = await createNotification({
    userId: previousAssigneeId,
    type: 'task_unassigned',
    title: 'Task unassigned',
    message: `You have been unassigned from task #${taskId}: "${taskName}"`,
    taskId
  });

  // Send email if user has enabled email notifications
  const emailPrefs = await shouldSendEmail(previousAssigneeId);
  if (emailPrefs.enabled && emailPrefs.email && emailPrefs.name) {
    await sendTaskUnassignmentEmail(
      emailPrefs.email,
      emailPrefs.name,
      taskId,
      taskName
    ).catch(error => {
      console.error('Failed to send task unassignment email:', error);
    });
  }

  return notification;
}

export async function createTaskReassignmentNotification(
  previousAssigneeId: string,
  newAssigneeId: string,
  taskId: number,
  taskName: string
) {
  const notifications = [];

  // Notify previous assignee
  notifications.push(createNotification({
    userId: previousAssigneeId,
    type: 'task_reassigned',
    title: 'Task reassigned',
    message: `Task #${taskId}: "${taskName}" has been reassigned to someone else`,
    taskId
  }));

  // Notify new assignee
  notifications.push(createNotification({
    userId: newAssigneeId,
    type: 'task_assigned',
    title: 'New task assigned',
    message: `You have been assigned to task #${taskId}: "${taskName}"`,
    taskId
  }));

  // Send emails if users have enabled email notifications
  const [previousEmailPrefs, newEmailPrefs] = await Promise.all([
    shouldSendEmail(previousAssigneeId),
    shouldSendEmail(newAssigneeId)
  ]);

  // Email to previous assignee
  if (previousEmailPrefs.enabled && previousEmailPrefs.email && previousEmailPrefs.name) {
    await sendTaskReassignmentEmail(
      previousEmailPrefs.email,
      previousEmailPrefs.name,
      taskId,
      taskName,
      false // isNewAssignee = false
    ).catch(error => {
      console.error('Failed to send task reassignment email to previous assignee:', error);
    });
  }

  // Email to new assignee
  if (newEmailPrefs.enabled && newEmailPrefs.email && newEmailPrefs.name) {
    await sendTaskReassignmentEmail(
      newEmailPrefs.email,
      newEmailPrefs.name,
      taskId,
      taskName,
      true // isNewAssignee = true
    ).catch(error => {
      console.error('Failed to send task reassignment email to new assignee:', error);
    });
  }

  return Promise.all(notifications);
}

export async function createCommentMentionNotification(
  mentionedUserId: string,
  commentId: number,
  taskId: number,
  taskName: string,
  commentContent: string,
  commenterName: string
) {
  // Strip HTML and truncate the comment content for the notification
  const strippedContent = commentContent.replace(/<[^>]*>/g, '').trim();
  const truncatedContent = strippedContent.length > 100
    ? strippedContent.substring(0, 100) + '...'
    : strippedContent;

  // Create in-app notification
  const notification = await createNotification({
    userId: mentionedUserId,
    type: 'comment_mention',
    title: 'You were mentioned in a comment',
    message: `${commenterName} mentioned you in task #${taskId}: "${truncatedContent}"`,
    taskId,
    commentId
  });

  // Send email if user has enabled email notifications
  const emailPrefs = await shouldSendEmail(mentionedUserId);
  if (emailPrefs.enabled && emailPrefs.email && emailPrefs.name) {
    await sendCommentMentionEmail(
      emailPrefs.email,
      emailPrefs.name,
      taskId,
      taskName,
      commenterName,
      commentContent
    ).catch(error => {
      console.error('Failed to send comment mention email:', error);
    });
  }

  return notification;
}

export async function getUsersFromMentions(content: string): Promise<string[]> {
  // Extract user IDs from mention tags in the content
  // Updated regex to handle multiple classes in the class attribute
  const mentionRegex = /<span[^>]*class="[^"]*mention-tag[^"]*"[^>]*data-user-id="([^"]*)"[^>]*>/g;
  const userIds: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const userId = match[1];
    if (userId && !userIds.includes(userId)) {
      userIds.push(userId);
    }
  }

  return userIds;
}