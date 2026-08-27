import React, { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'claims' | 'egress'>('overview');
  const [draft, setDraft] = useState<'draft12' | 'draft13'>('draft12');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-lg text-white">
            O
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-lg text-slate-100">OBSTAT</h1>
            <p className="text-xs text-slate-400">Continuous Clearance Evidence Control</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-800">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Parallel Search API Live
          </span>
          <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition">
            + New Script Revision
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Production Workspace
              </span>
              <h2 className="text-2xl font-bold mt-2 text-white">Project: The Starlight Heist</h2>
              <p className="text-slate-400 text-sm mt-1">
                Active Revision: <span className="font-semibold text-slate-200">{draft === 'draft12' ? 'Draft 12 (Shooting Lock)' : 'Draft 13 (Blue Revision)'}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setDraft('draft12')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  draft === 'draft12' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Draft 12
              </button>
              <button
                onClick={() => setDraft('draft13')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  draft === 'draft13' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Draft 13 (Revised)
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div>
              <p className="text-xs text-slate-400">Total Claims</p>
              <p className="text-2xl font-bold text-white mt-0.5">24</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Valid Claims</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{draft === 'draft12' ? '24' : '20'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Stale Claims (Script Change)</p>
              <p className="text-2xl font-bold text-amber-400 mt-0.5">{draft === 'draft12' ? '0' : '4'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Parallel Searches Saved</p>
              <p className="text-2xl font-bold text-cyan-400 mt-0.5">{draft === 'draft12' ? '0' : '20 (83.3%)'}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-800 mb-6 flex space-x-6">
          {(['overview', 'comparison', 'claims', 'egress'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition border-b-2 ${
                activeTab === tab
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'comparison' ? 'Revision Diff & Invalidation' : tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-white mb-4">Clearance Packet Completion Status</h3>
              {draft === 'draft12' ? (
                <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                    <div>
                      <h4 className="font-semibold text-emerald-300">RESEARCH PACKET COMPLETE</h4>
                      <p className="text-xs text-emerald-400/80">All 24 items in Draft 12 have verified active evidence under live policy.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-emerald-900/60 text-emerald-300 px-3 py-1 rounded border border-emerald-700">
                    Draft 12 Sealed
                  </span>
                </div>
              ) : (
                <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                    <div>
                      <h4 className="font-semibold text-amber-300">RESEARCH PACKET BLOCKED (4 Stale Claims)</h4>
                      <p className="text-xs text-amber-400/80">Draft 13 modified 4 script items. Stale evidence invalidated and requires re-research.</p>
                    </div>
                  </div>
                  <button className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition">
                    Run Incremental Research (4 Items)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'claims' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Item & Type</th>
                  <th className="py-3 px-4">Occurrence Anchor</th>
                  <th className="py-3 px-4">Claim State</th>
                  <th className="py-3 px-4">Research Outcome</th>
                  <th className="py-3 px-4">Parallel Search ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">Acme Corp</div>
                    <div className="text-xs text-slate-400 font-mono">BUSINESS_ORG</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-xs font-mono">SC_001 • Page 1</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ACTIVE
                    </span>
                  </td>
                  <td className="py-3 px-4 text-emerald-400 text-xs font-mono">NO_MATCH_FOUND_IN_SCOPE</td>
                  <td className="py-3 px-4 text-slate-400 text-xs font-mono">search_8f29a01c</td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-xs text-cyan-400 hover:underline">View Receipt</button>
                  </td>
                </tr>
                {draft === 'draft13' && (
                  <tr className="bg-amber-950/10">
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">Starlight Lounge → Velvet Club</div>
                      <div className="text-xs text-amber-400 font-mono">VENUE_LOCATION (Renamed)</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs font-mono">SC_002 • Page 3</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
                        STALE_SCRIPT
                      </span>
                    </td>
                    <td className="py-3 px-4 text-amber-400 text-xs font-mono">INSUFFICIENT_COVERAGE</td>
                    <td className="py-3 px-4 text-slate-500 text-xs font-mono">Invalidated</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-xs text-amber-400 hover:underline font-semibold">Re-Research</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
