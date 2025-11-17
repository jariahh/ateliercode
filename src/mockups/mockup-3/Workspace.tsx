import { ChevronDown, Plus, MoreHorizontal, Sparkles } from "lucide-react";

export default function Workspace() {
  return (
    <div className="flex h-screen bg-base-100">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-base-300 flex flex-col p-3 gap-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded w-8">
                <span className="text-xs">JR</span>
              </div>
            </div>
            <span className="font-medium text-sm">Jariah's Workspace</span>
          </div>
          <button className="btn btn-ghost btn-xs btn-square">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <button className="btn btn-sm btn-ghost justify-start gap-2">
          <Sparkles className="w-4 h-4" />
          New Project
        </button>

        <div className="divider my-1"></div>

        <div className="space-y-1 flex-1">
          <div className="text-xs font-semibold text-base-content/50 px-2 py-1">PROJECTS</div>

          <div className="bg-base-200 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-2">
              <ChevronDown className="w-4 h-4" />
              <span className="font-medium text-sm">Restaurant Review App</span>
            </div>
            <div className="pl-6 space-y-1 text-sm">
              <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer font-medium">
                Overview
              </div>
              <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer text-base-content/70">
                Changes
              </div>
              <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer text-base-content/70">
                Tasks
              </div>
              <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer text-base-content/70">
                Chat with Agent
              </div>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm btn-block justify-start gap-2 text-base-content/50">
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>

        <div className="text-xs text-base-content/50 p-2">
          Last synced: Just now
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb / Title Area */}
        <div className="px-16 pt-12 pb-6">
          <div className="flex items-center gap-2 text-sm text-base-content/50 mb-4">
            <span>Restaurant Review App</span>
            <span>/</span>
            <span className="text-base-content">Overview</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Project Overview</h1>
          <p className="text-base-content/60">Track your AI agent's progress and review changes</p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-16 pb-16">
          <div className="max-w-3xl space-y-8">
            {/* Agent Status Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">🤖 Agent Status</h2>
              <div className="bg-base-200 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="badge badge-success gap-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    Active
                  </div>
                  <span className="text-sm text-base-content/60">Working for 23 minutes</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">Current Task</div>
                    <div className="text-base-content/80">Implementing JWT authentication middleware</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Progress</div>
                    <progress className="progress progress-primary w-full" value="65" max="100"></progress>
                    <div className="text-xs text-base-content/60 mt-1">65% complete</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3">
                    <div>
                      <div className="text-xs text-base-content/60">Files Modified</div>
                      <div className="text-2xl font-semibold">12</div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/60">Tests Run</div>
                      <div className="text-2xl font-semibold">24/25</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Needs Your Attention */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">👀 Needs Your Attention</h2>
              <div className="space-y-3">
                <div className="border-l-4 border-warning bg-warning/10 rounded-r-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium mb-1">3 files ready for review</div>
                      <div className="text-sm text-base-content/70">
                        jwt.ts, User.ts, auth.routes.ts
                      </div>
                    </div>
                    <button className="btn btn-sm btn-warning">Review Now</button>
                  </div>
                </div>

                <div className="border-l-4 border-error bg-error/10 rounded-r-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium mb-1">1 test failing</div>
                      <div className="text-sm text-base-content/70">
                        auth.test.ts: Token validation test
                      </div>
                    </div>
                    <button className="btn btn-sm btn-error">View Details</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">📝 Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex gap-4 pb-4 border-b border-base-300">
                  <div className="text-base-content/40 text-sm pt-1">2m ago</div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">Created JWT middleware</div>
                    <div className="text-sm text-base-content/60">
                      Added token verification logic in src/middleware/auth.ts
                    </div>
                    <div className="flex gap-2 mt-2">
                      <div className="badge badge-sm badge-success">Added</div>
                      <div className="badge badge-sm badge-ghost">src/middleware/auth.ts</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pb-4 border-b border-base-300">
                  <div className="text-base-content/40 text-sm pt-1">5m ago</div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">Updated User model</div>
                    <div className="text-sm text-base-content/60">
                      Added password hashing and JWT token generation
                    </div>
                    <div className="flex gap-2 mt-2">
                      <div className="badge badge-sm badge-warning">Modified</div>
                      <div className="badge badge-sm badge-ghost">src/models/User.ts</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pb-4">
                  <div className="text-base-content/40 text-sm pt-1">8m ago</div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">Test suite executed</div>
                    <div className="text-sm text-base-content/60">
                      24 passing, 1 failing
                    </div>
                    <div className="flex gap-2 mt-2">
                      <div className="badge badge-sm badge-info">Tests</div>
                      <div className="text-xs text-base-content/60">96% pass rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button className="btn btn-outline justify-start gap-3 h-auto py-4">
                  <div className="text-2xl">💬</div>
                  <div className="text-left">
                    <div className="font-medium">Chat with Agent</div>
                    <div className="text-xs opacity-60">Give new instructions</div>
                  </div>
                </button>
                <button className="btn btn-outline justify-start gap-3 h-auto py-4">
                  <div className="text-2xl">📋</div>
                  <div className="text-left">
                    <div className="font-medium">View All Tasks</div>
                    <div className="text-xs opacity-60">8 of 15 complete</div>
                  </div>
                </button>
                <button className="btn btn-outline justify-start gap-3 h-auto py-4">
                  <div className="text-2xl">📁</div>
                  <div className="text-left">
                    <div className="font-medium">Browse Files</div>
                    <div className="text-xs opacity-60">Explore project structure</div>
                  </div>
                </button>
                <button className="btn btn-outline justify-start gap-3 h-auto py-4">
                  <div className="text-2xl">📄</div>
                  <div className="text-left">
                    <div className="font-medium">View PRD</div>
                    <div className="text-xs opacity-60">Product requirements</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
