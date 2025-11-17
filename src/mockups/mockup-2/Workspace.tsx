import { Terminal, Search, GitBranch, Bug, Play, Settings } from "lucide-react";

export default function Workspace() {
  return (
    <div className="flex h-screen bg-base-300">
      {/* Activity Bar (Far Left) */}
      <div className="w-12 bg-base-100 border-r border-base-300 flex flex-col items-center py-2 gap-2">
        <button className="btn btn-square btn-sm btn-primary">
          <Search className="w-4 h-4" />
        </button>
        <button className="btn btn-square btn-sm btn-ghost">
          <GitBranch className="w-4 h-4" />
        </button>
        <button className="btn btn-square btn-sm btn-ghost">
          <Bug className="w-4 h-4" />
        </button>
        <button className="btn btn-square btn-sm btn-ghost">
          <Terminal className="w-4 h-4" />
        </button>
        <div className="flex-1"></div>
        <button className="btn btn-square btn-sm btn-ghost">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-base-200 border-r border-base-300 flex flex-col">
        <div className="h-10 bg-base-100 border-b border-base-300 flex items-center px-3">
          <span className="text-xs font-semibold uppercase text-base-content/70">Explorer</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs space-y-1">
            <div className="font-semibold text-base-content/90 px-2 py-1">RESTAURANT-APP</div>

            <details open className="collapse collapse-arrow">
              <summary className="collapse-title min-h-0 py-1 px-2 text-xs font-medium">src/</summary>
              <div className="collapse-content pl-4 space-y-1">
                <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer">auth/</div>
                <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer bg-primary/20 text-primary">
                  → jwt.ts
                </div>
                <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer">models/</div>
                <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer">routes/</div>
                <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer">index.ts</div>
              </div>
            </details>

            <details className="collapse collapse-arrow">
              <summary className="collapse-title min-h-0 py-1 px-2 text-xs font-medium">tests/</summary>
            </details>

            <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer">package.json</div>
            <div className="hover:bg-base-300 px-2 py-1 rounded cursor-pointer">tsconfig.json</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Tab Bar */}
        <div className="h-10 bg-base-100 border-b border-base-300 flex items-center">
          <div className="tabs tabs-boxed tabs-xs bg-transparent">
            <a className="tab tab-active">src/auth/jwt.ts</a>
            <a className="tab">src/models/User.ts</a>
            <a className="tab">src/routes/auth.ts</a>
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2 px-4">
            <button className="btn btn-xs btn-success gap-1">
              <Play className="w-3 h-3" />
              Run
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex">
          {/* Code Editor */}
          <div className="flex-1 bg-base-200 overflow-auto">
            <div className="p-4 font-mono text-sm">
              <div className="space-y-1">
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">1</span>
                  <span><span className="text-purple-400">import</span> <span className="text-blue-400">jwt</span> <span className="text-purple-400">from</span> <span className="text-green-400">'jsonwebtoken'</span>;</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">2</span>
                  <span><span className="text-purple-400">import</span> <span className="text-blue-400">{'{'}Request, Response, NextFunction{'}'}</span> <span className="text-purple-400">from</span> <span className="text-green-400">'express'</span>;</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">3</span>
                  <span></span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">4</span>
                  <span><span className="text-purple-400">export</span> <span className="text-purple-400">const</span> <span className="text-yellow-400">verifyToken</span> = <span className="text-purple-400">async</span> (</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">5</span>
                  <span>  <span className="text-orange-400">req</span>: <span className="text-blue-400">Request</span>,</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">6</span>
                  <span>  <span className="text-orange-400">res</span>: <span className="text-blue-400">Response</span>,</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">7</span>
                  <span>  <span className="text-orange-400">next</span>: <span className="text-blue-400">NextFunction</span></span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">8</span>
                  <span>) =&gt; {'{'}</span>
                </div>
                <div className="flex gap-4 bg-warning/10">
                  <span className="text-base-content/40 w-8 text-right">9</span>
                  <span>  <span className="text-purple-400">const</span> token = req.<span className="text-yellow-400">headers</span>.<span className="text-yellow-400">authorization</span>?.<span className="text-yellow-400">split</span>(<span className="text-green-400">' '</span>)[<span className="text-blue-400">1</span>];</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">10</span>
                  <span>  </span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">11</span>
                  <span>  <span className="text-purple-400">if</span> (!token) {'{'}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">12</span>
                  <span>    <span className="text-purple-400">return</span> res.<span className="text-yellow-400">status</span>(<span className="text-blue-400">401</span>).<span className="text-yellow-400">json</span>({'{'} <span className="text-orange-400">error</span>: <span className="text-green-400">'No token provided'</span> {'}'});</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">13</span>
                  <span>  {'}'}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-base-content/40 w-8 text-right">14</span>
                  <span>{'}'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 bg-base-100 border-l border-base-300">
            <div className="h-10 border-b border-base-300 flex items-center px-3">
              <span className="text-xs font-semibold uppercase text-base-content/70">Agent Activity</span>
            </div>
            <div className="p-3 space-y-3 text-sm">
              <div className="alert alert-info py-2">
                <div className="flex items-start gap-2">
                  <div className="loading loading-spinner loading-xs"></div>
                  <div>
                    <div className="font-medium text-xs">Analyzing code...</div>
                    <div className="text-xs opacity-70">Line 9: Checking token extraction</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-base-content/70">RECENT CHANGES</div>
                <div className="text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="badge badge-success badge-xs">A</div>
                    <span className="flex-1 truncate">jwt.ts</span>
                    <span className="text-base-content/50">2m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="badge badge-warning badge-xs">M</div>
                    <span className="flex-1 truncate">User.ts</span>
                    <span className="text-base-content/50">5m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="badge badge-error badge-xs">!</div>
                    <span className="flex-1 truncate">auth.test.ts</span>
                    <span className="text-base-content/50">8m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="h-48 bg-base-100 border-t border-base-300">
          <div className="h-10 border-b border-base-300 flex items-center">
            <div className="tabs tabs-boxed tabs-xs bg-transparent">
              <a className="tab tab-active">Terminal</a>
              <a className="tab">Output</a>
              <a className="tab">Problems (1)</a>
            </div>
          </div>
          <div className="p-3 font-mono text-xs overflow-auto h-[calc(100%-2.5rem)]">
            <div className="text-success">$ npm test</div>
            <div className="mt-2">Running tests...</div>
            <div className="text-success">✓ User model tests (5)</div>
            <div className="text-success">✓ Auth routes tests (8)</div>
            <div className="text-error">✗ JWT middleware test failed</div>
            <div className="pl-4 text-error/70">Expected token to be validated</div>
          </div>
        </div>
      </div>
    </div>
  );
}
