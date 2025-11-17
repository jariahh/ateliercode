import { Zap, Cpu, Code2, MessagesSquare, ListTodo, Folder, FileText, Activity } from "lucide-react";

export default function Workspace() {
  return (
    <div className="flex h-screen bg-base-100">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-primary to-secondary flex items-center px-6 z-10">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary-content" />
          <span className="text-xl font-black text-primary-content tracking-wider">ATELIERCODE</span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-3">
          <div className="badge badge-lg gap-2 bg-success/20 border-success text-success">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            AGENT ACTIVE
          </div>
          <div className="text-primary-content text-sm font-mono">23:47:12</div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex w-full pt-14">
        {/* Sidebar */}
        <div className="w-72 bg-gradient-to-b from-base-200 to-base-300 border-r-2 border-primary/30 flex flex-col">
          <div className="p-4 border-b-2 border-primary/30">
            <div className="text-xs font-mono text-primary mb-1">{'>'} PROJECT</div>
            <h2 className="text-lg font-bold text-primary">RESTAURANT_REVIEW_APP</h2>
            <div className="text-xs text-base-content/60 font-mono mt-1">/Users/me/projects/restaurant-app</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              <button className="btn btn-sm w-full justify-start gap-3 bg-primary text-primary-content border-2 border-primary hover:bg-primary/90">
                <Activity className="w-4 h-4" />
                <span className="font-mono font-bold">OVERVIEW</span>
              </button>
              <button className="btn btn-sm w-full justify-start gap-3 bg-base-300 border-2 border-warning/50 hover:bg-base-200">
                <Code2 className="w-4 h-4" />
                <span className="font-mono">CHANGES</span>
                <div className="badge badge-warning badge-sm">3</div>
              </button>
              <button className="btn btn-sm w-full justify-start gap-3 bg-base-300 border-2 border-base-content/20 hover:bg-base-200">
                <ListTodo className="w-4 h-4" />
                <span className="font-mono">TASKS</span>
                <div className="badge badge-info badge-sm">8/15</div>
              </button>
              <button className="btn btn-sm w-full justify-start gap-3 bg-base-300 border-2 border-base-content/20 hover:bg-base-200">
                <MessagesSquare className="w-4 h-4" />
                <span className="font-mono">CHAT</span>
              </button>
              <button className="btn btn-sm w-full justify-start gap-3 bg-base-300 border-2 border-base-content/20 hover:bg-base-200">
                <Folder className="w-4 h-4" />
                <span className="font-mono">FILES</span>
              </button>
              <button className="btn btn-sm w-full justify-start gap-3 bg-base-300 border-2 border-base-content/20 hover:bg-base-200">
                <FileText className="w-4 h-4" />
                <span className="font-mono">PRD</span>
              </button>
            </div>

            <div className="divider text-xs font-mono text-primary">AGENT STATUS</div>

            <div className="bg-base-300 rounded-lg p-3 border-2 border-primary/30 space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-mono font-bold">PROCESSING</span>
              </div>
              <div className="text-xs">
                <div className="font-mono text-base-content/80">Task: JWT_AUTH_IMPLEMENTATION</div>
                <div className="font-mono text-base-content/60 mt-1">File: src/auth/jwt.ts</div>
              </div>
              <progress className="progress progress-primary w-full" value="65" max="100"></progress>
              <div className="text-xs font-mono text-primary text-right">65% COMPLETE</div>
            </div>
          </div>

          <div className="p-3 border-t-2 border-primary/30 bg-base-300">
            <div className="text-xs font-mono space-y-1">
              <div className="text-success">{'>'} UPTIME: 2h 23m</div>
              <div className="text-info">{'>'} AGENT: CLAUDE_CODE_v2</div>
              <div className="text-warning">{'>'} STATUS: OPTIMAL</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6">
            {/* Hero Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/50 rounded-lg p-4">
                <div className="text-xs font-mono text-primary mb-1">FILES_MODIFIED</div>
                <div className="text-4xl font-black text-primary">12</div>
                <div className="text-xs text-base-content/60 font-mono mt-1">+3 TODAY</div>
              </div>
              <div className="bg-gradient-to-br from-success/20 to-success/5 border-2 border-success/50 rounded-lg p-4">
                <div className="text-xs font-mono text-success mb-1">TESTS_PASSING</div>
                <div className="text-4xl font-black text-success">24/25</div>
                <div className="text-xs text-base-content/60 font-mono mt-1">96% RATE</div>
              </div>
              <div className="bg-gradient-to-br from-warning/20 to-warning/5 border-2 border-warning/50 rounded-lg p-4">
                <div className="text-xs font-mono text-warning mb-1">TASKS_DONE</div>
                <div className="text-4xl font-black text-warning">8/15</div>
                <div className="text-xs text-base-content/60 font-mono mt-1">53% DONE</div>
              </div>
              <div className="bg-gradient-to-br from-info/20 to-info/5 border-2 border-info/50 rounded-lg p-4">
                <div className="text-xs font-mono text-info mb-1">TIME_ACTIVE</div>
                <div className="text-4xl font-black text-info">2.3h</div>
                <div className="text-xs text-base-content/60 font-mono mt-1">TODAY</div>
              </div>
            </div>

            {/* Alerts Section */}
            <div className="space-y-3">
              <div className="text-xs font-mono text-primary font-bold tracking-wider">{'>'} REQUIRES_ATTENTION</div>

              <div className="alert alert-warning border-2 border-warning shadow-lg shadow-warning/20">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="font-bold font-mono">CODE_REVIEW_PENDING</h3>
                    <div className="text-xs font-mono">3 files waiting: jwt.ts, User.ts, auth.routes.ts</div>
                  </div>
                </div>
                <button className="btn btn-sm btn-warning font-mono">REVIEW_NOW</button>
              </div>

              <div className="alert alert-error border-2 border-error shadow-lg shadow-error/20">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-bold font-mono">TEST_FAILURE_DETECTED</h3>
                    <div className="text-xs font-mono">auth.test.ts: Token validation failed</div>
                  </div>
                </div>
                <button className="btn btn-sm btn-error font-mono">INVESTIGATE</button>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="space-y-3">
              <div className="text-xs font-mono text-primary font-bold tracking-wider">{'>'} ACTIVITY_STREAM</div>

              <div className="bg-base-200 border-2 border-primary/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-base-300">
                  <div className="badge badge-success font-mono text-xs">CREATE</div>
                  <div className="flex-1">
                    <div className="font-mono font-bold text-sm">JWT_MIDDLEWARE_CREATED</div>
                    <div className="text-xs text-base-content/60 font-mono">src/middleware/auth.ts</div>
                    <div className="text-xs text-base-content/40 font-mono mt-1">TIMESTAMP: 14:45:23</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-3 border-b border-base-300">
                  <div className="badge badge-warning font-mono text-xs">MODIFY</div>
                  <div className="flex-1">
                    <div className="font-mono font-bold text-sm">USER_MODEL_UPDATED</div>
                    <div className="text-xs text-base-content/60 font-mono">src/models/User.ts</div>
                    <div className="text-xs text-base-content/40 font-mono mt-1">TIMESTAMP: 14:42:11</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="badge badge-error font-mono text-xs">ERROR</div>
                  <div className="flex-1">
                    <div className="font-mono font-bold text-sm">TEST_EXECUTION_FAILED</div>
                    <div className="text-xs text-base-content/60 font-mono">tests/auth.test.ts</div>
                    <div className="text-xs text-base-content/40 font-mono mt-1">TIMESTAMP: 14:39:47</div>
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
