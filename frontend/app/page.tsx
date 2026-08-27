'use client';

import React, { useState } from 'react';

interface EvidenceRecord {
  evidence_id: string;
  parallel_search_id: string;
  session_id: string;
  url: string;
  title: string;
  excerpt: string;
  domain: string;
  evidence_label: 'EXACT_MATCH' | 'PARTIAL_MATCH' | 'VALID_NON_MATCH' | 'UNUSABLE_EVIDENCE';
  quoted_match_span?: string;
  validation_status: string;
  is_usable: boolean;
}

interface Claim {
  claim_id: string;
  item_id: string;
  item_string: string;
  item_type: string;
  revision_id: string;
  state: 'ACTIVE' | 'STALE_SCRIPT' | 'STALE_SCOPE' | 'STALE_POLICY' | 'SUPERSEDED' | 'REMOVED';
  outcome: 'MATCH_FOUND' | 'AMBIGUOUS_MATCH' | 'NO_MATCH_FOUND_IN_SCOPE' | 'INSUFFICIENT_COVERAGE' | 'RESEARCH_ERROR' | 'POLICY_BLOCKED';
  queries: string[];
  search_ids: string[];
  evidence: EvidenceRecord[];
  human_disposition?: string;
  disposition_note?: string;
}

type TabType = 'overview' | 'comparison' | 'claims' | 'egress' | 'evals';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [draft, setDraft] = useState<'draft12' | 'draft13'>('draft12');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Mock / Live dataset mirroring production state
  const draft12Claims: Claim[] = [
    {
      claim_id: 'claim_001',
      item_id: 'item_001',
      item_string: 'Acme Corp',
      item_type: 'BUSINESS_ORG',
      revision_id: 'rev_d12',
      state: 'ACTIVE',
      outcome: 'NO_MATCH_FOUND_IN_SCOPE',
      queries: ['Acme Corp official website business US'],
      search_ids: ['search_8f29a01c991a'],
      evidence: [
        {
          evidence_id: 'ev_101',
          parallel_search_id: 'search_8f29a01c991a',
          session_id: 'sess_9912a',
          url: 'https://public-registry-index.org/record',
          title: 'Public Registry Search for Acme Corp',
          excerpt: 'Standard commercial registry index record for Acme Corp.',
          domain: 'public-registry-index.org',
          evidence_label: 'VALID_NON_MATCH',
          quoted_match_span: 'Acme Corp',
          validation_status: 'VERIFIED_VERBATIM',
          is_usable: true
        }
      ]
    },
    {
      claim_id: 'claim_002',
      item_id: 'item_002',
      item_string: 'Starlight Lounge',
      item_type: 'VENUE_LOCATION',
      revision_id: 'rev_d12',
      state: 'ACTIVE',
      outcome: 'MATCH_FOUND',
      queries: ['Starlight Lounge location venue US'],
      search_ids: ['search_4c99e21b10ef'],
      human_disposition: 'PROCEED_PER_COUNSEL',
      disposition_note: 'Fictionalized interior set; production counsel approved location clearance.',
      evidence: [
        {
          evidence_id: 'ev_102',
          parallel_search_id: 'search_4c99e21b10ef',
          session_id: 'sess_9912a',
          url: 'https://starlightlounge-official.com/record',
          title: 'The Starlight Lounge - Commercial Entertainment Venue',
          excerpt: 'The Starlight Lounge is a commercial music and dining venue.',
          domain: 'starlightlounge-official.com',
          evidence_label: 'EXACT_MATCH',
          quoted_match_span: 'Starlight Lounge',
          validation_status: 'VERIFIED_VERBATIM',
          is_usable: true
        }
      ]
    }
  ];

  const draft13Claims: Claim[] = [
    {
      ...draft12Claims[0],
      revision_id: 'rev_d13',
      state: 'ACTIVE'
    },
    {
      ...draft12Claims[1],
      item_string: 'Starlight Lounge → Velvet Club',
      revision_id: 'rev_d13',
      state: 'STALE_SCRIPT',
      outcome: 'INSUFFICIENT_COVERAGE',
      search_ids: ['search_8f29a01c991a_STALE'],
      human_disposition: undefined,
      evidence: []
    }
  ];

  const currentClaims = draft === 'draft12' ? draft12Claims : draft13Claims;
  const isPacketComplete = currentClaims.every(c => c.state === 'ACTIVE' && c.outcome !== 'INSUFFICIENT_COVERAGE');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-900 selection:text-cyan-200">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-sm ring-1 ring-indigo-400/30">
            O
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold tracking-tight text-lg text-slate-100">OBSTAT</h1>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded-full">
                v1.0-PARALLEL
              </span>
            </div>
            <p className="text-xs text-slate-400">Continuous Clearance Evidence Control for Film Productions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-slate-300">Parallel Search API: <strong className="text-emerald-400">ACTIVE</strong></span>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-xs font-medium transition shadow-sm">
            + Upload New Revision
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Workspace Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-800/80">
                  Production Workspace
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: proj_starlight_2026</span>
              </div>
              <h2 className="text-2xl font-bold mt-2.5 text-white tracking-tight">Project: The Starlight Heist</h2>
              <p className="text-slate-400 text-sm mt-1">
                Active Screenplay: <span className="font-semibold text-slate-200">{draft === 'draft12' ? 'Draft 12 (Shooting Lock)' : 'Draft 13 (Blue Revision)'}</span>
              </p>
            </div>

            {/* Revision Toggle */}
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-full border border-slate-800 self-start md:self-auto">
              <button
                onClick={() => setDraft('draft12')}
                className={`px-4 py-1.5 text-xs rounded-full font-medium transition ${
                  draft === 'draft12' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Draft 12 (Original)
              </button>
              <button
                onClick={() => setDraft('draft13')}
                className={`px-4 py-1.5 text-xs rounded-full font-medium transition ${
                  draft === 'draft13' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Draft 13 (Script Change)
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-mono">Total Clearance Claims</p>
              <p className="text-2xl font-bold text-white mt-1">24</p>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-mono">Active Valid Claims</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{draft === 'draft12' ? '24' : '23'}</p>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-mono">Stale Claims (Invalidated)</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{draft === 'draft12' ? '0' : '1'}</p>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <p className="text-[11px] text-slate-400 uppercase font-mono">Parallel Searches Saved</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{draft === 'draft12' ? '0 (0%)' : '23 (95.8%)'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-800 mb-6 flex space-x-8">
          {(['overview', 'comparison', 'claims', 'egress', 'evals'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition border-b-2 ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'comparison' ? 'Revision Diff & Invalidation' : tab === 'egress' ? 'Egress Firewall Log' : tab === 'evals' ? 'Benchmark Evals' : tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-semibold text-base text-white mb-4">Clearance Packet Completion Status</h3>
              {isPacketComplete ? (
                <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-emerald-900/50"></div>
                    <div>
                      <h4 className="font-bold text-emerald-300 text-sm">RESEARCH PACKET COMPLETE</h4>
                      <p className="text-xs text-emerald-400/80 mt-0.5">All 24 clearance claims in Draft 12 have verified active evidence under live policy.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-emerald-900/60 text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-700">
                    Draft 12 Complete
                  </span>
                </div>
              ) : (
                <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 w-4 rounded-full bg-amber-400 ring-4 ring-amber-900/50"></div>
                    <div>
                      <h4 className="font-bold text-amber-300 text-sm">RESEARCH PACKET BLOCKED (1 Stale Claim)</h4>
                      <p className="text-xs text-amber-400/80 mt-0.5">Draft 13 renamed &quot;Starlight Lounge&quot; to &quot;Velvet Club&quot;. Stale evidence invalidated automatically.</p>
                    </div>
                  </div>
                  <button className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-4 py-2 rounded-full transition shadow-sm">
                    Re-Run Parallel Research (1 Claim)
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <h4 className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-2">Core Product Invariant 1</h4>
                <p className="text-sm font-semibold text-slate-100">
                  &ldquo;Change the script, and stale clearance evidence cannot silently survive.&rdquo;
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Every claim is cryptographic-hashed to script text, context, policy, and research scope. Any script modification invalidates stale evidence.
                </p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <h4 className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-2">Core Product Invariant 2</h4>
                <p className="text-sm font-semibold text-slate-100">
                  &ldquo;No evidence, no completed research state.&rdquo;
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Unusable, hallucinated, or unverified search classifications contribute zero toward negative coverage. Missing evidence keeps packet blocked.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CLAIMS TAB */}
        {activeTab === 'claims' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200">Clearance Claim Ledger</h3>
              <span className="text-xs font-mono text-slate-400">Showing {currentClaims.length} Claims</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Item & Type</th>
                    <th className="py-3 px-4">Claim State</th>
                    <th className="py-3 px-4">Research Outcome</th>
                    <th className="py-3 px-4">Parallel Search ID</th>
                    <th className="py-3 px-4">Human Disposition</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                  {currentClaims.map((claim) => (
                    <tr key={claim.claim_id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-100 font-sans">{claim.item_string}</div>
                        <div className="text-[11px] text-slate-400">{claim.item_type}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          claim.state === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border-amber-800'
                        }`}>
                          {claim.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={claim.outcome === 'MATCH_FOUND' ? 'text-amber-400' : claim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'text-emerald-400' : 'text-slate-400'}>
                          {claim.outcome}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{claim.search_ids[0]}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-300 font-sans">
                        {claim.human_disposition || <span className="text-slate-500 font-mono">NONE</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-sans font-medium hover:underline"
                        >
                          Inspect Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EGRESS FIREWALL TAB */}
        {activeTab === 'egress' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-base text-white">Provenance Egress Firewall Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">Auditable record proving NO raw screenplay dialogue or context leaves GCP.</p>
              </div>
              <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full">
                0 Leaks Detected
              </span>
            </div>
            <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-3 border border-slate-800">
              <div className="p-3 bg-slate-900/60 rounded border border-slate-800/60">
                <p className="text-slate-400">[2026-08-27T08:49:31Z] Outbound Query Compiled:</p>
                <p className="text-emerald-400 font-semibold mt-1">&quot;Acme Corp official website business US&quot;</p>
                <p className="text-slate-400 text-[11px] mt-1">Token Provenance: ITEM_TOKEN (&quot;Acme Corp&quot;), TEMPLATE_TOKEN (&quot;official website business&quot;), SCOPE_TOKEN (&quot;US&quot;)</p>
                <p className="text-slate-500 text-[10px] mt-0.5">Parallel Search ID: search_8f29a01c991a</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded border border-slate-800/60">
                <p className="text-slate-400">[2026-08-27T08:49:31Z] Outbound Query Compiled:</p>
                <p className="text-emerald-400 font-semibold mt-1">&quot;Starlight Lounge location venue US&quot;</p>
                <p className="text-slate-400 text-[11px] mt-1">Token Provenance: ITEM_TOKEN (&quot;Starlight Lounge&quot;), TEMPLATE_TOKEN (&quot;location venue&quot;), SCOPE_TOKEN (&quot;US&quot;)</p>
                <p className="text-slate-500 text-[10px] mt-0.5">Parallel Search ID: search_4c99e21b10ef</p>
              </div>
            </div>
          </div>
        )}

        {/* CLAIM RECEIPT MODAL */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-lg text-white">{selectedClaim.item_string}</h3>
                  <p className="text-xs font-mono text-slate-400">Claim ID: {selectedClaim.claim_id}</p>
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-md hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <p className="text-slate-500">Item Type:</p>
                  <p className="text-slate-200">{selectedClaim.item_type}</p>
                </div>
                <div>
                  <p className="text-slate-500">Claim State:</p>
                  <p className="text-emerald-400">{selectedClaim.state}</p>
                </div>
                <div>
                  <p className="text-slate-500">Parallel Search ID:</p>
                  <p className="text-slate-200">{selectedClaim.search_ids[0]}</p>
                </div>
                <div>
                  <p className="text-slate-500">Research Outcome:</p>
                  <p className="text-amber-400">{selectedClaim.outcome}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Retrieved Evidence Excerpt</h4>
                {selectedClaim.evidence.length > 0 ? (
                  selectedClaim.evidence.map(e => (
                    <div key={e.evidence_id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                      <p className="font-semibold text-indigo-300">{e.title}</p>
                      <p className="text-slate-400 text-[11px] font-mono mt-0.5">{e.url}</p>
                      <p className="text-slate-300 mt-2 font-serif italic">&ldquo;{e.excerpt}&rdquo;</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/60 pt-2">
                        <span className="text-emerald-400">Label: {e.evidence_label}</span>
                        <span className="text-slate-400">Status: {e.validation_status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-xl text-xs text-amber-300">
                    No active evidence linked. Claim invalidated by script change.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-full text-xs font-medium transition"
                >
                  Close Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
