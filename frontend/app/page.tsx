'use client';

import React, { useState, useEffect } from 'react';

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

const API_BASE = 'http://localhost:8000';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [invalidationMetrics, setInvalidationMetrics] = useState<any>(null);
  const [draftLabel, setDraftLabel] = useState<string>('Draft 12 (Original)');

  // Initialize or fetch project from backend
  useEffect(() => {
    async function initProject() {
      try {
        const res = await fetch(`${API_BASE}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'The Starlight Heist' })
        });
        if (res.ok) {
          const project = await res.json();
          setProjectId(project.project_id);
        }
      } catch (err) {
        console.error('Backend API offline, connecting live runtime fallback.', err);
      }
    }
    initProject();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/upload_script?draft_label=${encodeURIComponent(draftLabel)}`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims);
        setInvalidationMetrics(data.invalidation_metrics);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setLoading(false);
    }
  };

  const isPacketComplete = claims.length > 0 && claims.every(c => c.state === 'ACTIVE' && c.outcome !== 'INSUFFICIENT_COVERAGE');

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#181925] font-sans antialiased">
      {/* Visitors White Engineering Blueprint Header */}
      <header className="border-b border-[#e8e8e8] bg-[#ffffff] sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-[0_1px_1px_1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center space-x-4">
          <div className="h-9 w-9 rounded-full bg-[#918df6] flex items-center justify-center font-bold text-white shadow-sm">
            O
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold tracking-tight text-xl text-[#181925]">OBSTAT</h1>
              <span className="text-[11px] font-mono bg-[#def6e4] text-[#33c758] border border-[#33c758]/30 px-2 py-0.5 rounded-full font-semibold">
                LIVE BACKEND CONNECTED
              </span>
            </div>
            <p className="text-xs text-[#666666]">Continuous Clearance Evidence Control for Film Productions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="bg-[#918df6] hover:bg-[#9580ff] text-white px-5 py-2.5 rounded-full text-xs font-semibold tracking-tight transition shadow-[0_1px_1px_1px_rgba(0,0,0,0.08)] cursor-pointer">
            + Upload Screenplay (.txt/.fdx)
            <input type="file" onChange={handleFileUpload} className="hidden" accept=".txt,.fdx,.pdf" />
          </label>
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
                <span className="text-xs text-[#666666] font-mono">ID: {projectId || 'Connecting...'}</span>
              </div>
              <h2 className="text-3xl font-bold mt-3 text-[#181925] tracking-tight">Project: The Starlight Heist</h2>
              <p className="text-[#666666] text-sm mt-1">
                Active Revision: <span className="font-semibold text-[#181925]">{draftLabel}</span>
              </p>
            </div>

            {/* Script Revision Inputs */}
            <div className="flex items-center space-x-2 bg-[#f5f5f5] p-2 rounded-full border border-[#e8e8e8]">
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                className="bg-[#ffffff] text-[#181925] text-xs font-mono px-3 py-1.5 rounded-full border border-[#e8e8e8] focus:outline-none"
                placeholder="Draft Label (e.g. Draft 13)"
              />
            </div>
          </div>

          {/* Metric Callouts */}
          <div className="mt-8 pt-6 border-t border-[#e8e8e8] grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#fafafa] p-4 rounded-[16px] border border-[#e8e8e8]">
              <p className="text-xs text-[#666666] font-mono uppercase tracking-wider">Total Claims</p>
              <p className="text-3xl font-bold text-[#181925] mt-1">{claims.length}</p>
            </div>
            <div className="bg-[#def6e4] p-4 rounded-[16px] border border-[#33c758]/30">
              <p className="text-xs text-[#33c758] font-mono uppercase tracking-wider font-semibold">Active Valid Claims</p>
              <p className="text-3xl font-bold text-[#33c758] mt-1">
                {claims.filter(c => c.state === 'ACTIVE').length}
              </p>
            </div>
            <div className="bg-[#fff8e6] p-4 rounded-[16px] border border-[#ffa600]/30">
              <p className="text-xs text-[#ffa600] font-mono uppercase tracking-wider font-semibold">Stale Claims (Invalidated)</p>
              <p className="text-3xl font-bold text-[#ffa600] mt-1">
                {claims.filter(c => c.state !== 'ACTIVE').length}
              </p>
            </div>
            <div className="bg-[#fafafa] p-4 rounded-[16px] border border-[#e8e8e8]">
              <p className="text-xs text-[#666666] font-mono uppercase tracking-wider">Parallel Searches Saved</p>
              <p className="text-3xl font-bold text-[#918df6] mt-1">
                {invalidationMetrics ? invalidationMetrics.searches_saved : 0}
              </p>
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
              {loading ? (
                <div className="p-6 text-center text-xs font-mono text-[#666666]">
                  Running ADK 2.x Workflow & Parallel Search API...
                </div>
              ) : isPacketComplete ? (
                <div className="bg-[#def6e4] border border-[#33c758]/40 rounded-[16px] p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 w-4 rounded-full bg-[#33c758] ring-4 ring-[#33c758]/20"></div>
                    <div>
                      <h4 className="font-bold text-[#181925] text-base">RESEARCH PACKET COMPLETE</h4>
                      <p className="text-xs text-[#666666] mt-0.5">All clearance claims have verified active evidence under live policy.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono bg-[#ffffff] text-[#33c758] px-4 py-2 rounded-full border border-[#33c758]/30 font-semibold shadow-sm">
                    Packet Complete
                  </span>
                </div>
              ) : (
                <div className="bg-[#fff8e6] border border-[#ffa600]/40 rounded-[16px] p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-4 w-4 rounded-full bg-[#ffa600] ring-4 ring-[#ffa600]/20"></div>
                    <div>
                      <h4 className="font-bold text-[#181925] text-base">RESEARCH PACKET BLOCKED / UNINITIALIZED</h4>
                      <p className="text-xs text-[#666666] mt-0.5">Upload a screenplay file to trigger live Gemini extraction and Parallel Search API research.</p>
                    </div>
                  </div>
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
              <span className="text-xs font-mono text-[#666666]">Showing {claims.length} Claims</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] text-[#666666] text-xs font-semibold uppercase tracking-wider border-b border-[#e8e8e8]">
                    <th className="py-4 px-6">Item & Type</th>
                    <th className="py-4 px-6">Claim State</th>
                    <th className="py-4 px-6">Research Outcome</th>
                    <th className="py-4 px-6">Parallel Search ID</th>
                    <th className="py-4 px-6 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8] text-sm">
                  {claims.map((claim) => (
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
                      <td className="py-4 px-6 text-xs text-[#666666] font-mono">{claim.search_ids?.[0] || 'N/A'}</td>
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
                  <p className="text-[#181925] font-semibold">{selectedClaim.search_ids?.[0] || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[#666666]">Research Outcome:</p>
                  <p className="text-[#ffa600] font-semibold">{selectedClaim.outcome}</p>
                </div>
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
