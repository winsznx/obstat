'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, ChevronDown, Search, PlusCircle, FileCheck,
  ShieldCheck, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Download, Printer,
  ExternalLink, Sparkles, Lock, User, X, Filter, Menu, Layers, Info, Check
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
  retrieved_at?: string;
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
  state: 'ACTIVE' | 'STALE_SCRIPT' | 'STALE_SCOPE' | 'STALE_POLICY' | 'STALE_AGE' | 'SUPERSEDED' | 'REMOVED' | 'DISPOSITION_VIOLATION';
  outcome: 'MATCH_FOUND' | 'AMBIGUOUS_MATCH' | 'NO_MATCH_FOUND_IN_SCOPE' | 'INSUFFICIENT_COVERAGE' | 'RESEARCH_ERROR' | 'POLICY_BLOCKED' | 'RIGHTS_PATH_REQUIRED';
  queries: string[];
  search_ids: string[];
  evidence: EvidenceRecord[];
  occurrences: Occurrence[];
  scope?: ResearchScope;
  human_disposition?: string;
  disposition_note?: string;
  invalidation_reason?: string;
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
  mode?: string;
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
  disposition_violations?: Claim[];
  metrics?: {
    retained_count: number;
    stale_count: number;
    searches_saved: number;
    estimated_cost_saved: string;
    latency_saved_seconds: number;
  };
}

interface BlockedReason {
  claim_id?: string;
  item_string: string;
  reason: string;
}

interface PacketData {
  packet_status: string;
  is_complete: boolean;
  integrity_hash: string;
  project: Project;
  revision: Revision;
  generated_at: string;
  blocked_reasons?: BlockedReason[];
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
  // Navigation & Responsive State
  const [currentView, setCurrentView] = useState<MainView>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Initial Data Fetching
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
      fetchEgressLogs(activeProject?.project_id);
    } else if (currentView === 'revision_diff' && activeProject) {
      fetchRevisionDiff(activeProject.project_id);
    } else if (currentView === 'packet' && activeRevisionId) {
      fetchPacketData(activeRevisionId);
    }
  }, [currentView, activeProject, activeRevisionId]);

  // Data Fetching Functions
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (res.ok) {
        const data: Project[] = await res.json();
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
          if (data[0].active_revision_id) {
            setActiveRevisionId(data[0].active_revision_id);
          }
        }
      }
    } catch (err) {
      console.error('fetchProjects error:', err);
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
      console.error('fetchRevisions error:', err);
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
      console.error('fetchRevisionDetails error:', err);
    }
  };

  const fetchEgressLogs = async (projectId?: string) => {
    try {
      const url = projectId 
        ? `${API_BASE}/api/projects/${projectId}/assurance/egress_logs`
        : `${API_BASE}/api/assurance/egress_logs`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEgressLogs(data);
      }
    } catch (err) {
      console.error('fetchEgressLogs error:', err);
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
      console.error('fetchRevisionDiff error:', err);
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
      console.error('fetchPacketData error:', err);
    } finally {
      setPacketLoading(false);
    }
  };

  // Dedicated Controlled Sample Workspace Handler
  const handleExploreSampleWorkspace = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/sample`);
      if (res.ok) {
        const sampleProj: Project = await res.json();
        setActiveProject(sampleProj);
        if (sampleProj.active_revision_id) {
          setActiveRevisionId(sampleProj.active_revision_id);
        }
        await fetchRevisions(sampleProj.project_id);
        setCurrentView('workspace');
        return;
      }
    } catch (err) {
      console.error('Failed to fetch dedicated sample workspace:', err);
    }
    const sampleInList = projects.find(p => p.title.includes('Starlight') || p.project_id === 'proj_starlight_01');
    if (sampleInList) {
      setActiveProject(sampleInList);
      if (sampleInList.active_revision_id) {
        setActiveRevisionId(sampleInList.active_revision_id);
      }
    }
    setCurrentView('workspace');
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
        return;
      }
    } catch (err) {

      console.error('Project creation failed:', err);
      if (process.env.NODE_ENV !== 'production') {
        const fallbackProject: Project = {
          project_id: `proj_local_${Date.now()}`,
          title: onboardingTitle,
          created_at: new Date().toISOString(),
          default_scope: {
            territories: onboardingTerritory.split('+').map(s => s.trim()),
            production_country: onboardingCountry,
            distribution_medium: onboardingMedium,
            plan_version: 'v1.0',
            freshness_ttl_days: 30
          },
          active_revision_id: undefined
        };
        setShowOnboarding(false);
        setProjects(prev => [fallbackProject, ...prev]);
        setActiveProject(fallbackProject);
        setActiveRevisionId(null);
        setRawText('');
        setClaims([]);
        setCurrentView('workspace');
        return;
      }
      setUploadError('Unable to connect to backend server. Please verify network or API URL.');
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
        if (activeRevisionId) fetchPacketData(activeRevisionId);
      }
    } catch (err) {
      console.error('handleDisposition error:', err);
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
      console.error('handleResearchAlternatives error:', err);
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
        if (activeRevisionId) fetchPacketData(activeRevisionId);
      }
    } catch (err) {
      console.error('handleSelectAlternative error:', err);
    }
  };

  const downloadJsonPackage = () => {
    if (!packetData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(packetData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `OBSTAT_Clearance_Evidence_${packetData.revision?.draft_label?.replace(/\s+/g, '_') || 'Package'}.json`);
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
      if (filterType === 'STALE' && c.state !== 'ACTIVE') return false;
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
    if (!text) return <p className="text-[#94a3b8] italic">No screenplay text available for this revision.</p>;

    const resultElements: React.ReactNode[] = [];
    const lines = text.split('\n');

    lines.forEach((line, lineIdx) => {
      const isSceneHeader = /^\s*(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.)/i.test(line);
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

        let bgStyle = 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
        if (claimObj.outcome === 'NO_MATCH_FOUND_IN_SCOPE') {
          bgStyle = 'bg-[#dcfce7] text-[#15803d] border-[#86efac]';
        } else if (claimObj.outcome === 'MATCH_FOUND') {
          bgStyle = 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]';
        } else if (claimObj.state !== 'ACTIVE') {
          bgStyle = 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]';
        }

        const isSelected = selectedClaim?.claim_id === claimObj.claim_id;

        resultElements.push(
          <div key={lineIdx} className={`py-0.5 ${isSceneHeader ? 'font-bold mt-4 mb-1 text-[#0f172a]' : ''} ${isCharCue ? 'text-center font-bold tracking-wider text-[#0f172a]' : ''}`}>
            {parts.map((p, pIdx) => {
              if (p.toUpperCase() === itemStr.toUpperCase()) {
                return (
                  <button
                    key={pIdx}
                    onClick={() => setSelectedClaim(claimObj)}
                    className={`inline-block px-1.5 py-0.5 rounded border text-[13px] font-mono transition font-medium cursor-pointer ${bgStyle} ${isSelected ? 'ring-2 ring-[#4f46e5] font-bold shadow-xs' : 'hover:opacity-85'}`}
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
          <div key={lineIdx} className={`py-0.5 ${isSceneHeader ? 'font-bold text-[#0f172a] mt-4 mb-1' : ''} ${isCharCue ? 'text-center text-[#0f172a] font-bold tracking-wider' : 'text-[#334155]'}`}>
            {line || '\u00A0'}
          </div>
        );
      }
    });

    return resultElements;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans antialiased">
      
      {/* Top Universal Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e2e8f0] px-4 sm:px-6 py-3 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setCurrentView('landing')} 
              className="flex items-center space-x-2.5 group cursor-pointer"
            >
              <div className="h-8 w-8 rounded-lg bg-[#0f172a] text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-xs">
                O
              </div>
              <span className="font-extrabold text-lg tracking-tight text-[#0f172a]">OBSTAT</span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#15803d] px-2 py-0.5 rounded-full border border-[#86efac]">
                CONTINUOUS CLEARANCE EVIDENCE CONTROL
              </span>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 bg-[#f1f5f9] p-1 rounded-full text-xs font-semibold border border-[#e2e8f0]">
              <button
                onClick={() => setCurrentView('landing')}
                className={`px-3 py-1.5 rounded-full transition ${currentView === 'landing' ? 'bg-white text-[#0f172a] shadow-xs font-bold' : 'text-[#64748b] hover:text-[#0f172a]'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setCurrentView('workspace')}
                className={`px-3 py-1.5 rounded-full transition ${currentView === 'workspace' ? 'bg-white text-[#0f172a] shadow-xs font-bold' : 'text-[#64748b] hover:text-[#0f172a]'}`}
              >
                Workspace
              </button>
              <button
                onClick={() => setCurrentView('revision_diff')}
                className={`px-3 py-1.5 rounded-full transition ${currentView === 'revision_diff' ? 'bg-white text-[#0f172a] shadow-xs font-bold' : 'text-[#64748b] hover:text-[#0f172a]'}`}
              >
                Revision Invalidation
              </button>
              <button
                onClick={() => setCurrentView('packet')}
                className={`px-3 py-1.5 rounded-full transition ${currentView === 'packet' ? 'bg-white text-[#0f172a] shadow-xs font-bold' : 'text-[#64748b] hover:text-[#0f172a]'}`}
              >
                Research Packet
              </button>
              <button
                onClick={() => setCurrentView('assurance')}
                className={`px-3 py-1.5 rounded-full transition ${currentView === 'assurance' ? 'bg-white text-[#0f172a] shadow-xs font-bold' : 'text-[#64748b] hover:text-[#0f172a]'}`}
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
                  }
                }}
                className="bg-[#f8fafc] border border-[#cbd5e1] text-[#0f172a] text-xs font-semibold rounded-xl px-3 py-2 pr-7 max-w-[170px] sm:max-w-[220px] truncate cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
              >
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setOnboardingStep(1); setShowOnboarding(true); }}
              className="bg-[#0f172a] hover:bg-[#334155] text-white text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Production</span>
            </button>

            {/* Mobile Navigation Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-[#0f172a]"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-[#e2e8f0] mt-3 space-y-1 bg-white">
            <button
              onClick={() => { setCurrentView('landing'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${currentView === 'landing' ? 'bg-[#f1f5f9] text-[#0f172a] font-bold' : 'text-[#64748b]'}`}
            >
              Overview & Product Architecture
            </button>
            <button
              onClick={() => { setCurrentView('workspace'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${currentView === 'workspace' ? 'bg-[#f1f5f9] text-[#0f172a] font-bold' : 'text-[#64748b]'}`}
            >
              Screenplay Workspace
            </button>
            <button
              onClick={() => { setCurrentView('revision_diff'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${currentView === 'revision_diff' ? 'bg-[#f1f5f9] text-[#0f172a] font-bold' : 'text-[#64748b]'}`}
            >
              Revision Invalidation Engine
            </button>
            <button
              onClick={() => { setCurrentView('packet'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${currentView === 'packet' ? 'bg-[#f1f5f9] text-[#0f172a] font-bold' : 'text-[#64748b]'}`}
            >
              Research Clearance Packet
            </button>
            <button
              onClick={() => { setCurrentView('assurance'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${currentView === 'assurance' ? 'bg-[#f1f5f9] text-[#0f172a] font-bold' : 'text-[#64748b]'}`}
            >
              Assurance & Egress Audit
            </button>
          </div>
        )}
      </header>

      {/* Main View Router */}
      {currentView === 'landing' && (
        <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-[#e0e7ff] text-[#3730a3] px-3 py-1 rounded-full border border-[#c7d2fe]">
              Google Cloud Agentic Cinema Hackathon · Parallel Track
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-[#0f172a] tracking-tight leading-tight">
              Clearance evidence that keeps up with the script.
            </h1>
            <p className="text-base text-[#475569] leading-relaxed">
              OBSTAT researches screenplay clearance items against live Parallel Search evidence and binds every result to exact claim dependencies. When script revisions happen, stale evidence expires automatically.
            </p>
            <div className="flex items-center justify-center space-x-4 pt-2 flex-wrap gap-3">
              <button
                onClick={() => { setOnboardingStep(1); setShowOnboarding(true); }}
                className="bg-[#0f172a] hover:bg-[#334155] text-white text-sm font-semibold px-6 py-3 rounded-full transition flex items-center space-x-2 shadow-md cursor-pointer"
              >
                <span>Start a Production</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleExploreSampleWorkspace}
                className="bg-white hover:bg-[#f8fafc] text-[#0f172a] border border-[#cbd5e1] text-sm font-semibold px-6 py-3 rounded-full transition cursor-pointer shadow-xs"
              >
                Explore Sample Workspace
              </button>
            </div>

            {/* Controlled Demonstration Widget: Sample Project Illustrative Mechanism */}
            <div className="w-full max-w-4xl bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-md text-left space-y-4 mx-auto mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-4 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] px-2 py-0.5 rounded uppercase">
                      Controlled Architecture Demonstration (Sample Fixture)
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#0f172a] mt-1">CDGI Continuous Clearance Invalidation Engine</h3>
                  <p className="text-xs text-[#64748b]">Sample Project: &lsquo;The Starlight Heist&rsquo; — Toggle drafts below to preview continuous invalidation mechanism in action.</p>
                </div>
                <div className="flex items-center space-x-2 bg-[#f1f5f9] p-1 rounded-xl text-xs font-semibold border border-[#e2e8f0] w-fit shrink-0">
                  <button
                    onClick={() => setHeroDraft('d12')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${heroDraft === 'd12' ? 'bg-white text-[#0f172a] shadow-xs font-bold' : 'text-[#64748b]'}`}
                  >
                    Draft 12 (Locked)
                  </button>
                  <button
                    onClick={() => setHeroDraft('d13')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${heroDraft === 'd13' ? 'bg-white text-[#0f172a] shadow-xs font-bold' : 'text-[#64748b]'}`}
                  >
                    Draft 13 (Revised)
                  </button>
                </div>
              </div>

              {heroDraft === 'd12' ? (
                <div className="p-4 bg-[#f0fdf4] rounded-xl border border-[#bbf7d0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#166534]">MERCER VALE</span>
                      <span className="text-[10px] font-bold bg-[#dcfce7] text-[#15803d] px-2 py-0.5 rounded border border-[#86efac]">ACTIVE · RETAINED</span>
                    </div>
                    <p className="text-xs text-[#15803d] mt-1">Draft 12 character clearance verified against public directories. Zero real-world collisions in scope.</p>
                  </div>
                  <button onClick={handleExploreSampleWorkspace} className="text-xs font-bold text-[#15803d] hover:underline cursor-pointer shrink-0">
                    OPEN SAMPLE WORKSPACE &rarr;
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-[#fff7ed] rounded-xl border border-[#ffedd5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#c2410c]">MERCER VALE RECORDS</span>
                      <span className="text-[10px] font-bold bg-[#ea580c] text-white px-2 py-0.5 rounded">STALE_SCRIPT</span>
                    </div>
                    <p className="text-xs text-[#9a3412] mt-1">Renamed from &lsquo;MERCER VALE&rsquo; (Character) to &lsquo;MERCER VALE RECORDS&rsquo; (Corporate Entity) in Draft 13. Draft 12 character clearance is revoked.</p>
                  </div>
                  <button onClick={handleExploreSampleWorkspace} className="text-xs font-bold text-[#c2410c] hover:underline cursor-pointer shrink-0">
                    OPEN SAMPLE WORKSPACE &rarr;
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Product Mechanism Architecture Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-extrabold text-base text-[#0f172a]">Script Revisions Happen</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">
                Writers edit character names, locations, and brands across shooting drafts. Static PDF clearance reports become instantly outdated without warning.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#f0fdf4] text-[#059669] flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-extrabold text-base text-[#0f172a]">CDGI Dependency Binding</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">
                Clearance Dependency Graph Invalidation (CDGI) binds evidence to Text, Context, Scope, TTL, and Counsel Dispositions. Only affected proof turns stale.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#faf5ff] text-[#9333ea] flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-extrabold text-base text-[#0f172a]">Zero Redundant Searches</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">
                Unchanged script elements preserve validated evidence (RETAINED), eliminating redundant API costs and accelerating counsel sign-off.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SCREENPLAY WORKSPACE VIEW */}
      {/* ========================================================================= */}
      {currentView === 'workspace' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Workspace Sub-Header Toolbar */}
          <div className="bg-white border-b border-[#e2e8f0] px-4 sm:px-6 py-2.5 flex items-center justify-between no-print flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-extrabold text-[#0f172a]">{activeProject?.title || 'Production Workspace'}</span>
              {activeProject?.project_id === 'proj_starlight_01' || activeProject?.title.includes('Starlight') ? (
                <span className="text-[10px] font-bold bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] px-2 py-0.5 rounded">
                  DEMO / SAMPLE WORKSPACE
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] px-2 py-0.5 rounded">
                  PRODUCTION
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <select
                value={activeRevisionId || ''}
                onChange={(e) => setActiveRevisionId(e.target.value)}
                className="bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
              >
                {revisions.map(r => (
                  <option key={r.revision_id} value={r.revision_id}>
                    {r.draft_label} ({r.total_scenes} scenes)
                  </option>
                ))}
              </select>

              <label className="bg-[#0f172a] hover:bg-[#334155] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Upload New Draft</span>
                <input type="file" accept=".txt,.fdx,.pdf" onChange={handleUploadScript} className="hidden" />
              </label>
            </div>
          </div>

          {uploadError && (
            <div className="bg-[#fee2e2] text-[#991b1b] px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-[#fecaca]">
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* 3-Column Workspace Main Content */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6">
            
            {/* Column 1: Screenplay View */}
            <main className="lg:col-span-6 bg-white border border-[#e2e8f0] rounded-2xl flex flex-col overflow-hidden shadow-xs">
              <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-[#64748b] tracking-wider">Screenplay Text View</span>
                <span className="text-[10px] text-[#94a3b8] font-mono">{revisions.find(r => r.revision_id === activeRevisionId)?.draft_label || 'Draft'}</span>
              </div>
              <div className="flex-1 p-6 font-mono text-xs overflow-y-auto leading-relaxed max-h-[600px] text-[#0f172a]">
                {renderHighlightedScript(rawText)}
              </div>
            </main>

            {/* Column 2: Claims Ledger List */}
            <section className="lg:col-span-3 bg-white border border-[#e2e8f0] rounded-2xl flex flex-col overflow-hidden shadow-xs">
              <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-[#64748b] tracking-wider">Extracted Claims ({claims.length})</span>
                  <span className="text-[10px] font-bold bg-[#e2e8f0] text-[#475569] px-2 py-0.5 rounded">
                    {claims.filter(c => c.state === 'ACTIVE').length} Active
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Filter entities..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full text-xs bg-white border border-[#cbd5e1] rounded-lg px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#e2e8f0] max-h-[600px]">
                {filteredClaims.map((claim) => (
                  <button
                    key={claim.claim_id}
                    onClick={() => setSelectedClaim(claim)}
                    className={`w-full text-left p-3.5 transition flex flex-col space-y-1.5 cursor-pointer ${
                      selectedClaim?.claim_id === claim.claim_id ? 'bg-[#f1f5f9] border-l-4 border-l-[#4f46e5]' : 'hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#0f172a] truncate max-w-[140px]">{claim.item_string}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        claim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'bg-[#dcfce7] text-[#15803d]' :
                        claim.outcome === 'MATCH_FOUND' ? 'bg-[#fee2e2] text-[#991b1b]' :
                        'bg-[#fef3c7] text-[#92400e]'
                      }`}>
                        {claim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'NO MATCH' : claim.outcome.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#64748b]">
                      <span>{claim.item_type}</span>
                      <span className={`font-bold ${claim.state === 'ACTIVE' ? 'text-[#15803d]' : 'text-[#c2410c]'}`}>
                        {claim.state}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Column 3: Claim Inspector & Evidence Provenance */}
            <aside className="lg:col-span-3 bg-white border border-[#e2e8f0] rounded-2xl flex flex-col overflow-hidden shadow-xs">
              <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-4 py-3">
                <span className="text-xs font-extrabold uppercase text-[#64748b] tracking-wider">Evidence Inspector</span>
              </div>

              {selectedClaim ? (
                <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs max-h-[600px]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#94a3b8] tracking-wider">{selectedClaim.item_type}</span>
                    <h2 className="text-lg font-extrabold text-[#0f172a]">{selectedClaim.item_string}</h2>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedClaim.state === 'ACTIVE' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fff7ed] text-[#c2410c]'
                    }`}>
                      STATE: {selectedClaim.state}
                    </span>
                  </div>

                  {selectedClaim.invalidation_reason && (
                    <div className="p-3 bg-[#fff7ed] border border-[#ffedd5] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#c2410c]">Invalidation Reason</span>
                      <p className="text-[11px] text-[#9a3412]">{selectedClaim.invalidation_reason}</p>
                    </div>
                  )}

                  {/* Evidence Documentation List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#64748b]">Evidence Provenance</span>
                      <span className="text-[10px] text-[#94a3b8] font-mono">{selectedClaim.evidence.length} sources</span>
                    </div>

                    {selectedClaim.evidence.filter(e => e.is_usable).map(ev => (
                      <div key={ev.evidence_id} className="p-3 bg-white border border-[#bbf7d0] rounded-xl space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#15803d] truncate max-w-[170px]">{ev.title}</span>
                          <span className="text-[9px] font-bold bg-[#dcfce7] text-[#15803d] px-1.5 py-0.5 rounded">VERBATIM MATCH</span>
                        </div>
                        <p className="text-[11px] text-[#334155] line-clamp-3 bg-[#f8fafc] p-2 rounded border border-[#e2e8f0] italic font-serif">
                          &ldquo;{ev.quoted_match_span || ev.excerpt}&rdquo;
                        </p>
                        <div className="space-y-1 text-[10px] text-[#64748b]">
                          <a href={ev.url} target="_blank" rel="noreferrer" className="text-[#2563eb] flex items-center hover:underline font-medium">
                            <span className="truncate">{ev.domain || ev.url}</span>
                            <ExternalLink className="h-2.5 w-2.5 ml-1 shrink-0" />
                          </a>
                          <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0] text-[9px] font-mono">
                            <span>Parallel Search ID:</span>
                            <span className="text-[#0f172a] font-bold">{ev.parallel_search_id}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Unusable Evidence Collapsed */}
                    {selectedClaim.evidence.filter(e => !e.is_usable).length > 0 && (
                      <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
                        <button
                          onClick={() => setCollapsedUnusable(!collapsedUnusable)}
                          className="w-full bg-[#f8fafc] p-2.5 text-xs font-semibold text-[#64748b] flex items-center justify-between cursor-pointer"
                        >
                          <span>UNUSABLE EVIDENCE ({selectedClaim.evidence.filter(e => !e.is_usable).length})</span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsedUnusable ? '' : 'rotate-180'}`} />
                        </button>
                        {!collapsedUnusable && (
                          <div className="p-3 space-y-2 bg-white text-[11px]">
                            {selectedClaim.evidence.filter(e => !e.is_usable).map((ev, idx) => (
                              <div key={idx} className="p-2.5 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-1">
                                <p className="font-bold text-[#0f172a] truncate">{ev.title}</p>
                                <p className="text-[10px] text-[#64748b]">{ev.domain} · Reason: Verbatim span absent</p>
                                <p className="text-[9px] font-mono text-[#94a3b8]">Search ID: {ev.parallel_search_id}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resolution & Disposition Actions */}
                  <div className="space-y-3 pt-3 border-t border-[#e2e8f0]">
                    <span className="text-xs font-bold uppercase text-[#64748b]">Legal Resolution</span>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => handleResearchAlternatives(selectedClaim.claim_id)}
                        className="w-full bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a] border border-[#cbd5e1] text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#4f46e5]" />
                        <span>Research Alternatives (Parallel SDK)</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleDisposition(selectedClaim.claim_id, 'PROCEED_PER_COUNSEL', 'Approved by production counsel.')}
                          className="bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#15803d] text-xs font-semibold py-2 rounded-xl transition cursor-pointer"
                        >
                          Proceed per Counsel
                        </button>
                        <button
                          onClick={() => handleDisposition(selectedClaim.claim_id, 'PERMISSION_REQUIRED', 'License negotiation required.')}
                          className="bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] text-xs font-semibold py-2 rounded-xl transition cursor-pointer"
                        >
                          Permission Req.
                        </button>
                      </div>
                    </div>

                    {selectedClaim.human_disposition && (
                      <div className="p-3 bg-[#dcfce7] rounded-xl border border-[#86efac] text-xs space-y-1">
                        <span className="font-bold text-[#15803d]">Disposition: {selectedClaim.human_disposition}</span>
                        <p className="text-[10px] text-[#15803d]">{selectedClaim.disposition_note}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#94a3b8]">
                  <FileText className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Select an item from the screenplay or claims list to inspect evidence provenance.</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REVISION DIFF & INVALIDATION MOAT VIEW */}
      {/* ========================================================================= */}
      {currentView === 'revision_diff' && (
        <div className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="border-b border-[#e2e8f0] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-[#0f172a]">Revision Invalidation Engine</h1>
                <span className="text-[10px] font-bold bg-[#e0e7ff] text-[#3730a3] px-2.5 py-0.5 rounded-full border border-[#c7d2fe]">
                  CDGI GRAPH
                </span>
              </div>
              <p className="text-xs text-[#64748b] mt-1">
                Continuous clearance diff for <strong className="text-[#0f172a]">{activeProject?.title || 'Selected Production'}</strong> ({diffData?.revision_prior || 'Draft N'} → {diffData?.revision_current || 'Draft N+1'}).
              </p>
            </div>
            <button
              onClick={() => activeProject && fetchRevisionDiff(activeProject.project_id)}
              className="bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center space-x-2 cursor-pointer w-fit shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#64748b]" />
              <span>Recompute Invalidation Graph</span>
            </button>
          </div>

          {diffLoading ? (
            <div className="text-center py-20 text-xs text-[#94a3b8]">Computing deterministic revision graph...</div>
          ) : !diffData?.has_diff ? (
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <Info className="h-8 w-8 text-[#94a3b8] mx-auto" />
              <h3 className="font-bold text-sm text-[#0f172a]">Continuous Clearance Invalidation</h3>
              <p className="text-xs text-[#64748b] max-w-md mx-auto">
                {diffData?.message || "Upload at least 2 script revisions to compute continuous clearance diff graph."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-xs">
                  <p className="text-xs font-bold text-[#64748b]">Retained Claims</p>
                  <p className="text-3xl font-extrabold text-[#059669] mt-1">{diffData?.metrics?.retained_count ?? 0}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-1">Evidence validated unchanged</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-xs">
                  <p className="text-xs font-bold text-[#64748b]">Stale / Invalidated</p>
                  <p className="text-3xl font-extrabold text-[#d97706] mt-1">{diffData?.metrics?.stale_count ?? 0}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-1">Clearance expired or revoked</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-xs">
                  <p className="text-xs font-bold text-[#64748b]">Searches Saved</p>
                  <p className="text-3xl font-extrabold text-[#2563eb] mt-1">{diffData?.metrics?.searches_saved ?? 0}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-1">Zero redundant API calls</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-[#e2e8f0] shadow-xs">
                  <p className="text-xs font-bold text-[#64748b]">Estimated Savings</p>
                  <p className="text-3xl font-extrabold text-[#0f172a] mt-1">{diffData?.metrics?.estimated_cost_saved || '$0.00'}</p>
                  <p className="text-[10px] text-[#94a3b8] mt-1">Latency eliminated</p>
                </div>
              </div>

              {/* Stale & Invalidated Claims Section */}
              {diffData?.stale_claims && diffData.stale_claims.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#0f172a] flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-[#d97706]" />
                      <span>Invalidated & Stale Claims in Current Revision</span>
                    </h3>
                    <span className="text-xs font-bold text-[#d97706] bg-[#fffbe6] px-2.5 py-0.5 rounded-full border border-[#fef08a]">
                      {diffData.stale_claims.length} Action Required
                    </span>
                  </div>

                  <div className="space-y-3">
                    {diffData.stale_claims.map((staleItem, idx) => (
                      <div key={idx} className="p-4 bg-[#fff7ed] rounded-xl border border-[#ffedd5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <span className="font-bold text-sm text-[#c2410c]">{staleItem.item_string}</span>
                            <span className="text-[10px] font-bold bg-[#ea580c] text-white px-2 py-0.5 rounded uppercase">
                              {staleItem.state}
                            </span>
                            <span className="text-[10px] font-medium text-[#64748b] bg-white border border-[#fed7aa] px-2 py-0.5 rounded">
                              {staleItem.item_type}
                            </span>
                          </div>
                          <p className="text-xs text-[#9a3412]">
                            {staleItem.invalidation_reason || `Script context or scope changed between revisions.`}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedClaim(staleItem);
                            setCurrentView('workspace');
                          }}
                          className="bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer shrink-0"
                        >
                          Resolve in Workspace
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retained Claims Section */}
              {diffData?.retained_claims && diffData.retained_claims.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-4 shadow-xs">
                  <h3 className="font-bold text-sm text-[#0f172a] flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-[#059669]" />
                    <span>Retained Clearance Claims (0 Redundant Searches)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {diffData.retained_claims.map((retClaim, idx) => (
                      <div key={idx} className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-[#166534]">{retClaim.item_string}</span>
                          <p className="text-[10px] text-[#15803d] mt-0.5">{retClaim.item_type} · Evidence preserved</p>
                        </div>
                        <span className="text-[9px] font-bold bg-[#dcfce7] text-[#15803d] px-2 py-0.5 rounded border border-[#86efac]">
                          RETAINED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LEGAL CLEARANCE RESEARCH PACKET VIEW */}
      {/* ========================================================================= */}
      {currentView === 'packet' && (
        <div className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between no-print border-b border-[#e2e8f0] pb-4 gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0f172a]">Screenplay Clearance Packet</h1>
              <p className="text-xs text-[#64748b] mt-1">Official production clearance ledger ready for counsel review and E&O insurance.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadJsonPackage}
                className="bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-[#64748b]" />
                <span>Export JSON Package</span>
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#0f172a] hover:bg-[#334155] text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Official PDF</span>
              </button>
            </div>
          </div>

          {packetLoading ? (
            <div className="text-center py-20 text-xs text-[#94a3b8]">Loading clearance research packet...</div>
          ) : (
            <div className="space-y-6">
              {/* Packet Status Gate Banner */}
              {packetData && !packetData.is_complete && (
                <div className="bg-[#fff7ed] border border-[#ffedd5] rounded-2xl p-6 space-y-3 text-left shadow-xs">
                  <div className="flex items-center space-x-2 text-[#c2410c]">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wide">RESEARCH PACKET BLOCKED</h3>
                  </div>
                  <p className="text-xs text-[#9a3412]">
                    Legal clearance research packet is blocked because unresolved research obligations or stale claims remain under current clearance policy.
                  </p>
                  {packetData.blocked_reasons && packetData.blocked_reasons.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#fed7aa]">
                      <p className="text-[11px] font-bold text-[#c2410c] uppercase">Blocked Obligations ({packetData.blocked_reasons.length}):</p>
                      <div className="space-y-1.5">
                        {packetData.blocked_reasons.map((bReason, idx) => (
                          <div key={idx} className="p-2.5 bg-white rounded-lg border border-[#fed7aa] text-xs flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-[#0f172a]">{bReason.item_string}: </span>
                              <span className="text-[#9a3412] font-medium">{bReason.reason}</span>
                            </div>
                            <button
                              onClick={() => {
                                const matchingClaim = claims.find(c => c.claim_id === bReason.claim_id || c.item_string === bReason.item_string);
                                if (matchingClaim) setSelectedClaim(matchingClaim);
                                setCurrentView('workspace');
                              }}
                              className="text-[10px] font-bold text-[#2563eb] hover:underline shrink-0"
                            >
                              Resolve →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {packetData && packetData.is_complete && (
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3 text-[#166534]">
                    <ShieldCheck className="h-6 w-6 text-[#059669]" />
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wide">RESEARCH PACKET COMPLETE</h3>
                      <p className="text-xs text-[#15803d]">All research obligations accounted for under policy. Valid for production counsel review.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#dcfce7] text-[#15803d] px-3 py-1 rounded-full border border-[#86efac]">
                    SEALED {packetData.integrity_hash.substring(0, 12)}
                  </span>
                </div>
              )}

              {/* Printable Packet Document Container */}
              <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm space-y-8 print-page">
                <div className="border-b border-[#e2e8f0] pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">OFFICIAL CLEARANCE EVIDENCE RECORD</span>
                    <h2 className="text-3xl font-extrabold text-[#0f172a] mt-1">{packetData?.project?.title || activeProject?.title}</h2>
                    <p className="text-xs text-[#64748b] mt-1">Revision: {packetData?.revision?.draft_label || 'Draft Label'} · SHA-256: {packetData?.revision?.sha256.substring(0, 16)}...</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                      packetData?.is_complete ? 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]' : 'bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]'
                    }`}>
                      {packetData?.packet_status || 'RESEARCH_PACKET_BLOCKED'}
                    </span>
                    <p className="text-[10px] text-[#94a3b8] mt-1 font-mono">Scope: {activeProject?.default_scope?.production_country || 'US'} + GLOBAL</p>
                  </div>
                </div>

                {/* Itemized Clearance Ledger Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase text-[#94a3b8]">
                        <th className="py-2.5 px-3">Item String</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Outcome</th>
                        <th className="py-2.5 px-3">Usable Sources</th>
                        <th className="py-2.5 px-3">Disposition</th>
                        <th className="py-2.5 px-3">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {claims.map((claim) => (
                        <tr key={claim.claim_id} className="hover:bg-[#f8fafc]">
                          <td className="py-3 px-3">
                            <button
                              onClick={() => {
                                setSelectedClaim(claim);
                                setCurrentView('workspace');
                              }}
                              className="font-bold text-[#0f172a] hover:text-[#2563eb] text-left hover:underline"
                            >
                              {claim.item_string}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-[#64748b]">{claim.item_type}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              claim.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'bg-[#dcfce7] text-[#15803d]' :
                              claim.outcome === 'MATCH_FOUND' ? 'bg-[#fee2e2] text-[#991b1b]' :
                              'bg-[#fef3c7] text-[#92400e]'
                            }`}>
                              {claim.outcome}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#64748b] font-mono text-[11px]">
                            {claim.evidence.filter(e => e.is_usable).length} / {claim.evidence.length}
                          </td>
                          <td className="py-3 px-3 text-[#64748b] font-medium">
                            {claim.human_disposition || 'Pending review'}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${claim.state === 'ACTIVE' ? 'text-[#15803d]' : 'text-[#c2410c]'}`}>
                              {claim.state}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-6 border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-[#94a3b8] gap-2">
                  <p>Cryptographic Integrity Hash: <span className="font-mono text-[#0f172a]">{packetData?.integrity_hash || 'Pending...'}</span></p>
                  <p>OBSTAT Clearance Engine v3.2 · Official Parallel Search SDK Substrate</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ASSURANCE & GOVERNANCE AUDIT VIEW */}
      {/* ========================================================================= */}
      {currentView === 'assurance' && (
        <div className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
          <div className="border-b border-[#e2e8f0] pb-4">
            <h1 className="text-2xl font-extrabold text-[#0f172a]">Assurance & Egress Provenance</h1>
            <p className="text-xs text-[#64748b] mt-1">Real-time audit log of all outbound search requests from GCP to Parallel Search API.</p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] font-bold uppercase text-[#94a3b8]">
                    <th className="py-3 px-4">Outbound Query</th>
                    <th className="py-3 px-4">Token Provenance</th>
                    <th className="py-3 px-4">Parallel Search ID</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {egressLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc]">
                      <td className="py-3 px-4 font-mono text-[#0f172a] font-semibold">{log.query}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {log.provenance.map((p, pIdx) => (
                            <span key={pIdx} className="text-[9px] bg-[#f1f5f9] text-[#475569] px-1.5 py-0.5 rounded font-mono border border-[#e2e8f0]">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#64748b] text-[11px]">{log.search_id}</td>
                      <td className="py-3 px-4">
                        <span className="bg-[#dcfce7] text-[#15803d] px-2 py-0.5 rounded text-[10px] font-bold border border-[#86efac]">
                          AUTHORIZED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALTERNATIVE NAME RESEARCH VIA PARALLEL */}
      {/* ========================================================================= */}
      {showAlternativeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#0f172a]">Research Clearance Alternatives</h3>
                <p className="text-xs text-[#64748b]">Parallel Search API queried in real-time for candidate replacement names.</p>
              </div>
              <button onClick={() => setShowAlternativeModal(false)} className="text-[#94a3b8] hover:text-[#0f172a]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {alternativesLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="h-6 w-6 text-[#4f46e5] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#64748b]">Querying Parallel Search SDK for candidates...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestedAlternatives.map((alt, idx) => (
                  <div key={idx} className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#0f172a]">{alt.alternative_name}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          alt.outcome === 'NO_MATCH_FOUND_IN_SCOPE' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[#991b1b]'
                        }`}>
                          {alt.outcome}
                        </span>
                        <span className="text-[10px] text-[#94a3b8]">{alt.usable_evidence_count} usable sources</span>
                      </div>
                    </div>
                    <button
                      onClick={() => selectedClaim && handleSelectAlternative(selectedClaim.claim_id, alt.alternative_name)}
                      className="bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-[#e2e8f0] max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#4f46e5]">STEP {onboardingStep} OF 2</span>
                <h3 className="font-extrabold text-base text-[#0f172a]">Start a New Production</h3>
              </div>
              <button onClick={() => setShowOnboarding(false)} className="text-[#94a3b8] hover:text-[#0f172a]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {onboardingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#0f172a]">Production Title</label>
                  <input
                    type="text"
                    value={onboardingTitle}
                    onChange={(e) => setOnboardingTitle(e.target.value)}
                    placeholder="e.g. The Starlight Heist"
                    className="w-full text-xs border border-[#cbd5e1] rounded-xl p-2.5 mt-1 bg-[#f8fafc] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0f172a]">Script Stage</label>
                  <select
                    value={onboardingStage}
                    onChange={(e) => setOnboardingStage(e.target.value)}
                    className="w-full text-xs border border-[#cbd5e1] rounded-xl p-2.5 mt-1 bg-[#f8fafc] cursor-pointer"
                  >
                    <option>Shooting Draft (Lock)</option>
                    <option>Table Read Draft</option>
                    <option>Blue Revision (Active Shoot)</option>
                  </select>
                </div>
                <button
                  onClick={() => setOnboardingStep(2)}
                  className="w-full bg-[#0f172a] text-white text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer"
                >
                  Next: Clearance Scope
                </button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#0f172a]">Production Country</label>
                  <select
                    value={onboardingCountry}
                    onChange={(e) => setOnboardingCountry(e.target.value)}
                    className="w-full text-xs border border-[#cbd5e1] rounded-xl p-2.5 mt-1 bg-[#f8fafc] cursor-pointer"
                  >
                    <option value="US">United States (US)</option>
                    <option value="UK">United Kingdom (UK)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="EU">European Union (EU)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0f172a]">Distribution Territories</label>
                  <select
                    value={onboardingTerritory}
                    onChange={(e) => setOnboardingTerritory(e.target.value)}
                    className="w-full text-xs border border-[#cbd5e1] rounded-xl p-2.5 mt-1 bg-[#f8fafc] cursor-pointer"
                  >
                    <option value="US + GLOBAL">US Theatrical + Global Streaming</option>
                    <option value="US ONLY">US Domestic Theatrical Only</option>
                    <option value="WORLDWIDE">Worldwide All Media</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0f172a]">Distribution Medium</label>
                  <select
                    value={onboardingMedium}
                    onChange={(e) => setOnboardingMedium(e.target.value)}
                    className="w-full text-xs border border-[#cbd5e1] rounded-xl p-2.5 mt-1 bg-[#f8fafc] cursor-pointer"
                  >
                    <option value="THEATRICAL_AND_STREAMING">Theatrical & Global Streaming</option>
                    <option value="BROADCAST_AND_VOD">Television Broadcast & VOD</option>
                    <option value="FESTIVAL_AND_INDIE">Film Festival & Indie Digital</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setOnboardingStep(1)}
                    className="w-1/3 bg-[#f1f5f9] text-xs font-semibold py-2.5 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleCreateProject()}
                    className="w-2/3 bg-[#4f46e5] text-white text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer"
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
