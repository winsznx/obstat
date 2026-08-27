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

  // Mock dataset mirroring production state according to Visitors design tokens
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
    <div className="min-h-screen bg-[#fafafa] text-[#181925] font-sans antialiased">
      {/* Visitors White Engineering Blueprint Navigation Header */}
      <header className="border-b border-[#e8e8e8] bg-[#ffffff] sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-[0_1px_1px_1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center space-x-4">
          <div className="h-9 w-9 rounded-full bg-[#918df6] flex items-center justify-center font-bold text-white shadow-sm">
            O
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold tracking-tight text-xl text-[#181925]">OBSTAT</h1>
              <span className="text-[11px] font-mono bg-[#def6e4] text-[#33c758] border border-[#33c758]/30 px-2 py-0.5 rounded-full font-semibold">
                PARALLEL LIVE
              </span>
            </div>
            <p className="text-xs text-[#666666]">Continuous Clearance Evidence Control for Film Productions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="bg-[#918df6] hover:bg-[#9580ff] text-white px-5 py-2.5 rounded-full text-xs font-semibold tracking-tight transition shadow-[0_1px_1px_1px_rgba(0,0,0,0.08)]">
            + Upload New Revision
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1200px] mx-auto px-8 py-10">
        {/* Workspace Canvas Panel Card */}
        <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-[24px] p-8 mb-10 shadow-[0_1px_3px_0px_rgba(0,0,0,0.06),0_8px_16px_0px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#2c78fc] bg-[#f5f5f5] px-3 py-1 rounded-full border border-[#e8e8e8] font-semibold">
                  Production Workspace
                </span>
                <span className="text-xs text-[#666666] font-mono">ID: proj_starlight_2026</span>
              </div>
              <h2 className="text-3xl font-bold mt-3 text-[#181925] tracking-tight">Project: The Starlight Heist</h2>
              <p className="text-[#666666] text-sm mt-1">
                Active Screenplay: <span className="font-semibold text-[#181925]">{draft === 'draft12' ? 'Draft 12 (Shooting Lock)' : 'Draft 13 (Blue Revision)'}</span>
              </p>
            </div>

            {/* Revision Toggle Pill */}
            <div className="flex items-center space-x-1 bg-[#f5f5f5] p-1.5 rounded-full border border-[#e8e8e8]">
              <button
                onClick={() => setDraft('draft12')}
                className={`px-5 py-2 text-xs rounded-full font-medium transition ${
                  draft === 'draft12' ? 'bg-[#ffffff] text-[#181925] shadow-sm font-semibold' : 'text-[#666666] hover:text-[#181925]'
                }`}
              >
                Draft 12 (Original)
              </button>
              <button
                onClick={() => setDraft('draft13')}
                className={`px-5 py-2 text-xs rounded-full font-medium transition ${
                  draft === 'draft13' ? 'bg-[#ffffff] text-[#181925] shadow-sm font-semibold' : 'text-[#666666] hover:text-[#181925]'
                }`}
              >
                Draft 13 (Script Change)
              </button>
            </div>
          </div>

          {/* Metric Callout Cards Grid */}
          <div className="mt-8 pt-6 border-t border-[#e8e8e8] grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#fafafa] p-4 rounded-[16px] border border-[#e8e8e8]">
              <p className="text-xs text-[#666666] font-mono uppercase tracking-wider">Total Claims</p>
              <p className="text-3xl font-bold text-[#181925] mt-1">24</p>
            </div>
            <div className="bg-[#def6e4] p-4 rounded-[16px] border border-[#33c758]/30">
              <p className="text-xs text-[#33c758] font-mono uppercase tracking-wider font-semibold">Active Valid Claims</p>
              <p className="text-3xl font-bold text-[#33c758] mt-1">{draft === 'draft12' ? '24' : '23'}</p>
            </div>
            <div className="bg-[#fff8e6] p-4 rounded-[16px] border border-[#ffa600]/30">
              <p className="text-xs text-[#ffa600] font-mono uppercase tracking-wider font-semibold">Stale Claims (Invalidated)</p>
              <p className="text-3xl font-bold text-[#ffa600] mt-1">{draft === 'draft12' ? '0' : '1'}</p>
            </div>
            <div className="bg-[#fafafa] p-4 rounded-[16px] border border-[#e8e8e8]">
              <p className="text-xs text-[#666666] font-mono uppercase tracking-wider">Parallel Searches Saved</p>
              <p className="text-3xl font-bold text-[#918df6] mt-1">{draft === 'draft12' ? '0 (0%)' : '23 (95.8%)'}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-[#e8e8e8] mb-8 flex space-x-8">
          {(['overview', 'comparison', 'claims', 'egress', 'evals'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition border-b-2 ${
                activeTab === tab
                  ? 'border-[#918df6] text-[#181925] font-semibold'
                  : 'border-transparent text-[#666666] hover:text-[#181925]'
              }`}
            >
              {tab === 'comparison' ? 'Revision Diff & Invalidation' : tab === 'egress' ? 'Egress Firewall Log' : tab === 'evals' ? 'Benchmark Evals' : tab}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-[24px] p-8 shadow-sm">
              <h3 className="font-bold text-lg text-[#181925] mb-4">Clearance Packet Completion Status</h3>
              {isPacketComplete ? (
                <div className="bg-[#def6e4] border border-[#33c758]/40 rounded-[16px] p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 w-4 rounded-full bg-[#33c758] ring-4 ring-[#33c758]/20"></div>
                    <div>
                      <h4 className="font-bold text-[#181925] text-base">RESEARCH PACKET COMPLETE</h4>
                      <p className="text-xs text-[#666666] mt-0.5">All 24 clearance claims in Draft 12 have verified active evidence under live policy.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-[#ffffff] text-[#33c758] px-4 py-2 rounded-full border border-[#33c758]/30 font-semibold shadow-sm">
                    Draft 12 Complete
                  </span>
                </div>
              ) : (
                <div className="bg-[#fff8e6] border border-[#ffa600]/40 rounded-[16px] p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 w-4 rounded-full bg-[#ffa600] ring-4 ring-[#ffa600]/20"></div>
                    <div>
                      <h4 className="font-bold text-[#181925] text-base">RESEARCH PACKET BLOCKED (1 Stale Claim)</h4>
                      <p className="text-xs text-[#666666] mt-0.5">Draft 13 renamed &quot;Starlight Lounge&quot; to &quot;Velvet Club&quot;. Stale evidence invalidated automatically.</p>
                    </div>
                  </div>
                  <button className="bg-[#ffa600] hover:bg-[#ff9400] text-white text-xs font-semibold px-5 py-2.5 rounded-full transition shadow-sm">
                    Re-Run Parallel Research (1 Claim)
                  </button>
                </div>
              )}
            </div>

            {/* Invariant Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-[24px] p-6 shadow-sm">
                <h4 className="text-xs font-mono text-[#918df6] uppercase tracking-wider font-semibold mb-2">Core Product Invariant 1</h4>
                <p className="text-base font-bold text-[#181925]">
                  &ldquo;Change the script, and stale clearance evidence cannot silently survive.&rdquo;
                </p>
                <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                  Every claim is cryptographic-hashed to script text, context, policy, and research scope. Any script modification invalidates stale evidence.
                </p>
              </div>
              <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-[24px] p-6 shadow-sm">
                <h4 className="text-xs font-mono text-[#918df6] uppercase tracking-wider font-semibold mb-2">Core Product Invariant 2</h4>
                <p className="text-base font-bold text-[#181925]">
                  &ldquo;No evidence, no completed research state.&rdquo;
                </p>
                <p className="text-xs text-[#666666] mt-2 leading-relaxed">
                  Unusable, hallucinated, or unverified search classifications contribute zero toward negative coverage. Missing evidence keeps packet blocked.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CLAIMS TAB */}
        {activeTab === 'claims' && (
          <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-[24px] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#e8e8e8] bg-[#fafafa] flex justify-between items-center">
              <h3 className="text-base font-bold text-[#181925]">Clearance Claim Ledger</h3>
              <span className="text-xs font-mono text-[#666666]">Showing {currentClaims.length} Claims</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] text-[#666666] text-xs font-semibold uppercase tracking-wider border-b border-[#e8e8e8]">
                    <th className="py-4 px-6">Item & Type</th>
                    <th className="py-4 px-6">Claim State</th>
                    <th className="py-4 px-6">Research Outcome</th>
                    <th className="py-4 px-6">Parallel Search ID</th>
                    <th className="py-4 px-6">Human Disposition</th>
                    <th className="py-4 px-6 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] text-sm">
                  {currentClaims.map((claim) => (
                    <tr key={claim.claim_id} className="hover:bg-[#fafafa] transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#181925]">{claim.item_string}</div>
                        <div className="text-xs text-[#666666] font-mono">{claim.item_type}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                          claim.state === 'ACTIVE'
                            ? 'bg-[#def6e4] text-[#33c758] border-[#33c758]/30'
                            : 'bg-[#fff8e6] text-[#ffa600] border-[#ffa600]/30'
                        }`}>
                          {claim.state}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs font-mono">
                        <span className={claim.outcome === 'MATCH_FOUND' ? 'text-[#ffa600] font-semibold' : claim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'text-[#33c758] font-semibold' : 'text-[#666666]'}>
                          {claim.outcome}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-[#666666] font-mono">{claim.search_ids[0]}</td>
                      <td className="py-4 px-6 text-xs text-[#181925]">
                        {claim.human_disposition || <span className="text-[#999999] font-mono">NONE</span>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="text-xs text-[#918df6] hover:underline font-semibold"
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
          <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-[24px] p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-[#181925]">Provenance Egress Firewall Log</h3>
                <p className="text-xs text-[#666666] mt-0.5">Auditable record proving NO raw screenplay dialogue or context leaves GCP.</p>
              </div>
              <span className="text-xs font-mono bg-[#def6e4] text-[#33c758] border border-[#33c758]/30 px-3 py-1.5 rounded-full font-semibold">
                0 Leaks Detected
              </span>
            </div>
            <div className="bg-[#fafafa] rounded-[16px] p-6 font-mono text-xs text-[#181925] space-y-4 border border-[#e8e8e8]">
              <div className="p-4 bg-[#ffffff] rounded-[12px] border border-[#e8e8e8]">
                <p className="text-[#666666]">[2026-08-27T08:49:31Z] Outbound Query Compiled:</p>
                <p className="text-[#33c758] font-bold mt-1">&quot;Acme Corp official website business US&quot;</p>
                <p className="text-[#666666] text-[11px] mt-1">Token Provenance: ITEM_TOKEN (&quot;Acme Corp&quot;), TEMPLATE_TOKEN (&quot;official website business&quot;), SCOPE_TOKEN (&quot;US&quot;)</p>
                <p className="text-[#999999] text-[10px] mt-0.5">Parallel Search ID: search_8f29a01c991a</p>
              </div>
              <div className="p-4 bg-[#ffffff] rounded-[12px] border border-[#e8e8e8]">
                <p className="text-[#666666]">[2026-08-27T08:49:31Z] Outbound Query Compiled:</p>
                <p className="text-[#33c758] font-bold mt-1">&quot;Starlight Lounge location venue US&quot;</p>
                <p className="text-[#666666] text-[11px] mt-1">Token Provenance: ITEM_TOKEN (&quot;Starlight Lounge&quot;), TEMPLATE_TOKEN (&quot;location venue&quot;), SCOPE_TOKEN (&quot;US&quot;)</p>
                <p className="text-[#999999] text-[10px] mt-0.5">Parallel Search ID: search_4c99e21b10ef</p>
              </div>
            </div>
          </div>
        )}

        {/* CLAIM RECEIPT MODAL */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-[#181925]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-[24px] max-w-2xl w-full p-8 space-y-6 shadow-2xl">
              <div className="flex justify-between items-start border-b border-[#e8e8e8] pb-4">
                <div>
                  <h3 className="font-bold text-xl text-[#181925]">{selectedClaim.item_string}</h3>
                  <p className="text-xs font-mono text-[#666666]">Claim ID: {selectedClaim.claim_id}</p>
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="text-[#666666] hover:text-[#181925] text-sm px-2 py-1 rounded-full hover:bg-[#f5f5f5]"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#fafafa] p-4 rounded-[16px] border border-[#e8e8e8]">
                <div>
                  <p className="text-[#666666]">Item Type:</p>
                  <p className="text-[#181925] font-semibold">{selectedClaim.item_type}</p>
                </div>
                <div>
                  <p className="text-[#666666]">Claim State:</p>
                  <p className="text-[#33c758] font-semibold">{selectedClaim.state}</p>
                </div>
                <div>
                  <p className="text-[#666666]">Parallel Search ID:</p>
                  <p className="text-[#181925] font-semibold">{selectedClaim.search_ids[0]}</p>
                </div>
                <div>
                  <p className="text-[#666666]">Research Outcome:</p>
                  <p className="text-[#ffa600] font-semibold">{selectedClaim.outcome}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">Retrieved Evidence Excerpt</h4>
                {selectedClaim.evidence.length > 0 ? (
                  selectedClaim.evidence.map(e => (
                    <div key={e.evidence_id} className="bg-[#fafafa] p-4 rounded-[16px] border border-[#e8e8e8] text-xs">
                      <p className="font-bold text-[#181925]">{e.title}</p>
                      <p className="text-[#666666] text-[11px] font-mono mt-0.5">{e.url}</p>
                      <p className="text-[#181925] mt-2 italic">&ldquo;{e.excerpt}&rdquo;</p>
                      <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-[#e8e8e8] pt-2">
                        <span className="text-[#33c758] font-semibold">Label: {e.evidence_label}</span>
                        <span className="text-[#666666]">Status: {e.validation_status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#fff8e6] border border-[#ffa600]/40 p-4 rounded-[16px] text-xs text-[#ffa600] font-semibold">
                    No active evidence linked. Claim invalidated by script change.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="bg-[#918df6] hover:bg-[#9580ff] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition shadow-sm"
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
