import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify SMTP connection (optional, for debugging)
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email server connection error:', error);
    return false;
  }
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    // Check if email is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('Email not configured. Skipping email send.');
      return { success: false, error: 'Email not configured' };
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Task Management App" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '', // Plain text fallback
      html: options.html,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// HTML Email Template Base
function getEmailTemplate(content: string, title: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
    }
    .notification-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notification-box h2 {
      margin: 0 0 10px 0;
      font-size: 18px;
      color: #667eea;
    }
    .notification-box p {
      margin: 5px 0;
      color: #555;
    }
    .task-details {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    .task-details h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #333;
    }
    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #666;
      min-width: 100px;
    }
    .detail-value {
      color: #333;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-priority-high {
      background: #fee;
      color: #c33;
    }
    .badge-priority-medium {
      background: #fef3cd;
      color: #856404;
    }
    .badge-priority-low {
      background: #e7f3ff;
      color: #004085;
    }
    .badge-status {
      background: #e0e0e0;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Task Management App</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>You received this email because you have email notifications enabled for your account.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/profile">Manage your notification preferences</a></p>
      <p style="margin-top: 15px; color: #999;">© ${new Date().getFullYear()} Task Management App. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Task Assignment Email
export async function sendTaskAssignmentEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string,
  taskDescription: string,
  priority: string,
  deadline?: string
) {
  const priorityBadge = `<span class="badge badge-priority-${priority.toLowerCase()}">${priority}</span>`;
  const deadlineText = deadline ? `<div class="detail-row"><span class="detail-label">Deadline:</span><span class="detail-value">${new Date(deadline).toLocaleDateString()}</span></div>` : '';

  const content = `
    <div class="notification-box">
      <h2>🎯 New Task Assigned</h2>
      <p>Hi ${userName},</p>
      <p>You have been assigned to a new task.</p>
    </div>

    <div class="task-details">
      <h3>${taskName}</h3>
      <p style="color: #666; margin: 10px 0;">${taskDescription}</p>

      <div class="detail-row">
        <span class="detail-label">Task ID:</span>
        <span class="detail-value">#${taskId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priority:</span>
        <span class="detail-value">${priorityBadge}</span>
      </div>
      ${deadlineText}
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}" class="button">View Task Details</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">Click the button above to view the full task details and get started!</p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `New Task Assigned: ${taskName}`,
    html: getEmailTemplate(content, 'New Task Assigned'),
    text: `Hi ${userName}, You have been assigned to task #${taskId}: "${taskName}". Priority: ${priority}. View at: ${process.env.NEXTAUTH_URL}/tasks/${taskId}`,
  });
}

// Task Unassignment Email
export async function sendTaskUnassignmentEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string
) {
  const content = `
    <div class="notification-box">
      <h2>ℹ️ Task Unassigned</h2>
      <p>Hi ${userName},</p>
      <p>You have been unassigned from a task.</p>
    </div>

    <div class="task-details">
      <h3>${taskName}</h3>
      <div class="detail-row">
        <span class="detail-label">Task ID:</span>
        <span class="detail-value">#${taskId}</span>
      </div>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">This task is no longer assigned to you.</p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Task Unassigned: ${taskName}`,
    html: getEmailTemplate(content, 'Task Unassigned'),
    text: `Hi ${userName}, You have been unassigned from task #${taskId}: "${taskName}".`,
  });
}

// Task Reassignment Email
export async function sendTaskReassignmentEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string,
  isNewAssignee: boolean
) {
  if (isNewAssignee) {
    // For the new assignee, send the assignment email
    return sendTaskAssignmentEmail(userEmail, userName, taskId, taskName, '', 'medium');
  } else {
    // For the previous assignee
    const content = `
      <div class="notification-box">
        <h2>🔄 Task Reassigned</h2>
        <p>Hi ${userName},</p>
        <p>A task has been reassigned to someone else.</p>
      </div>

      <div class="task-details">
        <h3>${taskName}</h3>
        <div class="detail-row">
          <span class="detail-label">Task ID:</span>
          <span class="detail-value">#${taskId}</span>
        </div>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">This task has been reassigned to another team member.</p>
    `;

    return sendEmail({
      to: userEmail,
      subject: `Task Reassigned: ${taskName}`,
      html: getEmailTemplate(content, 'Task Reassigned'),
      text: `Hi ${userName}, Task #${taskId}: "${taskName}" has been reassigned to someone else.`,
    });
  }
}

// Comment Mention Email
export async function sendCommentMentionEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string,
  commenterName: string,
  commentContent: string
) {
  // Strip HTML tags and truncate
  const strippedContent = commentContent.replace(/<[^>]*>/g, '').trim();
  const truncatedContent = strippedContent.length > 200
    ? strippedContent.substring(0, 200) + '...'
    : strippedContent;

  const content = `
    <div class="notification-box">
      <h2>💬 You were mentioned in a comment</h2>
      <p>Hi ${userName},</p>
      <p><strong>${commenterName}</strong> mentioned you in a comment on task: <strong>${taskName}</strong></p>
    </div>

    <div class="task-details">
      <h3>Comment Preview</h3>
      <p style="color: #666; font-style: italic; padding: 15px; background: #f8f9fa; border-radius: 4px; margin: 10px 0;">
        "${truncatedContent}"
      </p>

      <div class="detail-row">
        <span class="detail-label">Task ID:</span>
        <span class="detail-value">#${taskId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">From:</span>
        <span class="detail-value">${commenterName}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}#comments" class="button">View Comment</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">Click the button above to view the full comment and reply.</p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `${commenterName} mentioned you in a comment`,
    html: getEmailTemplate(content, 'You were mentioned'),
    text: `Hi ${userName}, ${commenterName} mentioned you in a comment on task #${taskId}: "${taskName}". Comment: "${truncatedContent}". View at: ${process.env.NEXTAUTH_URL}/tasks/${taskId}#comments`,
  });
}

// Due Date Reminder Email
export async function sendDueDateReminderEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string,
  dueDate: string,
  description: string,
  priority: string,
  daysBefore: number
) {
  const priorityBadge = `<span class="badge badge-priority-${priority.toLowerCase()}">${priority}</span>`;
  const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const urgencyMessage = daysBefore === 1
    ? 'This task is due <strong>tomorrow</strong>!'
    : `This task is due in <strong>${daysBefore} days</strong>!`;

  const content = `
    <div class="notification-box" style="background: #fff8e1; border-left-color: #ffa726;">
      <h2>⏰ Task Due Soon</h2>
      <p>Hi ${userName},</p>
      <p>${urgencyMessage}</p>
    </div>

    <div class="task-details">
      <h3>${taskName}</h3>
      <p style="color: #666; margin: 10px 0;">${description}</p>

      <div class="detail-row">
        <span class="detail-label">Task ID:</span>
        <span class="detail-value">#${taskId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priority:</span>
        <span class="detail-value">${priorityBadge}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date:</span>
        <span class="detail-value" style="color: #f57c00; font-weight: 600;">${formattedDate}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}" class="button" style="background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);">View Task</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      Make sure to complete this task before the deadline to stay on track!
    </p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `⏰ Reminder: "${taskName}" is due ${daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`}`,
    html: getEmailTemplate(content, 'Task Due Soon'),
    text: `Hi ${userName}, Reminder: Task #${taskId} "${taskName}" is due ${daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`} on ${formattedDate}. Priority: ${priority}. View at: ${process.env.NEXTAUTH_URL}/tasks/${taskId}`,
  });
}

// Task Status Update Email
export async function sendTaskStatusUpdateEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string,
  oldStatus: string,
  newStatus: string,
  updatedBy: string,
  taskGroupName: string,
  isOwner: boolean
) {
  // Format status labels for display
  const formatStatus = (status: string) => {
    return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formattedOldStatus = formatStatus(oldStatus);
  const formattedNewStatus = formatStatus(newStatus);

  // Status color mapping
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'todo': '#757575',
      'in-progress': '#1976d2',
      'review': '#f57c00',
      'completed': '#388e3c'
    };
    return colorMap[status] || '#757575';
  };

  const recipientRole = isOwner ? 'task group owner' : 'assignee';

  const content = `
    <div class="notification-box">
      <h2>🔄 Task Status Updated</h2>
      <p>Hi ${userName},</p>
      <p>A task has been updated. You're receiving this notification as the <strong>${recipientRole}</strong>.</p>
    </div>

    <div class="task-details">
      <h3>${taskName}</h3>

      <div class="detail-row">
        <span class="detail-label">Task ID:</span>
        <span class="detail-value">#${taskId}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Task Group:</span>
        <span class="detail-value">${taskGroupName}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Updated By:</span>
        <span class="detail-value">${updatedBy}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Previous Status:</span>
        <span class="detail-value">
          <span class="badge badge-status" style="background-color: ${getStatusColor(oldStatus)}20; color: ${getStatusColor(oldStatus)};">
            ${formattedOldStatus}
          </span>
        </span>
      </div>

      <div class="detail-row">
        <span class="detail-label">New Status:</span>
        <span class="detail-value">
          <span class="badge badge-status" style="background-color: ${getStatusColor(newStatus)}20; color: ${getStatusColor(newStatus)}; font-weight: 700;">
            ${formattedNewStatus}
          </span>
        </span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}" class="button">View Task Details</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      Click the button above to view the full task details and any updates.
    </p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Task Status Updated: ${taskName} → ${formattedNewStatus}`,
    html: getEmailTemplate(content, 'Task Status Updated'),
    text: `Hi ${userName}, Task #${taskId} "${taskName}" status has been updated from "${formattedOldStatus}" to "${formattedNewStatus}" by ${updatedBy}. You're receiving this as the ${recipientRole}. View at: ${process.env.NEXTAUTH_URL}/tasks/${taskId}`,
  });
}

// Task Date Update Email
export async function sendTaskDateUpdateEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string,
  dateType: 'startDate' | 'deadline',
  oldDate: string | null,
  newDate: string | null,
  updatedBy: string,
  taskGroupName: string,
  isOwner: boolean
) {
  // Format dates for display
  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formattedOldDate = formatDate(oldDate);
  const formattedNewDate = formatDate(newDate);
  const dateLabel = dateType === 'startDate' ? 'Start Date' : 'Deadline';
  const recipientRole = isOwner ? 'task group owner' : 'assignee';

  // Determine the icon and color based on the type of change
  const isDeadline = dateType === 'deadline';
  const isRemoved = !newDate;
  const isAdded = !oldDate && newDate;

  const iconColor = isDeadline ? '#f57c00' : '#1976d2';
  const emoji = isDeadline ? '📅' : '🗓️';

  const content = `
    <div class="notification-box" style="${isDeadline ? 'background: #fff8e1; border-left-color: #f57c00;' : ''}">
      <h2>${emoji} Task ${dateLabel} ${isRemoved ? 'Removed' : isAdded ? 'Set' : 'Updated'}</h2>
      <p>Hi ${userName},</p>
      <p>A task ${dateType === 'startDate' ? 'start date' : 'deadline'} has been ${isRemoved ? 'removed' : isAdded ? 'set' : 'updated'}. You're receiving this notification as the <strong>${recipientRole}</strong>.</p>
    </div>

    <div class="task-details">
      <h3>${taskName}</h3>

      <div class="detail-row">
        <span class="detail-label">Task ID:</span>
        <span class="detail-value">#${taskId}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Task Group:</span>
        <span class="detail-value">${taskGroupName}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Updated By:</span>
        <span class="detail-value">${updatedBy}</span>
      </div>

      ${!isAdded ? `
      <div class="detail-row">
        <span class="detail-label">Previous ${dateLabel}:</span>
        <span class="detail-value" style="color: #666;">
          ${formattedOldDate}
        </span>
      </div>
      ` : ''}

      <div class="detail-row">
        <span class="detail-label">New ${dateLabel}:</span>
        <span class="detail-value" style="color: ${iconColor}; font-weight: 700;">
          ${formattedNewDate}
        </span>
      </div>
    </div>

    ${isDeadline && newDate && !isRemoved ? `
    <div style="background: #fff8e1; border: 1px solid #f57c00; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="color: #e65100; font-weight: 600; margin: 0 0 8px 0; font-size: 14px;">⏰ Deadline Set</p>
      <p style="color: #ef6c00; margin: 0; font-size: 14px;">
        Make sure to complete this task by ${formattedNewDate}.
      </p>
    </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}" class="button">View Task Details</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      Click the button above to view the full task details and plan accordingly.
    </p>
  `;

  const changeType = isRemoved ? 'Removed' : isAdded ? 'Set' : 'Updated';

  return sendEmail({
    to: userEmail,
    subject: `Task ${dateLabel} ${changeType}: ${taskName}`,
    html: getEmailTemplate(content, `Task ${dateLabel} ${changeType}`),
    text: `Hi ${userName}, Task #${taskId} "${taskName}" ${dateType === 'startDate' ? 'start date' : 'deadline'} has been ${isRemoved ? 'removed' : isAdded ? 'set to' : 'updated to'} ${formattedNewDate} by ${updatedBy}. You're receiving this as the ${recipientRole}. View at: ${process.env.NEXTAUTH_URL}/tasks/${taskId}`,
  });
}

// Overdue Task Email
export async function sendOverdueTaskEmail(
  userEmail: string,
  userName: string,
  taskId: number,
  taskName: string,
  daysOverdue: number,
  description: string,
  priority: string
) {
  const priorityBadge = `<span class="badge badge-priority-${priority.toLowerCase()}">${priority}</span>`;
  const overdueMessage = daysOverdue === 1
    ? 'This task is <strong>1 day overdue</strong>!'
    : `This task is <strong>${daysOverdue} days overdue</strong>!`;

  const content = `
    <div class="notification-box" style="background: #ffebee; border-left-color: #e53935;">
      <h2>🚨 Task Overdue</h2>
      <p>Hi ${userName},</p>
      <p>${overdueMessage}</p>
    </div>

    <div class="task-details">
      <h3>${taskName}</h3>
      <p style="color: #666; margin: 10px 0;">${description}</p>

      <div class="detail-row">
        <span class="detail-label">Task ID:</span>
        <span class="detail-value">#${taskId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priority:</span>
        <span class="detail-value">${priorityBadge}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status:</span>
        <span class="detail-value" style="color: #c62828; font-weight: 600;">
          ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue
        </span>
      </div>
    </div>

    <div style="background: #ffebee; border: 1px solid #ef5350; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="color: #c62828; font-weight: 600; margin: 0 0 8px 0; font-size: 14px;">⚠️ Action Required</p>
      <p style="color: #d32f2f; margin: 0; font-size: 14px;">
        This task has passed its deadline. Please complete it as soon as possible or update its status.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/tasks/${taskId}" class="button" style="background: linear-gradient(135deg, #e53935 0%, #c62828 100%);">View Task Now</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      If this task is complete, please update its status in the system.
    </p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `🚨 Overdue: "${taskName}" (${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue)`,
    html: getEmailTemplate(content, 'Task Overdue'),
    text: `Hi ${userName}, Task #${taskId} "${taskName}" is ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue! Priority: ${priority}. Please complete it as soon as possible. View at: ${process.env.NEXTAUTH_URL}/tasks/${taskId}`,
  });
}

// Design Comment Notification Email (for task owners and assignees)
export async function sendDesignCommentNotificationEmail(
  userEmail: string,
  userName: string,
  designId: number,
  designName: string,
  commenterName: string,
  commentContent: string,
  recipientRole: 'owner' | 'assignee',
  taskId?: number,
  taskName?: string
) {
  // Strip HTML for plain text and truncate
  const plainContent = commentContent.replace(/<[^>]*>/g, '').trim();
  const truncatedContent = plainContent.length > 150
    ? plainContent.substring(0, 150) + '...'
    : plainContent;

  const roleText = recipientRole === 'owner' ? 'task group owner' : 'assignee';
  const designUrl = taskId
    ? `${process.env.NEXTAUTH_URL}/design-review?type=attachment&id=${designId}`
    : `${process.env.NEXTAUTH_URL}/design-review?type=design&id=${designId}`;

  const content = `
    <div class="notification-box" style="background: #e8f5e9; border-left-color: #66bb6a;">
      <h2>💬 New Comment on Design</h2>
      <p>Hi ${userName},</p>
      <p><strong>${commenterName}</strong> left a comment on <strong>${designName}</strong></p>
      ${taskId && taskName ? `<p style="color: #666; font-size: 14px;">From task: ${taskName}</p>` : ''}
      <p style="color: #666; font-size: 14px;">You're receiving this as the ${roleText}.</p>
    </div>

    <div class="task-details">
      <h3 style="margin-bottom: 15px;">Comment:</h3>
      <div style="background: #f5f5f5; border-left: 4px solid #66bb6a; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="color: #333; margin: 0; white-space: pre-wrap;">${truncatedContent}</p>
      </div>

      <div class="detail-row">
        <span class="detail-label">Design:</span>
        <span class="detail-value">${designName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Commented by:</span>
        <span class="detail-value">${commenterName}</span>
      </div>
      ${taskId && taskName ? `
      <div class="detail-row">
        <span class="detail-label">Task:</span>
        <span class="detail-value">#${taskId} - ${taskName}</span>
      </div>
      ` : ''}
    </div>

    <div style="text-align: center;">
      <a href="${designUrl}" class="button">View Design & Reply</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      Click the button above to view the design and respond to the comment.
    </p>
  `;

  return sendEmail({
    to: userEmail,
    subject: `💬 New comment on "${designName}" by ${commenterName}`,
    html: getEmailTemplate(content, 'New Design Comment'),
    text: `Hi ${userName}, ${commenterName} commented on ${designName}: "${truncatedContent}". View at: ${designUrl}`,
  });
}
