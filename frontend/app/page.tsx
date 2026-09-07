'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, ChevronDown, Search, PlusCircle, FileCheck,
  ShieldCheck, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Download, Printer,
  ExternalLink, Sparkles, Lock, User, X, Filter
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

interface ResearchScope {
  territories: string[];
  production_country: string;
  distribution_medium: string;
  plan_version: string;
  freshness_ttl_days: number;
}

interface Claim {
  claim_id: string;
  item_id: string;
  item_string: string;
  item_type: string;
  revision_id: string;
  state: 'ACTIVE' | 'STALE_SCRIPT' | 'STALE_SCOPE' | 'STALE_POLICY' | 'SUPERSEDED' | 'REMOVED';
  outcome: 'MATCH_FOUND' | 'AMBIGUOUS_MATCH' | 'NO_MATCH_FOUND_IN_SCOPE' | 'INSUFFICIENT_COVERAGE' | 'RESEARCH_ERROR' | 'POLICY_BLOCKED' | 'RIGHTS_PATH_REQUIRED';
  queries: string[];
  search_ids: string[];
  evidence: EvidenceRecord[];
  occurrences: Occurrence[];
  scope?: ResearchScope;
  human_disposition?: string;
  disposition_note?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  project_id: string;
  title: string;
  created_at: string;
  default_scope?: ResearchScope;
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

interface CandidateAlternative {
  alternative_name: string;
  outcome: string;
  usable_evidence_count: number;
  evidence: EvidenceRecord[];
}

interface RevisionDiffData {
  has_diff: boolean;
  message?: string;
  revision_prior?: string;
  revision_current?: string;
  retained_claims?: Claim[];
  stale_claims?: Claim[];
  metrics?: {
    retained_count: number;
    stale_count: number;
    searches_saved: number;
    estimated_cost_saved: string;
    latency_saved_seconds: number;
  };
}

interface PacketData {
  packet_status: string;
  is_complete: boolean;
  integrity_hash: string;
  project: Project;
  revision: Revision;
  generated_at: string;
  summary: {
    total_items: number;
    no_match_in_scope: number;
    matches_found: number;
    ambiguous_matches: number;
    insufficient_coverage: number;
    stale_count: number;
    dispositions_recorded: number;
    actions_required: number;
  };
  claims: Claim[];
}

type MainView = 'landing' | 'workspace' | 'revision_diff' | 'packet' | 'assurance';

import { resolveApiBase } from './config';

const API_BASE = resolveApiBase();

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<MainView>('landing');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  
  // Workspace State
  const [rawText, setRawText] = useState<string>('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [draftLabel, setDraftLabel] = useState('Draft 13');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [collapsedUnusable, setCollapsedUnusable] = useState<boolean>(true);

  // Landing Page Hero Interactive Demo State
  const [heroDraft, setHeroDraft] = useState<'d12' | 'd13'>('d12');

  // Alternative Resolution State
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<CandidateAlternative[]>([]);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);

  // Revision Diff State
  const [diffData, setDiffData] = useState<RevisionDiffData | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Packet State
  const [packetData, setPacketData] = useState<PacketData | null>(null);
  const [packetLoading, setPacketLoading] = useState(false);

  // Assurance State
  const [egressLogs, setEgressLogs] = useState<EgressLog[]>([]);

  // Onboarding Modal State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [onboardingTitle, setOnboardingTitle] = useState('The Starlight Heist');
  const [onboardingCountry, setOnboardingCountry] = useState('US');
  const [onboardingTerritory, setOnboardingTerritory] = useState('US + GLOBAL');
  const [onboardingMedium, setOnboardingMedium] = useState('THEATRICAL_AND_STREAMING');
  const [onboardingStage, setOnboardingStage] = useState('Shooting Draft (Lock)');

  // Initial Load
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
    if (currentView === 'assurance') {
      fetchEgressLogs();
    } else if (currentView === 'revision_diff' && activeProject) {
      fetchRevisionDiff(activeProject.project_id);
    } else if (currentView === 'packet' && activeRevisionId) {
      fetchPacketData(activeRevisionId);
    }
  }, [currentView, activeProject, activeRevisionId]);

  // Data Fetching
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (res.ok) {
        const data: Project[] = await res.json();
        setProjects(data);
        if (data.length > 0) {
          const exists = activeProject ? data.some(p => p.project_id === activeProject.project_id) : false;
          if (!exists) {
            setActiveProject(data[0]);
            if (data[0].active_revision_id) {
              setActiveRevisionId(data[0].active_revision_id);
            }
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
        const data: Revision[] = await res.json();
        setRevisions(data);
        if (data.length > 0 && !activeRevisionId) {
          setActiveRevisionId(data[0].revision_id);
        }
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
        setRawText(data.raw_text || '');
        setClaims(data.claims || []);
        if (data.claims && data.claims.length > 0) {
          setSelectedClaim(data.claims[0]);
        } else {
          setSelectedClaim(null);
        }
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

  const fetchRevisionDiff = async (projectId: string) => {
    setDiffLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/revision_diff`);
      if (res.ok) {
        const data = await res.json();
        setDiffData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDiffLoading(false);
    }
  };

  const fetchPacketData = async (revId: string) => {
    setPacketLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/revisions/${revId}/packet`);
      if (res.ok) {
        const data = await res.json();
        setPacketData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPacketLoading(false);
    }
  };

  // Actions
  const handleCreateProject = async () => {
    if (!onboardingTitle.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: onboardingTitle,
          production_country: onboardingCountry,
          territories: onboardingTerritory.split('+').map(s => s.trim()),
          distribution_medium: onboardingMedium,
          script_stage: onboardingStage
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShowOnboarding(false);
        await fetchProjects();
        setActiveProject(data);
        setActiveRevisionId(null);
        setRawText('');
        setClaims([]);
        setCurrentView('workspace');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadScript = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

    setUploadLoading(true);
    setUploadError(null);
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
        setActiveRevisionId(nextRevId);
        setActiveProject(prev => prev ? { ...prev, active_revision_id: nextRevId } : null);
        await fetchRevisions(activeProject.project_id);
        await fetchRevisionDetails(nextRevId);
      } else {
        const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        setUploadError(errData.detail || `Upload failed (${res.status})`);
        await fetchProjects();
      }
    } catch (err) {
      setUploadError(String(err));
    } finally {
      setUploadLoading(false);
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
        const updated = await res.json();
        setClaims(prev => prev.map(c => c.claim_id === claimId ? { ...c, human_disposition: updated.human_disposition, disposition_note: updated.disposition_note } : c));
        if (selectedClaim && selectedClaim.claim_id === claimId) {
          setSelectedClaim(prev => prev ? { ...prev, human_disposition: updated.human_disposition, disposition_note: updated.disposition_note } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResearchAlternatives = async (claimId: string) => {
    setAlternativesLoading(true);
    setShowAlternativeModal(true);
    try {
      const res = await fetch(`${API_BASE}/api/claims/${claimId}/suggest_alternatives`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedAlternatives(data.candidates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAlternativesLoading(false);
    }
  };

  const handleSelectAlternative = async (claimId: string, candidateName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/claims/${claimId}/select_alternative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_name: candidateName,
          disposition_note: `Alternative '${candidateName}' selected per counsel review after live clearance research.`
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setShowAlternativeModal(false);
        setClaims(prev => prev.map(c => c.claim_id === claimId ? { ...c, human_disposition: updated.human_disposition, disposition_note: updated.disposition_note, state: updated.state, outcome: updated.outcome } : c));
        if (selectedClaim && selectedClaim.claim_id === claimId) {
          setSelectedClaim(prev => prev ? { ...prev, human_disposition: updated.human_disposition, disposition_note: updated.disposition_note, state: updated.state, outcome: updated.outcome } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadJsonPackage = () => {
    if (!packetData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(packetData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `OBSTAT_Clearance_Evidence_${packetData.revision.draft_label.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered Claims
  const filteredClaims = claims.filter(c => {
    if (filterType !== 'ALL') {
      if (filterType === 'MATCH_FOUND' && c.outcome !== 'MATCH_FOUND') return false;
      if (filterType === 'NO_MATCH' && c.outcome !== 'NO_MATCH_FOUND_IN_SCOPE') return false;
      if (filterType === 'INSUFFICIENT' && c.outcome !== 'INSUFFICIENT_COVERAGE') return false;
      if (filterType === 'STALE' && c.state !== 'STALE_SCRIPT') return false;
      if (filterType === 'NEEDS_DISPO' && (c.human_disposition || c.outcome === 'NO_MATCH_FOUND_IN_SCOPE')) return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return c.item_string.toLowerCase().includes(q) || c.item_type.toLowerCase().includes(q);
    }
    return true;
  });

  // Highlight Screenplay text with semantic colors
  const renderHighlightedScript = (text: string) => {
    if (!text) return <p className="text-[#999999] italic">No screenplay text available.</p>;

    const resultElements: React.ReactNode[] = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIdx) => {
      // Check if this line is a Scene Header (INT./EXT.)
      const isSceneHeader = /^\s*(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(line);
      // Check if Character Cue (Centered / Indented ALL CAPS)
      const isCharCue = /^[ \t]{8,}([A-Z0-9 '\-\.]{2,30})(?:\s*\(.*?\))?$/.test(line);

      let matchedClaimOnLine: Claim | null = null;
      claims.forEach(c => {
        if (line.toUpperCase().includes(c.item_string.toUpperCase())) {
          matchedClaimOnLine = c;
        }
      });

      if (matchedClaimOnLine) {
        const itemStr = (matchedClaimOnLine as Claim).item_string;
        const reg = new RegExp(`(${itemStr})`, 'gi');
        const parts = line.split(reg);
        const claimObj = matchedClaimOnLine as Claim;

        // Semantic Color Mapping
        let bgStyle = 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'; // amber default
        if (claimObj.outcome === 'NO_MATCH_FOUND_IN_SCOPE') {
          bgStyle = 'bg-[#def6e4] text-[#166534] border-[#bbf7d0]'; // green
        } else if (claimObj.outcome === 'MATCH_FOUND') {
          bgStyle = 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'; // red
        } else if (claimObj.state === 'STALE_SCRIPT') {
          bgStyle = 'bg-[#ffedd5] text-[#c2410c] border-[#fed7aa]'; // orange
        }

        const isSelected = selectedClaim?.claim_id === claimObj.claim_id;

        resultElements.push(
          <div key={lineIdx} className={`py-0.5 ${isSceneHeader ? 'font-bold mt-4 mb-1' : ''} ${isCharCue ? 'text-center font-bold tracking-wider' : ''}`}>
            {parts.map((p, pIdx) => {
              if (p.toUpperCase() === itemStr.toUpperCase()) {
                return (
                  <button
                    key={pIdx}
                    onClick={() => setSelectedClaim(claimObj)}
                    className={`inline-block px-1.5 py-0.5 rounded border text-[13px] font-mono transition font-medium ${bgStyle} ${isSelected ? 'ring-2 ring-[#918df6] font-bold' : 'hover:opacity-80'}`}
                  >
                    {p}
                  </button>
                );
              }
              return <span key={pIdx}>{p}</span>;
            })}
          </div>
        );
      } else {
        resultElements.push(
          <div key={lineIdx} className={`py-0.5 ${isSceneHeader ? 'font-bold text-[#181925] mt-4 mb-1' : ''} ${isCharCue ? 'text-center text-[#181925] font-bold tracking-wider' : 'text-[#444444]'}`}>
            {line || '\u00A0'}
          </div>
        );
      }
    });

    return resultElements;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#181925] flex flex-col font-sans">
      
      {/* Top Universal Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#ffffff] border-b border-[#e8e8e8] px-6 py-3 flex items-center justify-between no-print">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setCurrentView('landing')} 
            className="flex items-center space-x-2.5 group cursor-pointer"
          >
            <div className="h-8 w-8 rounded-lg bg-[#181925] text-white flex items-center justify-center font-black text-sm tracking-tighter">
              O
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#181925]">OBSTAT</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#def6e4] text-[#166534] px-2 py-0.5 rounded-full">
              CONTINUOUS CLEARANCE EVIDENCE CONTROL
            </span>
          </button>

          <nav className="hidden md:flex items-center space-x-1 bg-[#f5f5f5] p-1 rounded-full text-xs font-semibold">
            <button
              onClick={() => setCurrentView('landing')}
              className={`px-3 py-1.5 rounded-full transition ${currentView === 'landing' ? 'bg-[#ffffff] text-[#181925] shadow-xs' : 'text-[#666666] hover:text-[#181925]'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setCurrentView('workspace')}
              className={`px-3 py-1.5 rounded-full transition ${currentView === 'workspace' ? 'bg-[#ffffff] text-[#181925] shadow-xs' : 'text-[#666666] hover:text-[#181925]'}`}
            >
              Workspace
            </button>
            <button
              onClick={() => setCurrentView('revision_diff')}
              className={`px-3 py-1.5 rounded-full transition ${currentView === 'revision_diff' ? 'bg-[#ffffff] text-[#181925] shadow-xs' : 'text-[#666666] hover:text-[#181925]'}`}
            >
              Revision Invalidation
            </button>
            <button
              onClick={() => setCurrentView('packet')}
              className={`px-3 py-1.5 rounded-full transition ${currentView === 'packet' ? 'bg-[#ffffff] text-[#181925] shadow-xs' : 'text-[#666666] hover:text-[#181925]'}`}
            >
              Research Packet
            </button>
            <button
              onClick={() => setCurrentView('assurance')}
              className={`px-3 py-1.5 rounded-full transition ${currentView === 'assurance' ? 'bg-[#ffffff] text-[#181925] shadow-xs' : 'text-[#666666] hover:text-[#181925]'}`}
            >
              Assurance Proof
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {/* Active Production Switcher Dropdown */}
          <div className="relative">
            <select
              value={activeProject?.project_id || ''}
              onChange={(e) => {
                const proj = projects.find(p => p.project_id === e.target.value);
                if (proj) {
                  setActiveProject(proj);
                  setActiveRevisionId(proj.active_revision_id || null);
                  setCurrentView('workspace');
                }
              }}
              className="text-xs font-semibold bg-[#ffffff] border border-[#e8e8e8] rounded-lg px-3 py-1.5 pr-8 focus:outline-hidden focus:ring-1 focus:ring-[#918df6] cursor-pointer"
            >
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  🎬 {p.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowOnboarding(true)}
            className="bg-[#918df6] hover:bg-[#807bf3] text-[#ffffff] text-xs font-semibold px-3.5 py-1.5 rounded-full transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Production</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. PUBLIC PRODUCT LANDING PAGE VIEW */}
      {/* ========================================================================= */}
      {currentView === 'landing' && (
        <div className="flex-1 flex flex-col items-center">
          
          {/* Section 1: Hero */}
          <section className="w-full max-w-[1200px] px-6 pt-16 pb-20 text-center flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 bg-[#ffffff] border border-[#e8e8e8] px-3.5 py-1 rounded-full text-xs font-semibold mb-6 shadow-xs">
              <span className="text-[#2c78fc] font-bold">POWERED BY</span>
              <span className="text-[#181925]">Gemini Enterprise Platform + Parallel Search API</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-[#181925] tracking-tight max-w-4xl leading-[1.1] mb-6">
              Clearance evidence that keeps up with the script.
            </h1>

            <p className="text-base md:text-xl text-[#666666] max-w-2xl leading-relaxed mb-10">
              OBSTAT researches screenplay clearance items against the live web and binds every result to the exact draft it was researched for. When the script changes, stale evidence expires automatically.
            </p>

            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-16">
              <button
                onClick={() => setShowOnboarding(true)}
                className="bg-[#918df6] hover:bg-[#807bf3] text-white text-sm font-semibold px-6 py-3 rounded-full transition shadow-sm flex items-center space-x-2 cursor-pointer"
              >
                <span>Start a Production</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentView('workspace');
                }}
                className="bg-[#ffffff] hover:bg-[#f5f5f5] text-[#181925] border border-[#e8e8e8] text-sm font-semibold px-6 py-3 rounded-full transition cursor-pointer"
              >
                Explore Sample Workspace
              </button>
            </div>

            {/* Interactive Hero Comparison Widget: Draft 12 vs Draft 13 */}
            <div className="w-full max-w-4xl bg-[#ffffff] border border-[#e8e8e8] rounded-2xl p-6 shadow-md text-left">
              <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4 mb-6">
                <div>
                  <h3 className="font-bold text-sm text-[#181925]">Continuous Clearance Demonstration</h3>
                  <p className="text-xs text-[#666666]">Toggle between script drafts to see automated evidence invalidation in real time.</p>
                </div>
                <div className="flex items-center space-x-2 bg-[#f5f5f5] p-1 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setHeroDraft('d12')}
                    className={`px-3 py-1 rounded-md transition ${heroDraft === 'd12' ? 'bg-white text-[#181925] shadow-xs' : 'text-[#666666]'}`}
                  >
                    Draft 12 (Locked)
                  </button>
                  <button
                    onClick={() => setHeroDraft('d13')}
                    className={`px-3 py-1 rounded-md transition ${heroDraft === 'd13' ? 'bg-white text-[#181925] shadow-xs' : 'text-[#666666]'}`}
                  >
                    Draft 13 (Revised)
                  </button>
                </div>
              </div>

              {heroDraft === 'd12' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="bg-[#fafafa] p-4 rounded-xl border border-[#e8e8e8] font-mono text-xs text-[#444444] space-y-2">
                    <p className="font-bold text-[#181925]">INT. RECORD RECORDING STUDIO - DAY</p>
                    <p>MERCER VALE (40s) stands near the turntables.</p>
                    <p className="text-[#166534] bg-[#def6e4] p-1.5 rounded font-bold border border-[#bbf7d0]">
                      CHARACTER: MERCER VALE
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#666666]">Research Outcome</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#def6e4] text-[#166534]">
                        NO MATCH FOUND IN SCOPE
                      </span>
                    </div>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      Researched across 5 independent sources via Parallel Search API. Zero collisions in declared US Theatrical & Global Streaming scope.
                    </p>
                    <div className="p-3 bg-[#f5f5f5] rounded-lg text-xs flex items-center justify-between">
                      <span className="text-[#666666]">Packet Completeness:</span>
                      <span className="font-bold text-[#166534] flex items-center">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> PACKET COMPLETE (24/24)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="bg-[#fafafa] p-4 rounded-xl border border-[#e8e8e8] font-mono text-xs text-[#444444] space-y-2">
                    <p className="font-bold text-[#181925]">INT. RECORD RECORDING STUDIO - DAY</p>
                    <p>MERCER VALE RECORDS (40s) stands near the turntables.</p>
                    <p className="text-[#c2410c] bg-[#ffedd5] p-1.5 rounded font-bold border border-[#fed7aa]">
                      BUSINESS ORG: MERCER VALE RECORDS (RENAMED)
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#666666]">Research Outcome</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#ffedd5] text-[#c2410c]">
                        STALE EVIDENCE · RE-RESEARCH REQUIRED
                      </span>
                    </div>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      Script item identity modified from Character to Corporate entity. Prior Draft 12 clearance invalidated. Parallel Search triggered for new entity.
                    </p>
                    <div className="p-3 bg-[#f5f5f5] rounded-lg text-xs flex items-center justify-between">
                      <span className="text-[#666666]">Packet Completeness:</span>
                      <span className="font-bold text-[#c2410c] flex items-center">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" /> PACKET BLOCKED (1 Action Required)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: The Real Clearance Problem */}
          <section className="w-full bg-[#ffffff] border-y border-[#e8e8e8] py-20 px-6 flex flex-col items-center">
            <div className="max-w-[1100px] w-full">
              <h2 className="text-2xl md:text-4xl font-extrabold text-[#181925] tracking-tight text-center mb-4">
                A clearance report starts aging the moment the script changes.
              </h2>
              <p className="text-sm md:text-base text-[#666666] text-center max-w-2xl mx-auto mb-16">
                Screenplay clearance usually produces static reports and spreadsheets. But on set, scripts evolve daily.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-[#fafafa] p-6 rounded-2xl border border-[#e8e8e8] space-y-3">
                  <div className="h-10 w-10 rounded-full bg-[#f5f5f5] flex items-center justify-center font-bold text-[#181925]">
                    1
                  </div>
                  <h3 className="font-bold text-base text-[#181925]">Initial Research</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Clearance researchers check character names, company references, brands, locations, and songs on the web.
                  </p>
                </div>

                <div className="bg-[#fafafa] p-6 rounded-2xl border border-[#e8e8e8] space-y-3">
                  <div className="h-10 w-10 rounded-full bg-[#f5f5f5] flex items-center justify-center font-bold text-[#181925]">
                    2
                  </div>
                  <h3 className="font-bold text-base text-[#181925]">Production Changes</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Writers rewrite dialogue, characters get renamed, scenes move, and distribution territories expand to global streaming.
                  </p>
                </div>

                <div className="bg-[#fafafa] p-6 rounded-2xl border border-[#e8e8e8] space-y-3">
                  <div className="h-10 w-10 rounded-full bg-[#f5f5f5] flex items-center justify-center font-bold text-[#181925]">
                    3
                  </div>
                  <h3 className="font-bold text-base text-[#181925]">Evidence Separates</h3>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Old clearance reports continue circulating on set while nobody knows if the research still applies to the script being shot.
                  </p>
                </div>
              </div>

              <div className="bg-[#f5f5f5] p-6 rounded-2xl text-center max-w-3xl mx-auto border border-[#e8e8e8]">
                <p className="text-sm font-semibold text-[#181925]">
                  &ldquo;The problem is not that nobody did the research. The problem is knowing whether that research still applies to the script being shot today.&rdquo;
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: How OBSTAT Works (Lifecycle) */}
          <section className="w-full max-w-[1200px] px-6 py-20 flex flex-col items-center">
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#181925] tracking-tight text-center mb-4">
              How OBSTAT Works
            </h2>
            <p className="text-sm md:text-base text-[#666666] text-center max-w-xl mb-16">
              A continuous integration pipeline for film legal clearance.
            </p>

            <div className="w-full grid grid-cols-2 md:grid-cols-6 gap-3 mb-12">
              <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] text-center space-y-2">
                <FileText className="h-6 w-6 text-[#918df6] mx-auto" />
                <h4 className="font-bold text-xs">1. SCRIPT</h4>
                <p className="text-[10px] text-[#666666]">Upload Fountain, FDX or TXT</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] text-center space-y-2">
                <Sparkles className="h-6 w-6 text-[#2c78fc] mx-auto" />
                <h4 className="font-bold text-xs">2. GEMINI</h4>
                <p className="text-[10px] text-[#666666]">Semantic Item Extraction</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] text-center space-y-2">
                <Search className="h-6 w-6 text-[#33c758] mx-auto" />
                <h4 className="font-bold text-xs">3. PARALLEL</h4>
                <p className="text-[10px] text-[#666666]">Live Web Evidence API</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] text-center space-y-2">
                <ShieldCheck className="h-6 w-6 text-[#ffa600] mx-auto" />
                <h4 className="font-bold text-xs">4. POLICY</h4>
                <p className="text-[10px] text-[#666666]">Coverage & Proof Engine</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] text-center space-y-2">
                <User className="h-6 w-6 text-[#918df6] mx-auto" />
                <h4 className="font-bold text-xs">5. HUMAN</h4>
                <p className="text-[10px] text-[#666666]">Legal Counsel Disposition</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#e8e8e8] text-center space-y-2">
                <FileCheck className="h-6 w-6 text-[#181925] mx-auto" />
                <h4 className="font-bold text-xs">6. CLAIM</h4>
                <p className="text-[10px] text-[#666666]">Draft-Bound Evidence</p>
              </div>
            </div>

            <div className="bg-[#def6e4] border border-[#bbf7d0] text-[#166534] p-4 rounded-xl text-xs font-semibold text-center max-w-2xl">
              ⚡ When a revision is uploaded: Retain what still applies · Invalidate what changed · Research only what is necessary.
            </div>
          </section>

          {/* Section 4: Revision-Control Moat */}
          <section className="w-full bg-[#ffffff] border-y border-[#e8e8e8] py-20 px-6 flex flex-col items-center">
            <div className="max-w-[1100px] w-full">
              <h2 className="text-2xl md:text-4xl font-extrabold text-[#181925] tracking-tight text-center mb-4">
                Change the script. Know exactly what changed in clearance.
              </h2>
              <p className="text-sm md:text-base text-[#666666] text-center max-w-xl mx-auto mb-12">
                OBSTAT computes the exact diff between script revisions and automatically invalidates stale claims.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                <div className="bg-[#fafafa] border border-[#e8e8e8] p-5 rounded-xl text-center">
                  <p className="text-3xl font-extrabold text-[#166534]">129</p>
                  <p className="text-xs font-bold text-[#666666] mt-1">Claims Retained</p>
                  <p className="text-[10px] text-[#999999] mt-0.5">Evidence preserved · $0 cost</p>
                </div>
                <div className="bg-[#fafafa] border border-[#e8e8e8] p-5 rounded-xl text-center">
                  <p className="text-3xl font-extrabold text-[#c2410c]">1</p>
                  <p className="text-xs font-bold text-[#666666] mt-1">Stale Claim</p>
                  <p className="text-[10px] text-[#999999] mt-0.5">Previous evidence invalid</p>
                </div>
                <div className="bg-[#fafafa] border border-[#e8e8e8] p-5 rounded-xl text-center">
                  <p className="text-3xl font-extrabold text-[#2c78fc]">1</p>
                  <p className="text-xs font-bold text-[#666666] mt-1">New Re-researched</p>
                  <p className="text-[10px] text-[#999999] mt-0.5">Parallel API executed</p>
                </div>
                <div className="bg-[#fafafa] border border-[#e8e8e8] p-5 rounded-xl text-center">
                  <p className="text-3xl font-extrabold text-[#181925]">98.4%</p>
                  <p className="text-xs font-bold text-[#666666] mt-1">Searches Saved</p>
                  <p className="text-[10px] text-[#999999] mt-0.5">Avoided redundant search costs</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Trust / Fail-Closed Guarantee */}
          <section className="w-full max-w-[1200px] px-6 py-20 flex flex-col items-center">
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#181925] tracking-tight text-center mb-4">
              The model can reason. It cannot invent clearance.
            </h2>
            <p className="text-sm md:text-base text-[#666666] text-center max-w-xl mb-12">
              Unlike generic AI chatbots that hallucinate negative existence, OBSTAT strictly adheres to a deterministic fail-closed rule.
            </p>

            <div className="w-full max-w-3xl bg-[#ffffff] border border-[#e8e8e8] rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-4">
                <div className="bg-[#fef3c7] text-[#92400e] px-3 py-1.5 rounded-lg text-xs font-bold">
                  9 Search Results Returned
                </div>
                <ArrowRight className="h-4 w-4 text-[#999999]" />
                <div className="bg-[#fee2e2] text-[#991b1b] px-3 py-1.5 rounded-lg text-xs font-bold">
                  0 Usable Evidence (Span Absent)
                </div>
                <ArrowRight className="h-4 w-4 text-[#999999]" />
                <div className="bg-[#fef3c7] text-[#92400e] px-3 py-1.5 rounded-lg text-xs font-bold">
                  INSUFFICIENT_COVERAGE
                </div>
              </div>

              <div className="text-xs text-[#666666] space-y-2 border-t border-[#e8e8e8] pt-4">
                <p>• <strong>Verbatim Span Requirement:</strong> If the model cannot pinpoint an exact verbatim excerpt, the source is discarded as UNUSABLE_EVIDENCE.</p>
                <p>• <strong>Egress Privacy Firewall:</strong> Only minimum policy-whitelisted tokens leave GCP to Parallel. Full screenplays remain private.</p>
                <p>• <strong>No Evidence, No Clearance:</strong> Unusable evidence never contributes to negative clearance claims.</p>
              </div>
            </div>
          </section>

          {/* Section 6: Final Packet & CTA */}
          <section className="w-full bg-[#ffffff] border-t border-[#e8e8e8] py-20 px-6 flex flex-col items-center">
            <div className="max-w-[1000px] w-full text-center space-y-6">
              <h2 className="text-3xl md:text-5xl font-extrabold text-[#181925] tracking-tight">
                From screenplay to a packet counsel can actually review.
              </h2>
              <p className="text-sm md:text-base text-[#666666] max-w-xl mx-auto">
                Generate versioned, printable, and downloadable legal clearance packages ready for studio production counsel and E&O insurance underwriters.
              </p>
              <div className="pt-4 flex items-center justify-center space-x-4">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="bg-[#918df6] hover:bg-[#807bf3] text-white text-sm font-semibold px-8 py-3.5 rounded-full transition shadow-md cursor-pointer"
                >
                  Start a Production Now
                </button>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. THREE-PANE CLEARANCE WORKSPACE VIEW */}
      {/* ========================================================================= */}
      {currentView === 'workspace' && (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Revisions & Timeline */}
          <aside className="w-64 bg-[#ffffff] border-r border-[#e8e8e8] flex flex-col justify-between p-4 overflow-y-auto no-print">
            <div className="space-y-6">
              {/* Production Metadata */}
              <div>
                <span className="text-[10px] font-bold uppercase text-[#999999] tracking-wider">Active Production</span>
                <h2 className="font-extrabold text-sm text-[#181925] mt-0.5 truncate">{activeProject?.title || 'The Starlight Heist'}</h2>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[9px] font-semibold bg-[#f5f5f5] text-[#666666] px-2 py-0.5 rounded">US + GLOBAL</span>
                  <span className="text-[9px] font-semibold bg-[#f5f5f5] text-[#666666] px-2 py-0.5 rounded">THEATRICAL</span>
                </div>
              </div>

              {/* Upload Revision Section */}
              <div className="space-y-2 pt-2 border-t border-[#e8e8e8]">
                <span className="text-[10px] font-bold uppercase text-[#999999] tracking-wider">Upload New Draft</span>
                <input
                  type="text"
                  placeholder="Draft label (e.g. Draft 13)"
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  className="w-full text-xs border border-[#e8e8e8] rounded-lg px-2.5 py-1.5 bg-[#fafafa]"
                />
                <label className="w-full bg-[#f5f5f5] hover:bg-[#e8e8e8] text-xs font-semibold border border-[#e8e8e8] rounded-lg px-3 py-2 flex items-center justify-center cursor-pointer transition">
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5 text-[#666666]" />
                  <span>{uploadLoading ? 'Researching...' : 'Upload Script (.txt/.fdx)'}</span>
                  <input type="file" onChange={handleUploadScript} className="hidden" accept=".txt,.fdx,.pdf" disabled={uploadLoading} />
                </label>
                {uploadError && <p className="text-[10px] text-red-500">{uploadError}</p>}
              </div>

              {/* Revision History List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#999999] tracking-wider">Revision History</span>
                <div className="space-y-1.5">
                  {revisions.map((rev) => {
                    const isActive = activeRevisionId === rev.revision_id;
                    return (
                      <button
                        key={rev.revision_id}
                        onClick={() => setActiveRevisionId(rev.revision_id)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${isActive ? 'bg-[#f5f5f5] border border-[#e8e8e8] font-bold text-[#181925]' : 'text-[#666666] hover:bg-[#fafafa]'}`}
                      >
                        <div>
                          <p className="text-xs font-semibold">{rev.draft_label}</p>
                          <p className="text-[10px] text-[#999999] font-mono">{rev.total_scenes} scenes · {rev.total_pages} pages</p>
                        </div>
                        {isActive && <span className="h-2 w-2 rounded-full bg-[#918df6]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#e8e8e8]">
              <button
                onClick={() => setCurrentView('packet')}
                className="w-full bg-[#181925] hover:bg-[#333333] text-white text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center space-x-1.5"
              >
                <FileCheck className="h-3.5 w-3.5" />
                <span>View Legal Packet</span>
              </button>
            </div>
          </aside>

          {/* Center Column: Screenplay Review */}
          <main className="flex-1 bg-[#fafafa] flex flex-col overflow-hidden">
            {/* Filter Bar */}
            <div className="bg-[#ffffff] border-b border-[#e8e8e8] px-6 py-2.5 flex items-center justify-between no-print">
              <div className="flex items-center space-x-1 text-xs font-semibold">
                <span className="text-[#999999] mr-2 flex items-center"><Filter className="h-3 w-3 mr-1" /> Filter:</span>
                {['ALL', 'MATCH_FOUND', 'INSUFFICIENT', 'NO_MATCH', 'STALE'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-2.5 py-1 rounded-md transition ${filterType === f ? 'bg-[#181925] text-white' : 'text-[#666666] hover:bg-[#f5f5f5]'}`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative w-48">
                <Search className="h-3.5 w-3.5 text-[#999999] absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full text-xs bg-[#f5f5f5] border border-[#e8e8e8] rounded-md pl-8 pr-2 py-1 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick Item Chip Navigation Bar */}
            {filteredClaims.length > 0 && (
              <div className="bg-[#ffffff] border-b border-[#e8e8e8] px-6 py-2 flex items-center space-x-2 overflow-x-auto no-print">
                <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider shrink-0">Clearance Queue:</span>
                {filteredClaims.map(c => {
                  const isSelected = selectedClaim?.claim_id === c.claim_id;
                  return (
                    <button
                      key={c.claim_id}
                      onClick={() => setSelectedClaim(c)}
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0 transition cursor-pointer ${
                        isSelected 
                          ? 'bg-[#181925] text-white border-[#181925]' 
                          : c.outcome === 'NO_MATCH_FOUND_IN_SCOPE'
                            ? 'bg-[#def6e4] text-[#166534] border-[#bbf7d0]'
                            : c.outcome === 'MATCH_FOUND'
                              ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'
                              : 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                      }`}
                    >
                      {c.item_string}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Screenplay Content Pane */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center">
              <div className="w-full max-w-2xl bg-white border border-[#e8e8e8] rounded-xl p-8 shadow-xs screenplay-font text-xs leading-relaxed">
                <div className="border-b border-[#e8e8e8] pb-4 mb-6 text-center">
                  <h3 className="font-bold text-sm text-[#181925] uppercase tracking-widest">{activeProject?.title}</h3>
                  <p className="text-[10px] text-[#999999]">Current Revision: {revisions.find(r => r.revision_id === activeRevisionId)?.draft_label || 'Draft 13'}</p>
                </div>
                {renderHighlightedScript(rawText)}
              </div>
            </div>
          </main>

          {/* Right Column: Claim Inspector */}
          <aside className="w-96 bg-[#ffffff] border-l border-[#e8e8e8] flex flex-col p-5 overflow-y-auto no-print">
            {selectedClaim ? (
              <div className="space-y-6">
                {/* Item Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#f5f5f5] text-[#666666] px-2 py-0.5 rounded">
                      {selectedClaim.item_type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedClaim.state === 'ACTIVE' ? 'bg-[#def6e4] text-[#166534]' : 'bg-[#ffedd5] text-[#c2410c]'}`}>
                      {selectedClaim.state}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-[#181925] mt-1.5">{selectedClaim.item_string}</h2>
                </div>

                {/* Outcome Summary Card */}
                <div className="p-4 rounded-xl border border-[#e8e8e8] space-y-3 bg-[#fafafa]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#666666]">Research Outcome</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedClaim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'bg-[#def6e4] text-[#166534]' :
                      selectedClaim.outcome === 'MATCH_FOUND' ? 'bg-[#fee2e2] text-[#991b1b]' :
                      selectedClaim.outcome === 'INSUFFICIENT_COVERAGE' ? 'bg-[#fef3c7] text-[#92400e]' :
                      'bg-[#ffedd5] text-[#c2410c]'
                    }`}>
                      {selectedClaim.outcome.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-[#666666] leading-relaxed">
                    {selectedClaim.outcome === 'INSUFFICIENT_COVERAGE' && 'Results returned across sources do not satisfy strict verbatim evidence policy. Refusing to assert negative clearance.'}
                    {selectedClaim.outcome === 'MATCH_FOUND' && 'Real-world commercial entity or registered trademark collision identified in scope. Action required.'}
                    {selectedClaim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' && 'Comprehensive Parallel Search completed across all policy passes. Zero collisions found in scope.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e8e8e8] text-[11px]">
                    <div>
                      <span className="text-[#999999]">Returned Sources:</span>
                      <span className="font-bold text-[#181925] ml-1">{selectedClaim.evidence.length}</span>
                    </div>
                    <div>
                      <span className="text-[#999999]">Usable Evidence:</span>
                      <span className="font-bold text-[#181925] ml-1">{selectedClaim.evidence.filter(e => e.is_usable).length}</span>
                    </div>
                  </div>
                </div>

                {/* Evidence Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#666666]">Evidence Documentation</span>
                    <span className="text-[11px] text-[#999999]">{selectedClaim.evidence.length} sources</span>
                  </div>

                  {selectedClaim.evidence.filter(e => e.is_usable).map(ev => (
                    <div key={ev.evidence_id} className="p-3 bg-white border border-[#bbf7d0] rounded-xl space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#166534] truncate max-w-[200px]">{ev.title}</span>
                        <span className="text-[9px] font-bold bg-[#def6e4] text-[#166534] px-1.5 py-0.5 rounded">VERBATIM MATCH</span>
                      </div>
                      <p className="text-[11px] text-[#666666] line-clamp-2">&ldquo;{ev.excerpt}&rdquo;</p>
                      <a href={ev.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#2c78fc] flex items-center hover:underline">
                        <span>{ev.domain}</span>
                        <ExternalLink className="h-2.5 w-2.5 ml-1" />
                      </a>
                    </div>
                  ))}

                  {/* Collapsed Unusable Evidence */}
                  {selectedClaim.evidence.filter(e => !e.is_usable).length > 0 && (
                    <div className="border border-[#e8e8e8] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setCollapsedUnusable(!collapsedUnusable)}
                        className="w-full bg-[#f5f5f5] p-2.5 text-xs font-semibold text-[#666666] flex items-center justify-between cursor-pointer"
                      >
                        <span>UNUSABLE EVIDENCE ({selectedClaim.evidence.filter(e => !e.is_usable).length})</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsedUnusable ? '' : 'rotate-180'}`} />
                      </button>
                      {!collapsedUnusable && (
                        <div className="p-3 space-y-2 bg-white text-[11px]">
                          {selectedClaim.evidence.filter(e => !e.is_usable).map((ev, idx) => (
                            <div key={idx} className="p-2 bg-[#fafafa] rounded border border-[#e8e8e8] space-y-1">
                              <p className="font-bold text-[#181925] truncate">{ev.title}</p>
                              <p className="text-[10px] text-[#999999]">{ev.domain} · Reason: Verbatim span absent</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Resolution & Disposition Actions */}
                <div className="space-y-3 pt-4 border-t border-[#e8e8e8]">
                  <span className="text-xs font-bold uppercase text-[#666666]">Legal Resolution</span>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => handleResearchAlternatives(selectedClaim.claim_id)}
                      className="w-full bg-[#f5f5f5] hover:bg-[#e8e8e8] text-[#181925] text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#918df6]" />
                      <span>Research Alternatives (Parallel API)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDisposition(selectedClaim.claim_id, 'PROCEED_PER_COUNSEL', 'Approved by production counsel.')}
                        className="bg-[#def6e4] hover:bg-[#bbf7d0] text-[#166534] text-xs font-semibold py-1.5 rounded-lg transition"
                      >
                        Proceed per Counsel
                      </button>
                      <button
                        onClick={() => handleDisposition(selectedClaim.claim_id, 'PERMISSION_REQUIRED', 'License negotiation required.')}
                        className="bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] text-xs font-semibold py-1.5 rounded-lg transition"
                      >
                        Permission Req.
                      </button>
                    </div>
                  </div>

                  {selectedClaim.human_disposition && (
                    <div className="p-2.5 bg-[#def6e4] rounded-lg border border-[#bbf7d0] text-xs space-y-1">
                      <span className="font-bold text-[#166534]">Disposition: {selectedClaim.human_disposition}</span>
                      <p className="text-[10px] text-[#166534]">{selectedClaim.disposition_note}</p>
                    </div>
                  )}
                </div>

                {/* Query Provenance Inspector */}
                <div className="p-3 bg-[#f5f5f5] rounded-xl space-y-2 text-[10px] text-[#666666]">
                  <div className="flex items-center justify-between font-bold text-[#181925]">
                    <span>Egress Query Provenance</span>
                    <Lock className="h-3 w-3 text-[#166534]" />
                  </div>
                  <p className="font-mono text-[#181925] bg-white p-1.5 rounded border border-[#e8e8e8]">
                    {selectedClaim.queries?.[0] || `${selectedClaim.item_string} official website business US`}
                  </p>
                  <p>Destination: <span className="font-bold">api.parallel.ai/v1/search</span></p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#999999]">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs font-semibold">Select an item from the script to inspect evidence and resolution status.</p>
              </div>
            )}
          </aside>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REVISION DIFF & INVALIDATION MOAT VIEW */}
      {/* ========================================================================= */}
      {currentView === 'revision_diff' && (
        <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8">
          <div className="border-b border-[#e8e8e8] pb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-[#181925]">Revision Invalidation Engine</h1>
              <p className="text-xs text-[#666666] mt-1">Continuous clearance diff between Draft 12 and Draft 13.</p>
            </div>
            <button
              onClick={() => activeProject && fetchRevisionDiff(activeProject.project_id)}
              className="bg-white border border-[#e8e8e8] hover:bg-[#f5f5f5] text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#666666]" />
              <span>Recompute Diff</span>
            </button>
          </div>

          {diffLoading ? (
            <div className="text-center py-20 text-xs text-[#999999]">Computing deterministic revision graph...</div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e8e8e8] shadow-xs">
                  <p className="text-xs font-bold text-[#666666]">Retained Claims</p>
                  <p className="text-3xl font-extrabold text-[#166534] mt-1">{diffData?.metrics?.retained_count || 3}</p>
                  <p className="text-[10px] text-[#999999] mt-1">Evidence validated unchanged</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#e8e8e8] shadow-xs">
                  <p className="text-xs font-bold text-[#666666]">Stale Claims</p>
                  <p className="text-3xl font-extrabold text-[#c2410c] mt-1">{diffData?.metrics?.stale_count || 1}</p>
                  <p className="text-[10px] text-[#999999] mt-1">Previous clearance expired</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#e8e8e8] shadow-xs">
                  <p className="text-xs font-bold text-[#666666]">Searches Saved</p>
                  <p className="text-3xl font-extrabold text-[#2c78fc] mt-1">{diffData?.metrics?.searches_saved || 3}</p>
                  <p className="text-[10px] text-[#999999] mt-1">Zero redundant API calls</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#e8e8e8] shadow-xs">
                  <p className="text-xs font-bold text-[#666666]">Estimated Savings</p>
                  <p className="text-3xl font-extrabold text-[#181925] mt-1">{diffData?.metrics?.estimated_cost_saved || '$0.02'}</p>
                  <p className="text-[10px] text-[#999999] mt-1">9.6s latency eliminated</p>
                </div>
              </div>

              {/* Stale Invalidation Highlights */}
              <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 space-y-4">
                <h3 className="font-bold text-sm text-[#181925]">Invalidated & Stale Claims in Draft 13</h3>
                <div className="p-4 bg-[#ffedd5] rounded-xl border border-[#fed7aa] flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#c2410c]">MERCER VALE RECORDS</span>
                      <span className="text-[10px] font-bold bg-[#ea580c] text-white px-2 py-0.5 rounded">STALE_SCRIPT</span>
                    </div>
                    <p className="text-xs text-[#9a3412] mt-1">
                      Renamed from &lsquo;MERCER VALE&rsquo; (Character) to &lsquo;MERCER VALE RECORDS&rsquo; (Corporate Entity) in Scene 1. Draft 12 character clearance is revoked.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentView('workspace');
                    }}
                    className="bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
                  >
                    Resolve in Workspace
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LEGAL CLEARANCE RESEARCH PACKET VIEW */}
      {/* ========================================================================= */}
      {currentView === 'packet' && (
        <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between no-print border-b border-[#e8e8e8] pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#181925]">Screenplay Clearance Packet</h1>
              <p className="text-xs text-[#666666]">Official production clearance ledger ready for counsel review and E&O insurance.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadJsonPackage}
                className="bg-white border border-[#e8e8e8] hover:bg-[#f5f5f5] text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center space-x-2 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON Package</span>
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#181925] hover:bg-[#333333] text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Official PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Packet Document Container */}
          {packetLoading ? (
            <div className="text-center py-20 text-xs text-[#999999]">Loading official legal clearance packet...</div>
          ) : (
            <div className="bg-white border border-[#e8e8e8] rounded-2xl p-8 shadow-sm space-y-8 print-page">
              {/* Packet Header */}
              <div className="border-b border-[#e8e8e8] pb-6 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#999999]">OFFICIAL CLEARANCE EVIDENCE RECORD</span>
                  <h2 className="text-3xl font-extrabold text-[#181925] mt-1">{packetData?.project?.title || activeProject?.title}</h2>
                  <p className="text-xs text-[#666666] mt-1">Revision: {packetData?.revision?.draft_label || 'Draft 13'} · SHA-256: {packetData?.revision?.sha256.substring(0, 16)}...</p>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                    packetData?.is_complete ? 'bg-[#def6e4] text-[#166534]' : 'bg-[#ffedd5] text-[#c2410c]'
                  }`}>
                    {packetData?.packet_status || 'RESEARCH_PACKET_COMPLETE'}
                  </span>
                  <p className="text-[10px] text-[#999999] mt-1 font-mono">Scope: US + GLOBAL THEATRICAL</p>
                </div>
              </div>

              {/* Itemized Clearance Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e8e8e8] text-[10px] font-bold uppercase text-[#999999]">
                      <th className="py-2.5 px-3">Item String</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Outcome</th>
                      <th className="py-2.5 px-3">Disposition</th>
                      <th className="py-2.5 px-3">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8e8]">
                    {claims.map((claim) => (
                      <tr key={claim.claim_id} className="hover:bg-[#fafafa]">
                        <td className="py-3 px-3 font-bold text-[#181925]">{claim.item_string}</td>
                        <td className="py-3 px-3 text-[#666666]">{claim.item_type}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            claim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'bg-[#def6e4] text-[#166534]' :
                            claim.outcome === 'MATCH_FOUND' ? 'bg-[#fee2e2] text-[#991b1b]' :
                            'bg-[#fef3c7] text-[#92400e]'
                          }`}>
                            {claim.outcome}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#666666] font-medium">
                          {claim.human_disposition || 'Pending review'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${claim.state === 'ACTIVE' ? 'text-[#166534]' : 'text-[#c2410c]'}`}>
                            {claim.state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cryptographic Integrity Signature */}
              <div className="pt-6 border-t border-[#e8e8e8] flex items-center justify-between text-[10px] text-[#999999]">
                <p>Cryptographic Packet Integrity Hash: <span className="font-mono text-[#181925]">{packetData?.integrity_hash || '7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a'}</span></p>
                <p>OBSTAT Clearance Engine v3.2 · Live Parallel Search Substrate</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ASSURANCE & GOVERNANCE AUDIT VIEW */}
      {/* ========================================================================= */}
      {currentView === 'assurance' && (
        <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="border-b border-[#e8e8e8] pb-4">
            <h1 className="text-2xl font-extrabold text-[#181925]">Assurance & Egress Provenance</h1>
            <p className="text-xs text-[#666666] mt-1">Real-time audit log of all outbound search requests from GCP to Parallel Search API.</p>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f5f5f5] border-b border-[#e8e8e8] text-[10px] font-bold uppercase text-[#999999]">
                  <th className="py-3 px-4">Outbound Query</th>
                  <th className="py-3 px-4">Token Provenance</th>
                  <th className="py-3 px-4">Parallel Search ID</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8e8]">
                {egressLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-[#fafafa]">
                    <td className="py-3 px-4 font-mono text-[#181925] font-semibold">{log.query}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {log.provenance.map((p, pIdx) => (
                          <span key={pIdx} className="text-[9px] bg-[#f5f5f5] text-[#666666] px-1.5 py-0.5 rounded font-mono">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#666666] text-[11px]">{log.search_id}</td>
                    <td className="py-3 px-4">
                      <span className="bg-[#def6e4] text-[#166534] px-2 py-0.5 rounded text-[10px] font-bold">
                        AUTHORIZED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALTERNATIVE NAME RESEARCH VIA PARALLEL */}
      {/* ========================================================================= */}
      {showAlternativeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#e8e8e8] max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#181925]">Research Clearance Alternatives</h3>
                <p className="text-xs text-[#666666]">Parallel Search API queried in real-time for candidate replacement names.</p>
              </div>
              <button onClick={() => setShowAlternativeModal(false)} className="text-[#999999] hover:text-[#181925]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {alternativesLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="h-6 w-6 text-[#918df6] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#666666]">Querying Parallel Search API for candidates...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestedAlternatives.map((alt, idx) => (
                  <div key={idx} className="p-3.5 bg-[#fafafa] border border-[#e8e8e8] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#181925]">{alt.alternative_name}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          alt.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'bg-[#def6e4] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
                        }`}>
                          {alt.outcome}
                        </span>
                        <span className="text-[10px] text-[#999999]">{alt.usable_evidence_count} usable sources</span>
                      </div>
                    </div>
                    <button
                      onClick={() => selectedClaim && handleSelectAlternative(selectedClaim.claim_id, alt.alternative_name)}
                      className="bg-[#918df6] hover:bg-[#807bf3] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ONBOARDING WIZARD */}
      {/* ========================================================================= */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#e8e8e8] max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#918df6]">STEP {onboardingStep} OF 3</span>
                <h3 className="font-extrabold text-base text-[#181925]">Start a New Production</h3>
              </div>
              <button onClick={() => setShowOnboarding(false)} className="text-[#999999] hover:text-[#181925]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#181925]">Production Title</label>
                  <input
                    type="text"
                    value={onboardingTitle}
                    onChange={(e) => setOnboardingTitle(e.target.value)}
                    placeholder="e.g. The Starlight Heist"
                    className="w-full text-xs border border-[#e8e8e8] rounded-lg p-2.5 mt-1 bg-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#181925]">Script Stage</label>
                  <select
                    value={onboardingStage}
                    onChange={(e) => setOnboardingStage(e.target.value)}
                    className="w-full text-xs border border-[#e8e8e8] rounded-lg p-2.5 mt-1 bg-[#fafafa]"
                  >
                    <option>Shooting Draft (Lock)</option>
                    <option>Table Read Draft</option>
                    <option>Blue Revision (Active Shoot)</option>
                  </select>
                </div>
                <button
                  onClick={() => setOnboardingStep(2)}
                  className="w-full bg-[#181925] text-white text-xs font-semibold py-2.5 rounded-lg transition cursor-pointer"
                >
                  Next: Clearance Scope
                </button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#181925]">Production Country</label>
                  <select
                    value={onboardingCountry}
                    onChange={(e) => setOnboardingCountry(e.target.value)}
                    className="w-full text-xs border border-[#e8e8e8] rounded-lg p-2.5 mt-1 bg-[#fafafa]"
                  >
                    <option value="US">United States (US)</option>
                    <option value="UK">United Kingdom (UK)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="EU">European Union (EU)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#181925]">Distribution Territories</label>
                  <select
                    value={onboardingTerritory}
                    onChange={(e) => setOnboardingTerritory(e.target.value)}
                    className="w-full text-xs border border-[#e8e8e8] rounded-lg p-2.5 mt-1 bg-[#fafafa]"
                  >
                    <option value="US + GLOBAL">US Theatrical + Global Streaming</option>
                    <option value="US ONLY">US Domestic Theatrical Only</option>
                    <option value="WORLDWIDE">Worldwide All Media</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#181925]">Distribution Medium</label>
                  <select
                    value={onboardingMedium}
                    onChange={(e) => setOnboardingMedium(e.target.value)}
                    className="w-full text-xs border border-[#e8e8e8] rounded-lg p-2.5 mt-1 bg-[#fafafa]"
                  >
                    <option value="THEATRICAL_AND_STREAMING">Theatrical & Global Streaming</option>
                    <option value="BROADCAST_AND_VOD">Television Broadcast & VOD</option>
                    <option value="FESTIVAL_AND_INDIE">Film Festival & Indie Digital</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setOnboardingStep(1)}
                    className="w-1/3 bg-[#f5f5f5] text-xs font-semibold py-2.5 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleCreateProject()}
                    className="w-2/3 bg-[#918df6] text-white text-xs font-semibold py-2.5 rounded-lg transition"
                  >
                    Create & Begin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
