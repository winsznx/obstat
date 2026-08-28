'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, ChevronRight, Search, PlusCircle, Globe, FileCheck, Layers, Key
} from 'lucide-react';

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

interface Occurrence {
  revision_id: string;
  scene_id: string;
  page_number: number;
  line_offset: number;
  occurrence_text: string;
  context_snippet: string;
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
  occurrences: Occurrence[];
  human_disposition?: string;
  disposition_note?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  project_id: string;
  title: string;
  created_at: string;
  active_revision_id?: string;
}

interface Revision {
  revision_id: string;
  project_id: string;
  title: string;
  draft_label: string;
  file_name: string;
  sha256: string;
  total_scenes: number;
  total_pages: number;
}

interface EgressLog {
  query: string;
  allowed: boolean;
  provenance: string[];
  search_id: string;
  timestamp: string;
}

interface Alternative {
  alternative_name: string;
  outcome: string;
  evidence: EvidenceRecord[];
}

type TabType = 'workspace' | 'packet' | 'assurance';

const API_BASE = 'http://localhost:8000';

export default function Workspace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('workspace');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [draftLabel, setDraftLabel] = useState('Draft 12');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [altInput, setAltInput] = useState('');
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [altLoading, setAltLoading] = useState(false);
  const [egressLogs, setEgressLogs] = useState<EgressLog[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProject) {
      fetchRevisions(activeProject.project_id);
    }
  }, [activeProject]);

  useEffect(() => {
    if (activeRevisionId) {
      fetchRevisionDetails(activeRevisionId);
    }
  }, [activeRevisionId]);

  useEffect(() => {
    if (activeTab === 'assurance') {
      fetchEgressLogs();
    }
  }, [activeTab]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
          if (data[0].active_revision_id) {
            setActiveRevisionId(data[0].active_revision_id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRevisions = async (projectId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRevisionDetails = async (revId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/revisions/${revId}`);
      if (res.ok) {
        const data = await res.json();
        setRawText(data.raw_text);
        setClaims(data.claims);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEgressLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/assurance/egress_logs`);
      if (res.ok) {
        const data = await res.json();
        setEgressLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjectTitle })
      });
      if (res.ok) {
        const data = await res.json();
        setNewProjectTitle('');
        fetchProjects();
        setActiveProject(data);
        setActiveRevisionId(null);
        setRawText('');
        setClaims([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/projects/${activeProject.project_id}/upload_script?draft_label=${encodeURIComponent(draftLabel)}`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const nextRevId = data.revision.revision_id;
        
        // 1. Immediately set active revision state
        setActiveRevisionId(nextRevId);
        
        // 2. Proactively update activeProject state with the new active_revision_id
        setActiveProject(prev => prev ? { ...prev, active_revision_id: nextRevId } : null);
        
        // 3. Force instant sidebar list reload and details fetch
        await fetchRevisions(activeProject.project_id);
        await fetchRevisionDetails(nextRevId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisposition = async (claimId: string, dispo: string, note: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/claims/${claimId}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ human_disposition: dispo, disposition_note: note })
      });
      if (res.ok) {
        if (activeRevisionId) {
          fetchRevisionDetails(activeRevisionId);
        }
        const updatedClaim = await res.json();
        setSelectedClaim(updatedClaim);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveAlternatives = async () => {
    if (!altInput.trim() || !selectedClaim) return;
    setAltLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/claims/${selectedClaim.claim_id}/resolve_alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alternative_name: altInput })
      });
      if (res.ok) {
        setAltInput('');
        fetchAlternatives(selectedClaim.claim_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAltLoading(false);
    }
  };

  const fetchAlternatives = async (claimId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/claims/${claimId}/alternatives`);
      if (res.ok) {
        const data = await res.json();
        setAlternatives(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedClaim) {
      fetchAlternatives(selectedClaim.claim_id);
    } else {
      setAlternatives([]);
    }
  }, [selectedClaim]);

  const filteredClaims = claims.filter(c => {
    if (searchQuery && !c.item_string.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType === 'ALL') return true;
    if (filterType === 'NEEDS_RESEARCH') return c.outcome === 'INSUFFICIENT_COVERAGE';
    if (filterType === 'MATCH_FOUND') return c.outcome === 'MATCH_FOUND';
    if (filterType === 'NO_MATCH') return c.outcome === 'NO_MATCH_FOUND_IN_SCOPE';
    if (filterType === 'AMBIGUOUS') return c.outcome === 'AMBIGUOUS_MATCH';
    if (filterType === 'STALE') return c.state === 'STALE_SCRIPT';
    if (filterType === 'NEEDS_DISPOSITION') return !c.human_disposition && c.outcome === 'MATCH_FOUND';
    if (filterType === 'RESOLVED') return !!c.human_disposition;
    return c.outcome === filterType;
  });

  const packetComplete = claims.length > 0 && claims.every(c => c.state === 'ACTIVE' && c.outcome !== 'INSUFFICIENT_COVERAGE');

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#181925] font-sans antialiased flex flex-col">
      <header className="border-b border-[#e8e8e8] bg-[#ffffff] sticky top-0 z-50 px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="h-9 w-9 rounded-full bg-[#918df6] flex items-center justify-center font-bold text-white shadow-sm">
            O
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-bold tracking-tight text-xl text-[#181925]">OBSTAT</h1>
              <span className="text-[10px] font-mono bg-[#def6e4] text-[#33c758] border border-[#33c758]/30 px-2 py-0.5 rounded-full font-semibold">
                CONTINUOUS EVIDENCE CONTROL
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-1 bg-[#f5f5f5] p-1 rounded-full border border-[#e8e8e8]">
          <button 
            onClick={() => setActiveTab('workspace')}
            className={`px-5 py-1.5 text-xs rounded-full font-medium transition ${activeTab === 'workspace' ? 'bg-[#ffffff] text-[#181925] shadow-sm font-semibold' : 'text-[#666666]'}`}
          >
            Clearance Workspace
          </button>
          <button 
            onClick={() => setActiveTab('packet')}
            className={`px-5 py-1.5 text-xs rounded-full font-medium transition ${activeTab === 'packet' ? 'bg-[#ffffff] text-[#181925] shadow-sm font-semibold' : 'text-[#666666]'}`}
          >
            Research Packet
          </button>
          <button 
            onClick={() => setActiveTab('assurance')}
            className={`px-5 py-1.5 text-xs rounded-full font-medium transition ${activeTab === 'assurance' ? 'bg-[#ffffff] text-[#181925] shadow-sm font-semibold' : 'text-[#666666]'}`}
          >
            Assurance Proof
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-[#e8e8e8] bg-[#ffffff] p-6 flex flex-col space-y-6 overflow-y-auto">
          <div>
            <h2 className="text-xs font-mono text-[#999999] uppercase tracking-wider mb-3">Productions</h2>
            <form onSubmit={handleCreateProject} className="mb-4">
              <input
                type="text"
                placeholder="New production title..."
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className="w-full text-xs border border-[#e8e8e8] rounded-lg px-3 py-2 bg-[#fafafa] focus:outline-none focus:ring-1 focus:ring-[#918df6]"
              />
            </form>
            <div className="space-y-1.5">
              {projects.map((proj) => (
                <button
                  key={proj.project_id}
                  onClick={() => {
                    setActiveProject(proj);
                    if (proj.active_revision_id) {
                      setActiveRevisionId(proj.active_revision_id);
                    } else {
                      setActiveRevisionId(null);
                      setRawText('');
                      setClaims([]);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition ${activeProject?.project_id === proj.project_id ? 'bg-[#f5f5f5] text-[#181925]' : 'text-[#666666] hover:bg-[#fafafa]'}`}
                >
                  <span className="truncate">{proj.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#999999]" />
                </button>
              ))}
            </div>
          </div>

          {activeProject && (
            <div className="pt-4 border-t border-[#e8e8e8]">
              <h2 className="text-xs font-mono text-[#999999] uppercase tracking-wider mb-3">Revision Timeline</h2>
              
              <div className="mb-4 space-y-2">
                <input
                  type="text"
                  placeholder="Next draft label (e.g. Draft 13)"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  className="w-full text-xs border border-[#e8e8e8] rounded-lg px-3 py-1.5 bg-[#fafafa]"
                />
                <label className="w-full bg-[#fafafa] hover:bg-[#f5f5f5] text-xs font-semibold border border-[#e8e8e8] rounded-lg px-3 py-2 flex items-center justify-center cursor-pointer transition">
                  <PlusCircle className="h-4 w-4 mr-2 text-[#666666]" />
                  Upload Script Draft
                  <input type="file" onChange={handleUploadScript} className="hidden" accept=".txt,.fdx,.pdf" />
                </label>
              </div>

              <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-[#e8e8e8]">
                {revisions.map((rev) => (
                  <div key={rev.revision_id} className="flex items-center space-x-3 pl-1.5 relative">
                    <div className={`h-3.5 w-3.5 rounded-full border-2 ${activeRevisionId === rev.revision_id ? 'bg-[#918df6] border-[#918df6]' : 'bg-[#ffffff] border-[#e8e8e8]'} z-10`} />
                    <button
                      onClick={() => setActiveRevisionId(rev.revision_id)}
                      className="text-left"
                    >
                      <p className={`text-xs font-bold ${activeRevisionId === rev.revision_id ? 'text-[#181925]' : 'text-[#666666]'}`}>
                        {rev.draft_label}
                      </p>
                      <p className="text-[10px] text-[#999999] font-mono truncate max-w-[180px]">{rev.file_name}</p>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {activeTab === 'workspace' && (
          <div className="flex-1 flex overflow-hidden">
            <section className="flex-1 border-r border-[#e8e8e8] bg-[#ffffff] p-8 overflow-y-auto flex flex-col">
              <div className="border-b border-[#e8e8e8] pb-4 mb-6">
                <h2 className="text-sm font-bold text-[#181925]">Active Screenplay Review</h2>
                <p className="text-xs text-[#666666] mt-0.5">Click highlighted terms to view clearance plans and evidence.</p>
              </div>

              {!activeProject ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <Layers className="h-12 w-12 text-[#999999] mb-4 animate-pulse" />
                  <p className="text-sm font-bold text-[#181925]">No production selected</p>
                  <p className="text-xs text-[#666666] mt-1">Create a production in the left menu to start screenplay clearances.</p>
                </div>
              ) : loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-8 w-8 border-4 border-t-[#918df6] border-r-transparent border-b-[#918df6] border-l-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xs font-mono text-[#666666]">Running ADK Extraction & Parallel Search...</p>
                </div>
              ) : rawText ? (
                <pre className="whitespace-pre-wrap font-mono text-xs text-[#333333] leading-relaxed max-w-2xl bg-[#fafafa] border border-[#e8e8e8] rounded-2xl p-8 overflow-x-auto shadow-sm">
                  {rawText.split('\n').map((line, idx) => {
                    let renderedLine: React.ReactNode = line;
                    for (const claim of claims) {
                      const regex = new RegExp(`\\b(${claim.item_string})\\b`, 'i');
                      if (regex.test(line)) {
                        const parts = line.split(regex);
                        renderedLine = (
                          <span>
                            {parts[0]}
                            <button
                              onClick={() => setSelectedClaim(claim)}
                              className={`px-1.5 py-0.5 rounded font-bold transition border ${
                                claim.outcome === 'MATCH_FOUND' 
                                  ? 'bg-[#fff8e6] text-[#ffa600] border-[#ffa600]/30 hover:bg-[#ffecc0]'
                                  : 'bg-[#def6e4] text-[#33c758] border-[#33c758]/30 hover:bg-[#c9f0d1]'
                              }`}
                            >
                              {claim.item_string}
                            </button>
                            {parts[2]}
                          </span>
                        );
                        break;
                      }
                    }
                    return <div key={idx} className="min-h-[1.5rem]">{renderedLine}</div>;
                  })}
                </pre>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <FileText className="h-12 w-12 text-[#999999] mb-4" />
                  <p className="text-sm font-bold text-[#181925]">Upload first screenplay</p>
                  <p className="text-xs text-[#666666] mt-1">Upload a script revision in the left timeline to begin continuous clearance control.</p>
                </div>
              )}
            </section>

            <section className="w-96 bg-[#ffffff] flex flex-col overflow-hidden">
              {selectedClaim ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-[#e8e8e8] flex justify-between items-center bg-[#fafafa]">
                    <div>
                      <h3 className="font-bold text-base text-[#181925]">{selectedClaim.item_string}</h3>
                      <p className="text-xs text-[#666666] font-mono mt-0.5">{selectedClaim.item_type}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedClaim(null)}
                      className="text-xs text-[#666666] hover:bg-[#e8e8e8] px-2 py-1 rounded-md"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div>
                      <h4 className="text-[10px] font-mono text-[#999999] uppercase tracking-wider mb-2">Occurrences Context</h4>
                      <div className="space-y-1.5">
                        {selectedClaim.occurrences?.map((oc, i) => (
                          <div key={i} className="bg-[#fafafa] border border-[#e8e8e8] rounded-lg p-2.5 text-xs">
                            <div className="flex justify-between text-[10px] text-[#666666] mb-1">
                              <span>Scene {oc.scene_id}</span>
                              <span>Page {oc.page_number}</span>
                            </div>
                            <p className="font-bold text-[#181925]">&quot;{oc.occurrence_text}&quot;</p>
                            <p className="text-[10px] text-[#666666] italic mt-1">Snippet: {oc.context_snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#fafafa] p-4 rounded-xl border border-[#e8e8e8]">
                      <h4 className="text-[10px] font-mono text-[#999999] uppercase tracking-wider">Research Outcome</h4>
                      <p className={`text-base font-bold mt-1 ${selectedClaim.outcome === 'MATCH_FOUND' ? 'text-[#ffa600]' : 'text-[#33c758]'}`}>
                        {selectedClaim.outcome}
                      </p>
                      {selectedClaim.evidence.length > 0 ? (
                        <p className="text-xs text-[#666666] mt-1">{selectedClaim.evidence.length} sources matched verbatim.</p>
                      ) : (
                        <p className="text-xs text-[#666666] mt-1">No matches found in target scope.</p>
                      )}
                    </div>

                    {selectedClaim.evidence.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-mono text-[#999999] uppercase tracking-wider mb-2">Evidence Documentation</h4>
                        <div className="space-y-3">
                          {selectedClaim.evidence.map((ev, i) => (
                            <div key={i} className="bg-white border border-[#e8e8e8] rounded-xl p-3.5 shadow-sm text-xs">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-[#181925] truncate max-w-[160px]">{ev.title}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${ev.evidence_label === 'EXACT_MATCH' ? 'bg-[#fff8e6] text-[#ffa600]' : 'bg-[#def6e4] text-[#33c758]'}`}>
                                  {ev.evidence_label}
                                </span>
                              </div>
                              <p className="text-[#666666] leading-relaxed">{ev.excerpt}</p>
                              <a href={ev.url} target="_blank" rel="noreferrer" className="flex items-center text-[10px] text-[#918df6] mt-2 font-semibold">
                                <Globe className="h-3 w-3 mr-1" />
                                {ev.domain}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[#e8e8e8]">
                      <h4 className="text-xs font-mono text-[#999999] uppercase tracking-wider mb-2">Resolve / Find Alternatives</h4>
                      <div className="flex space-x-2 mb-3">
                        <input
                          type="text"
                          placeholder="Candidate alternative name..."
                          value={altInput}
                          onChange={(e) => setAltInput(e.target.value)}
                          className="flex-1 text-xs border border-[#e8e8e8] rounded-lg px-3 py-1.5"
                        />
                        <button
                          onClick={handleResolveAlternatives}
                          disabled={altLoading}
                          className="bg-[#918df6] text-white text-xs px-3 py-1.5 rounded-lg font-semibold"
                        >
                          {altLoading ? 'Searching...' : 'Resolve'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {alternatives.map((alt, idx) => (
                          <div key={idx} className="bg-[#fafafa] border border-[#e8e8e8] rounded-lg p-2.5 flex items-center justify-between text-xs">
                            <span className="font-semibold">{alt.alternative_name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${alt.outcome === 'MATCH_FOUND' ? 'bg-[#fff8e6] text-[#ffa600]' : 'bg-[#def6e4] text-[#33c758]'}`}>
                              {alt.outcome}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e8e8e8]">
                      <h4 className="text-xs font-mono text-[#999999] uppercase tracking-wider mb-2">Record Disposition</h4>
                      <div className="space-y-2">
                        {(['KEEP_FOR_COUNSEL_REVIEW', 'CHANGE_REQUESTED', 'PERMISSION_REQUIRED', 'ALTERNATIVE_SELECTED', 'PROCEED_PER_COUNSEL'] as string[]).map((dispo) => (
                          <button
                            key={dispo}
                            onClick={() => handleDisposition(selectedClaim.claim_id, dispo, 'Disposition updated by Clearance Team.')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs border ${selectedClaim.human_disposition === dispo ? 'bg-[#def6e4] text-[#33c758] border-[#33c758]' : 'border-[#e8e8e8] hover:bg-[#fafafa]'}`}
                          >
                            {dispo.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-[#e8e8e8]">
                    <h3 className="font-bold text-base text-[#181925]">Clearance work queue</h3>
                    
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#999999]" />
                      <input
                        type="text"
                        placeholder="Search queue..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs border border-[#e8e8e8] rounded-lg pl-9 pr-4 py-2 bg-[#fafafa]"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {['ALL', 'NEEDS_RESEARCH', 'MATCH_FOUND', 'NO_MATCH', 'AMBIGUOUS', 'STALE', 'NEEDS_DISPOSITION', 'RESOLVED'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setFilterType(f)}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono border ${filterType === f ? 'bg-[#918df6] text-white border-[#918df6]' : 'bg-[#fafafa] text-[#666666] border-[#e8e8e8] hover:bg-[#f5f5f5]'}`}
                        >
                          {f.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 divide-y divide-[#e8e8e8] overflow-y-auto">
                    {filteredClaims.map((claim) => (
                      <button
                        key={claim.claim_id}
                        onClick={() => setSelectedClaim(claim)}
                        className="w-full text-left p-4 hover:bg-[#fafafa] transition flex flex-col space-y-1.5"
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="font-bold text-xs text-[#181925]">{claim.item_string}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${claim.outcome === 'MATCH_FOUND' ? 'bg-[#fff8e6] text-[#ffa600]' : 'bg-[#def6e4] text-[#33c758]'}`}>
                            {claim.outcome}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-[#666666]">
                          <span>{claim.item_type}</span>
                          <span className="font-mono text-[#999999]">{claim.state}</span>
                        </div>
                      </button>
                    ))}
                    {filteredClaims.length === 0 && (
                      <p className="text-xs text-center text-[#666666] py-8">No matching clearance claims found.</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* PACKET TAB */}
        {activeTab === 'packet' && (
          <section className="flex-1 bg-[#ffffff] p-8 overflow-y-auto flex flex-col">
            <div className="border-b border-[#e8e8e8] pb-4 mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-[#181925]">Script Clearance Research Packet</h2>
                <p className="text-xs text-[#666666] mt-0.5">Verification status of active script revisions.</p>
              </div>
              {claims.length > 0 ? (
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${packetComplete ? 'bg-[#def6e4] text-[#33c758] border-[#33c758]' : 'bg-[#fff8e6] text-[#ffa600] border-[#ffa600]'}`}>
                  {packetComplete ? 'RESEARCH PACKET COMPLETE' : 'RESEARCH PACKET BLOCKED'}
                </span>
              ) : (
                <span className="px-4 py-1.5 rounded-full text-xs font-semibold border bg-gray-100 text-gray-500">
                  NO RESEARCH PACKET YET
                </span>
              )}
            </div>

            {claims.length > 0 ? (
              <div className="max-w-4xl bg-[#fafafa] border border-[#e8e8e8] rounded-2xl p-8 space-y-6">
                <div className="border-b border-[#e8e8e8] pb-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-[#181925]">{activeProject?.title}</h3>
                    <p className="text-xs text-[#666666] mt-1 font-mono">Revision ID: {activeRevisionId || 'No active revision'}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-[#666666] font-semibold">Incremental Run Lineage Provenance</p>
                    <p className="text-[#999999] mt-0.5">Retained searches saved: {claims.filter(c => c.state === 'ACTIVE').length}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-[#999999] uppercase tracking-wider">Claims Ledger</h4>
                  <div className="divide-y divide-[#e8e8e8]">
                    {claims.map((claim) => (
                      <div key={claim.claim_id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-[#181925]">{claim.item_string}</span>
                          <span className="text-[10px] text-[#666666] ml-2">({claim.item_type})</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-mono text-[#999999]">{claim.state}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${claim.outcome === 'MATCH_FOUND' ? 'bg-[#fff8e6] text-[#ffa600]' : 'bg-[#def6e4] text-[#33c758]'}`}>
                            {claim.outcome}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl bg-[#fafafa] border border-[#e8e8e8] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <FileCheck className="h-12 w-12 text-[#999999] mb-4" />
                <p className="text-sm font-bold text-[#181925]">No research packet yet</p>
                <p className="text-xs text-[#666666] mt-1">Upload the first screenplay revision to begin research packet audits.</p>
              </div>
            )}
          </section>
        )}

        {/* ASSURANCE TAB */}
        {activeTab === 'assurance' && (
          <section className="flex-1 bg-[#ffffff] p-8 overflow-y-auto flex flex-col">
            <div className="border-b border-[#e8e8e8] pb-4 mb-6">
              <h2 className="text-xl font-bold text-[#181925]">Technical Assurance Evidence Surface</h2>
              <p className="text-xs text-[#666666] mt-0.5">Auditable logs, model definitions, and Egress Firewall provenance metrics.</p>
            </div>

            {!activeProject ? (
              <div className="flex-1 bg-[#fafafa] border border-[#e8e8e8] rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <Key className="h-12 w-12 text-[#999999] mb-4" />
                <p className="text-sm font-bold text-[#181925]">No active production run</p>
                <p className="text-xs text-[#666666] mt-1">Assurance logs are run-scoped. Select or upload a screenplay to inspect audit trail.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#fafafa] border border-[#e8e8e8] rounded-2xl p-6 flex flex-col h-[500px]">
                  <h3 className="text-xs font-mono text-[#999999] uppercase tracking-wider mb-4">Outbound Query Egress Logs</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {egressLogs.map((log, idx) => (
                      <div key={idx} className="bg-[#ffffff] border border-[#e8e8e8] rounded-xl p-3.5 text-xs font-mono">
                        <div className="flex justify-between items-start">
                          <span className={log.allowed ? 'text-[#33c758]' : 'text-red-500'}>
                            {log.allowed ? 'ALLOWED_EGRESS' : 'EGRESS_BLOCKED'}
                          </span>
                          <span className="text-[10px] text-[#999999]">{log.timestamp.slice(11, 19)}</span>
                        </div>
                        <p className="text-[#181925] mt-1.5 font-bold">{log.query}</p>
                        <p className="text-[10px] text-[#666666] mt-1">Provenance: {log.provenance.join(', ')}</p>
                      </div>
                    ))}
                    {egressLogs.length === 0 && (
                      <p className="text-xs text-[#666666] text-center py-12">No egress audits recorded for this run.</p>
                    )}
                  </div>
                </div>

                <div className="bg-[#fafafa] border border-[#e8e8e8] rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-mono text-[#999999] uppercase tracking-wider mb-3">Model Configuration</h3>
                    <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-xl p-4 text-xs space-y-2">
                      <p><span className="font-semibold text-[#666666]">Google Model:</span> <code className="bg-[#f5f5f5] px-1 py-0.5 rounded font-mono">gemini-2.5-flash</code></p>
                      <p><span className="font-semibold text-[#666666]">Enterprise Vertex Route:</span> <code className="bg-[#f5f5f5] px-1 py-0.5 rounded font-mono">GOOGLE_GENAI_USE_ENTERPRISE=True</code></p>
                      <p><span className="font-semibold text-[#666666]">Region Location:</span> <code className="bg-[#f5f5f5] px-1 py-0.5 rounded font-mono">us-central1</code></p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-mono text-[#999999] uppercase tracking-wider mb-3">Claim Lineage Context</h3>
                    <div className="bg-[#ffffff] border border-[#e8e8e8] rounded-xl p-4 text-xs font-mono space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Active Revision:</span>
                        <span>{activeRevisionId || 'None'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Claims Count:</span>
                        <span>{claims.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Incremental Run saving:</span>
                        <span>{claims.filter(c => c.state === 'ACTIVE').length} hits saved</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
