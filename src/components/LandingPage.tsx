import Link from 'next/link';
import {
  CheckCircle2,
  Users,
  Calendar,
  BarChart3,
  Bell,
  FileText,
  Layers,
  MessageSquare,
  Zap,
  Shield,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
              Manage Tasks, Build Teams,
              <span className="block text-blue-600">Achieve More Together</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500">
              A powerful task management platform with team collaboration,
              multiple views, and real-time notifications. Everything you need
              to keep your projects on track.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Everything You Need to Succeed
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful features designed for modern teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1: Task Management */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Advanced Task Management
            </h3>
            <p className="text-gray-600">
              Create, assign, and track tasks with priorities, deadlines, and custom statuses.
              Organize work with task groups and projects.
            </p>
          </div>

          {/* Feature 2: Kanban Board */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Layers className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Drag & Drop Kanban
            </h3>
            <p className="text-gray-600">
              Visualize your workflow with an intuitive Kanban board.
              Drag tasks between columns to update their status instantly.
            </p>
          </div>

          {/* Feature 3: Team Collaboration */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Team Collaboration
            </h3>
            <p className="text-gray-600">
              Add team members to projects, assign tasks, and collaborate with comments
              and @mentions in a rich text editor.
            </p>
          </div>

          {/* Feature 4: Multiple Views */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Multiple Views
            </h3>
            <p className="text-gray-600">
              Switch between Kanban boards, Calendar view, and Gantt charts
              to visualize your work the way you prefer.
            </p>
          </div>

          {/* Feature 5: Real-time Notifications */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Real-time Notifications
            </h3>
            <p className="text-gray-600">
              Stay informed with notifications for task assignments, comments,
              @mentions, deadlines, and project updates.
            </p>
          </div>

          {/* Feature 6: Reports & Analytics */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Reports & Analytics
            </h3>
            <p className="text-gray-600">
              Generate comprehensive reports with advanced filtering.
              Export data to Excel for deeper analysis and insights.
            </p>
          </div>

          {/* Feature 7: File Management */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              File Attachments
            </h3>
            <p className="text-gray-600">
              Upload and attach files to tasks with cloud storage integration.
              Preview, download, and manage documents easily.
            </p>
          </div>

          {/* Feature 8: Comments & Discussions */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-pink-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Rich Comments
            </h3>
            <p className="text-gray-600">
              Engage in threaded discussions with nested replies.
              Use rich text formatting and @mentions to collaborate effectively.
            </p>
          </div>

          {/* Feature 9: API Integration */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-cyan-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              API Integration
            </h3>
            <p className="text-gray-600">
              Generate API keys to integrate with external systems.
              Build custom workflows and automate your processes.
            </p>
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Why Teams Choose Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Secure & Reliable
              </h3>
              <p className="text-gray-600">
                Built with modern security practices and NextAuth authentication.
                Your data is safe and protected.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Fast & Responsive
              </h3>
              <p className="text-gray-600">
                Built with Next.js 15 and React 19 for lightning-fast performance
                on any device, anywhere.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Team-Focused
              </h3>
              <p className="text-gray-600">
                Designed for collaboration with features that keep teams connected,
                informed, and productive.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-xl text-blue-100">
            Join teams already using our platform to manage their work more effectively.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-blue-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-400">
            Built with Next.js 15, React 19, TypeScript, and PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
}
