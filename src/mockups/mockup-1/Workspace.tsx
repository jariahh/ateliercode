import { Play, Pause, FileCode, MessageSquare, CheckSquare, FolderOpen, FileText, Activity } from "lucide-react";

export default function Workspace() {
  return (
    <div className="flex h-screen bg-base-100">
      {/* Sidebar */}
      <div className="w-64 bg-base-200 border-r border-base-300 flex flex-col">
        <div className="p-4 border-b border-base-300">
          <h2 className="text-xl font-bold">AtelierCode</h2>
          <p className="text-sm text-base-content/60 mt-1">Restaurant Review App</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <button className="btn btn-sm btn-primary w-full justify-start gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </button>
            <button className="btn btn-sm btn-ghost w-full justify-start gap-2">
              <FileCode className="w-4 h-4" />
              Changes (3)
            </button>
            <button className="btn btn-sm btn-ghost w-full justify-start gap-2">
              <CheckSquare className="w-4 h-4" />
              Tasks
            </button>
            <button className="btn btn-sm btn-ghost w-full justify-start gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button className="btn btn-sm btn-ghost w-full justify-start gap-2">
              <FolderOpen className="w-4 h-4" />
              Files
            </button>
            <button className="btn btn-sm btn-ghost w-full justify-start gap-2">
              <FileText className="w-4 h-4" />
              PRD
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-base-300">
          <div className="text-xs text-base-content/60">
            <div className="flex items-center gap-2 mb-2">
              <div className="badge badge-success badge-xs"></div>
              <span>Claude Code Running</span>
            </div>
            <div>Project: /Users/me/restaurant-app</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-base-100 border-b border-base-300 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Overview</h1>
            <div className="badge badge-outline">MVP Phase</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm btn-ghost gap-2">
              <Play className="w-4 h-4" />
              Start Task
            </button>
            <button className="btn btn-sm btn-ghost gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Agent Status Card */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">Agent Status</h2>
                <div className="flex items-center gap-4">
                  <div className="radial-progress text-primary" style={{"--value": 65} as React.CSSProperties}>65%</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Implementing JWT authentication</p>
                    <p className="text-xs text-base-content/60 mt-1">Working on src/auth/jwt.ts</p>
                    <progress className="progress progress-primary w-full mt-2" value="65" max="100"></progress>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Files Changed</div>
                <div className="stat-value text-primary">12</div>
                <div className="stat-desc">+3 from yesterday</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Tests Passing</div>
                <div className="stat-value text-success">24/25</div>
                <div className="stat-desc">96% pass rate</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Tasks Done</div>
                <div className="stat-value text-accent">8/15</div>
                <div className="stat-desc">53% complete</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Time Active</div>
                <div className="stat-value text-info">2.3h</div>
                <div className="stat-desc">Today</div>
              </div>
            </div>

            {/* Needs Attention */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">Needs Attention</h2>
                <div className="space-y-3">
                  <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>3 files waiting for review</span>
                    <button className="btn btn-sm">Review</button>
                  </div>
                  <div className="alert alert-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>1 test failing in auth.test.ts</span>
                    <button className="btn btn-sm">View</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">Recent Activity</h2>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="badge badge-success">✓</div>
                    <div className="flex-1">
                      <p className="font-medium">Created JWT middleware</p>
                      <p className="text-base-content/60 text-xs">src/middleware/auth.ts • 2 min ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="badge badge-info">→</div>
                    <div className="flex-1">
                      <p className="font-medium">Modified User model</p>
                      <p className="text-base-content/60 text-xs">src/models/User.ts • 5 min ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="badge badge-warning">!</div>
                    <div className="flex-1">
                      <p className="font-medium">Test failed: auth validation</p>
                      <p className="text-base-content/60 text-xs">tests/auth.test.ts • 8 min ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
