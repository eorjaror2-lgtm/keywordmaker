"use client";

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar, CheckCircle2, AlertTriangle, Search, Plus, MapPin, Info, CalendarPlus, ChevronDown, Settings, Trash2, X, ListOrdered, Hash } from 'lucide-react';

interface RegionData {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
}

interface KeywordData {
  id: string;
  name: string;
  category: string;
  grade: 'S' | 'A' | 'B';
}

const MOCK_RECENTLY_USED_REGIONS = [
  { region: '안양', lastUsedDate: '4월 30일', channel: '블로그 B', title: '[안양] 유방암 검진' },
  { region: '범계', lastUsedDate: '5월 5일', channel: '블로그 A', title: '[범계] 맘모톰 수술' }
];

// Initial DB structure for events
const INITIAL_EVENTS = [
  { id: '1', date: '2026-04-30', channel: '블로그 B', status: '발행 완료', category: 'Regional', region: '안양', keyword: '맘모톰 수술' },
  { id: '2', date: '2026-05-05', channel: '블로그 A', status: '발행 완료', category: 'Regional', region: '범계', keyword: '유방결절 수술' },
  { id: '3', date: '2026-05-15', channel: '홈페이지', status: '발행 예정', category: 'Main', region: '', keyword: '가슴 찌릿한 통증' },
  { id: '4', date: '2026-05-20', channel: '블로그 A', status: '발행 예정', category: 'Regional', region: '평촌', keyword: '유방 미세석회화 원인' },
  { id: '5', date: '2026-05-22', channel: '블로그 B', status: '발행 예정', category: 'Regional', region: '의왕', keyword: '유방암 검진' },
  { id: '6', date: '2026-04-10', channel: '홈페이지', status: '발행 완료', category: 'Regional', region: '안양', keyword: '맘모톰 수술' },
  { id: '7', date: '2026-03-01', channel: '블로그 A', status: '발행 완료', category: 'Main', region: '', keyword: '유방결절 수술' },
  { id: '8', date: '2026-04-15', channel: '홈페이지', status: '발행 완료', category: 'Long-tail', region: '', keyword: '비타민 B12 영양제' },
];

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [recommendations, setRecommendations] = useState<{keyword: string, reason: string}[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  
  // Real-time Events State
  const [events, setEvents] = useState(INITIAL_EVENTS);

  // View Toggle State
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'keyword'>('calendar');
  const [timelineFilter, setTimelineFilter] = useState<'전체' | '블로그 A' | '블로그 B' | '홈페이지'>('전체');
  
  // Keyword View State
  const [keywordSearch, setKeywordSearch] = useState('');
  const [selectedHistoryKeyword, setSelectedHistoryKeyword] = useState<string | null>(null);
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({ S: true, A: true, B: true });

  // Region Management State
  const [dbRegions, setDbRegions] = useState<RegionData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionTier, setNewRegionTier] = useState<1|2|3>(3);

  // Keyword Pool Management State
  const [keywordPool, setKeywordPool] = useState<KeywordData[]>([]);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [newPoolKeywordName, setNewPoolKeywordName] = useState('');
  const [newPoolKeywordGrade, setNewPoolKeywordGrade] = useState<'S'|'A'|'B'>('A');

  const [isModifying, setIsModifying] = useState(false);

  // Combination Builder State
  const [builderRegion, setBuilderRegion] = useState('');
  const [builderMain, setBuilderMain] = useState('');
  const [builderSub, setBuilderSub] = useState('');
  const [builderChannel, setBuilderChannel] = useState('블로그 A');

  // Load Regions and Keywords from API
  const fetchData = async () => {
    try {
      const [resRegions, resKeywords] = await Promise.all([
        fetch('/api/regions'),
        fetch('/api/keywords')
      ]);
      const dataRegions = await resRegions.json();
      const dataKeywords = await resKeywords.json();
      
      if (dataRegions.regions) setDbRegions(dataRegions.regions);
      if (dataKeywords.keywords) setKeywordPool(dataKeywords.keywords);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute derived region data
  const tierLabels: Record<1|2|3, string> = { 1: 'Tier 1 (핵심)', 2: 'Tier 2 (인접)', 3: 'Tier 3 (확장)' };
  const tierCooldowns: Record<1|2|3, number> = { 1: 14, 2: 21, 3: 45 };
  
  const groupedRegions = [1, 2, 3].map(tier => ({
    tier: tier as 1|2|3,
    label: tierLabels[tier as 1|2|3],
    cooldownDays: tierCooldowns[tier as 1|2|3],
    regions: dbRegions.filter(r => r.tier === tier).map(r => r.name)
  })).filter(g => g.regions.length > 0);
  
  const getRegionTierInfo = (regionName: string) => {
    const regionObj = dbRegions.find(r => r.name === regionName);
    if (!regionObj) return null;
    return groupedRegions.find(g => g.tier === regionObj.tier) || null;
  };
  
  // Transform DB_EVENTS for FullCalendar
  const calendarEvents = events.map(e => {
    const isBlogA = e.channel === '블로그 A';
    const isBlogB = e.channel === '블로그 B';
    const backgroundColor = isBlogA ? '#eff6ff' : isBlogB ? '#ecfdf5' : '#fff7ed';
    const borderColor = isBlogA ? '#bfdbfe' : isBlogB ? '#a7f3d0' : '#fed7aa';
    const textColor = isBlogA ? '#1d4ed8' : isBlogB ? '#047857' : '#c2410c';
    const title = e.region ? `[${e.region}] ${e.keyword}`.trim() : e.keyword;
    
    return { title, date: e.date, backgroundColor, borderColor, textColor };
  });

  // Transform and filter DB_EVENTS for Timeline view
  const filteredTimeline = events
    .filter(e => timelineFilter === '전체' || e.channel === timelineFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // DESC order

  // Process data for Keyword View (Strategic Grades)
  const keywordUsageCount: Record<string, typeof INITIAL_EVENTS> = {};
  keywordPool.forEach(k => keywordUsageCount[k.name] = []);
  
  events.forEach(e => {
    if (keywordUsageCount[e.keyword]) {
      keywordUsageCount[e.keyword].push(e);
    } else {
      keywordUsageCount[e.keyword] = [e]; // Fallback
    }
  });

  const gradeOrder = ['S', 'A', 'B'];
  const gradeLabels: Record<string, string> = {
    'S': '🔥 [S급] 핵심 타겟 키워드 (경쟁 치열)',
    'A': '🍯 [A급] 전략 꿀키워드 (가성비 최고)',
    'B': '☕ [B급] 서브/일상 키워드 (가볍게 꾸준히)'
  };
  
  const gradeColors: Record<string, { bg: string, text: string, count: string, hover: string }> = {
    'S': { bg: 'bg-rose-50 text-rose-800', text: 'text-rose-900', count: 'bg-rose-100 text-rose-700', hover: 'hover:bg-rose-100' },
    'A': { bg: 'bg-amber-50 text-amber-800', text: 'text-amber-900', count: 'bg-amber-100 text-amber-700', hover: 'hover:bg-amber-100' },
    'B': { bg: 'bg-emerald-50 text-emerald-800', text: 'text-emerald-900', count: 'bg-emerald-100 text-emerald-700', hover: 'hover:bg-emerald-100' }
  };

  const renderedKeywords = gradeOrder.map(grade => {
    const items = keywordPool
      .filter(k => k.grade === grade && k.name.toLowerCase().includes(keywordSearch.toLowerCase()))
      .map(k => ({
        name: k.name,
        count: keywordUsageCount[k.name].length,
        events: keywordUsageCount[k.name].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }));
    return { grade, label: gradeLabels[grade], items };
  });

  // Selected Keyword Data & Logic
  const selectedKeywordData = selectedHistoryKeyword ? (keywordUsageCount[selectedHistoryKeyword] || []) : [];

  let daysSinceStr = '';
  let recommendationMsg = '';
  let isGoodTiming = false;

  if (selectedKeywordData.length > 0) {
    const lastEvent = selectedKeywordData[0]; // because it's sorted DESC (newest first)
    const lastDate = new Date(lastEvent.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      daysSinceStr = `아직 발행 전입니다 (예정일: ${lastEvent.date})`;
      recommendationMsg = "미래 발행 일정이 잡혀있으므로 현재 추가적인 재사용은 권장하지 않습니다.";
    } else {
      daysSinceStr = `마지막 발행일로부터 ${diffDays}일 경과`;
      if (diffDays >= 14) {
        isGoodTiming = true;
        recommendationMsg = "충분한 기간이 경과하여 지금 다른 채널에 사용하기 좋은 타이밍입니다!";
      } else {
        recommendationMsg = "아직 안전한 쿨타임(최소 14일)이 지나지 않아 재사용을 권장하지 않습니다.";
      }
    }
  }

  const handleDateClick = async (arg: { dateStr: string }) => {
    setSelectedDate(arg.dateStr);
    setIsLoadingRecs(true);
    setRecommendations([]);
    setErrorMsg(''); // Clear any previous date error
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: arg.dateStr })
      });
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Combination Builder Logic
  const previewPieces = [];
  if (builderRegion) previewPieces.push(`[${builderRegion}]`);
  if (builderMain) previewPieces.push(builderMain);
  if (builderSub.trim()) previewPieces.push(builderSub.trim());
  const previewKeyword = previewPieces.join(' ');

  const currentTierInfo = builderRegion ? getRegionTierInfo(builderRegion) : null;
  const recentUsageData = MOCK_RECENTLY_USED_REGIONS.find(r => r.region === builderRegion);
  const isCooldownWarning = !!recentUsageData;

  const handleRegisterSubmit = () => {
    setErrorMsg('');
    
    if (!selectedDate) {
      setErrorMsg('달력에서 목표 발행일을 먼저 선택해주세요.');
      return;
    }
    
    if (!previewKeyword.trim()) {
      setErrorMsg('키워드 요소를 하나 이상 선택하거나 입력해주세요.');
      return;
    }

    const baseKeyword = (builderMain + (builderMain && builderSub.trim() ? ' ' : '') + builderSub.trim()).trim() || builderSub.trim();
    
    const newEvent = {
       id: `ev-${Date.now()}`,
       date: selectedDate,
       channel: builderChannel,
       status: '발행 예정',
       category: builderRegion ? 'Regional' : (builderMain ? 'Main' : 'Long-tail'),
       region: builderRegion,
       keyword: baseKeyword
    };

    setEvents(prev => [...prev, newEvent]);
    
    // UI Feedback & Reset
    alert(`[${selectedDate}] '${previewKeyword}' 일정이 캘린더에 성공적으로 추가되었습니다!`);
    setBuilderRegion('');
    setBuilderMain('');
    setBuilderSub('');
    setSelectedDate(null);
  };

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) return;
    setIsModifying(true);
    try {
      await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRegionName.trim(), tier: newRegionTier })
      });
      setNewRegionName('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsModifying(false);
    }
  };

  const handleDeleteRegion = async (id: string) => {
    setIsModifying(true);
    try {
      await fetch(`/api/regions?id=${id}`, { method: 'DELETE' });
      const regionObj = dbRegions.find(r => r.id === id);
      if (regionObj && builderRegion === regionObj.name) {
        setBuilderRegion('');
      }
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsModifying(false);
    }
  };

  const handleAddPoolKeyword = async () => {
    if (!newPoolKeywordName.trim()) return;
    setIsModifying(true);
    try {
      await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPoolKeywordName.trim(), grade: newPoolKeywordGrade })
      });
      setNewPoolKeywordName('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsModifying(false);
    }
  };

  const handleDeletePoolKeyword = async (id: string) => {
    setIsModifying(true);
    try {
      await fetch(`/api/keywords?id=${id}`, { method: 'DELETE' });
      const kwObj = keywordPool.find(r => r.id === id);
      if (kwObj && builderMain === kwObj.name) {
        setBuilderMain('');
      }
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsModifying(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      
      {/* Region Management Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" /> 지역 및 Tier 관리
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">새 지역 추가</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="새로운 지역명" 
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    value={newRegionName}
                    onChange={e => setNewRegionName(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') handleAddRegion(); }}
                  />
                  <select 
                    className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 bg-white shadow-sm"
                    value={newRegionTier}
                    onChange={e => setNewRegionTier(Number(e.target.value) as 1|2|3)}
                  >
                    <option value={1}>Tier 1</option>
                    <option value={2}>Tier 2</option>
                    <option value={3}>Tier 3</option>
                  </select>
                  <button 
                    onClick={handleAddRegion}
                    disabled={isModifying || !newRegionName.trim()}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    추가
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">등록된 지역 목록 ({dbRegions.length}개)</label>
                <div className="space-y-2">
                  {dbRegions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">등록된 지역이 없습니다.</p>
                  ) : (
                    [...dbRegions].sort((a,b) => a.tier - b.tier).map(region => (
                      <div key={region.id} className="flex justify-between items-center p-3 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] px-2.5 py-1 rounded-md font-bold ${
                            region.tier === 1 ? 'bg-rose-100 text-rose-800' :
                            region.tier === 2 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>Tier {region.tier}</span>
                          <span className="font-bold text-slate-700 text-sm">{region.name}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteRegion(region.id)}
                          disabled={isModifying}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyword Pool Management Modal */}
      {isKeywordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" /> 메인 키워드 풀 관리
              </h3>
              <button onClick={() => setIsKeywordModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">새 전략 키워드 추가</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="새로운 타겟 키워드명" 
                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    value={newPoolKeywordName}
                    onChange={e => setNewPoolKeywordName(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') handleAddPoolKeyword(); }}
                  />
                  <select 
                    className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 bg-white shadow-sm"
                    value={newPoolKeywordGrade}
                    onChange={e => setNewPoolKeywordGrade(e.target.value as 'S'|'A'|'B')}
                  >
                    <option value="S">S급 (핵심)</option>
                    <option value="A">A급 (전략)</option>
                    <option value="B">B급 (서브)</option>
                  </select>
                  <button 
                    onClick={handleAddPoolKeyword}
                    disabled={isModifying || !newPoolKeywordName.trim()}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    추가
                  </button>
                </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">등록된 풀 키워드 목록 ({keywordPool.length}개)</label>
                <div className="space-y-2">
                  {keywordPool.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50">등록된 키워드가 없습니다.</p>
                  ) : (
                    [...keywordPool].sort((a,b) => a.grade.localeCompare(b.grade) * -1).map(kw => (
                      <div key={kw.id} className="flex justify-between items-center p-3 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] px-2.5 py-1 rounded-md font-bold ${
                            kw.grade === 'S' ? 'bg-rose-100 text-rose-800' :
                            kw.grade === 'A' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>{kw.grade}급</span>
                          <span className="font-bold text-slate-700 text-sm">{kw.name}</span>
                        </div>
                        <button 
                          onClick={() => handleDeletePoolKeyword(kw.id)}
                          disabled={isModifying}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">다중 채널 키워드 관리 대시보드</h1>
            <p className="text-slate-500 text-sm mt-1">유방외과 마케팅 최적화 스케줄링 시스템</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-sm font-semibold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 블로그 A
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-sm font-semibold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 블로그 B
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 text-orange-700 rounded-full text-sm font-semibold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 홈페이지
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visual Section (Takes up 2/3 width) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[800px]">
            
            {/* View Toggle Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-800">
                {viewMode === 'calendar' ? <Calendar className="w-6 h-6 text-indigo-500" /> : 
                 viewMode === 'timeline' ? <ListOrdered className="w-6 h-6 text-indigo-500" /> :
                 <Hash className="w-6 h-6 text-indigo-500" />}
                <h2 className="text-xl font-bold">
                  {viewMode === 'calendar' ? '발행 일정 캘린더' : 
                   viewMode === 'timeline' ? '채널별 타임라인 뷰' : '키워드별 상세 히스토리'}
                </h2>
              </div>
              
              <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner overflow-x-auto">
                <button 
                  onClick={() => setViewMode('calendar')} 
                  className={`whitespace-nowrap px-4 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  캘린더 뷰
                </button>
                <button 
                  onClick={() => setViewMode('timeline')} 
                  className={`whitespace-nowrap px-4 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  타임라인 뷰
                </button>
                <button 
                  onClick={() => setViewMode('keyword')} 
                  className={`whitespace-nowrap px-4 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === 'keyword' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  키워드별 보기
                </button>
              </div>
            </div>

            {/* Timeline Filter Pills (Only visible in timeline view) */}
            {viewMode === 'timeline' && (
              <div className="flex gap-2 mb-8 flex-wrap">
                {['전체', '블로그 A', '블로그 B', '홈페이지'].map(filter => (
                  <button 
                    key={filter}
                    onClick={() => setTimelineFilter(filter as any)}
                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                      timelineFilter === filter
                        ? (filter === '블로그 A' ? 'bg-blue-500 border-blue-600 text-white shadow-md' : 
                           filter === '블로그 B' ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 
                           filter === '홈페이지' ? 'bg-orange-500 border-orange-600 text-white shadow-md' : 
                           'bg-slate-700 border-slate-800 text-white shadow-md')
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}

            {/* Content Area Based on View Mode */}
            <div className="flex-1">
              
              {/* Calendar View */}
              {viewMode === 'calendar' && (
                <div className="calendar-container h-full animate-in fade-in duration-300">
                  <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={calendarEvents}
                    dateClick={handleDateClick}
                    height="100%"
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,dayGridWeek'
                    }}
                    buttonText={{
                      today: '오늘',
                      month: '월간',
                      week: '주간'
                    }}
                    locale="ko"
                  />
                </div>
              )}

              {/* Timeline View */}
              {viewMode === 'timeline' && (
                <div className="pl-6 border-l-2 border-slate-200/80 space-y-8 py-4 animate-in fade-in duration-300 relative">
                  {filteredTimeline.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-medium">
                      해당 조건의 데이터가 없습니다.
                    </div>
                  ) : (
                    filteredTimeline.map(e => {
                      const isBlogA = e.channel === '블로그 A';
                      const isBlogB = e.channel === '블로그 B';
                      const dotColor = isBlogA ? 'bg-blue-500 ring-blue-100' : isBlogB ? 'bg-emerald-500 ring-emerald-100' : 'bg-orange-500 ring-orange-100';
                      const borderColor = isBlogA ? 'border-blue-200 hover:border-blue-300' : isBlogB ? 'border-emerald-200 hover:border-emerald-300' : 'border-orange-200 hover:border-orange-300';
                      const badgeColor = isBlogA ? 'bg-blue-50 text-blue-700 border-blue-200' : isBlogB ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200';
                      const statusColor = e.status === '발행 완료' ? 'bg-slate-100 text-slate-600' : 'bg-indigo-100 text-indigo-700 shadow-sm';
                      const regionBadge = isBlogA ? 'bg-blue-600' : isBlogB ? 'bg-emerald-600' : 'bg-orange-600';

                      return (
                        <div key={e.id} className="relative group transition-all">
                          {/* Timeline Node */}
                          <div className={`absolute -left-[33px] top-5 w-4 h-4 rounded-full ring-4 shadow-sm transition-transform group-hover:scale-125 ${dotColor}`}></div>
                          
                          {/* Info Card */}
                          <div className={`bg-white p-5 rounded-2xl border shadow-sm transition-all group-hover:shadow-md ${borderColor}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-500 tracking-tight">{e.date.replace(/-/g, '.')}</span>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusColor}`}>
                                  {e.status}
                                </span>
                              </div>
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${badgeColor}`}>
                                {e.channel}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2.5 mt-1">
                              {e.region && (
                                <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-md shadow-sm ${regionBadge}`}>
                                  {e.region}
                                </span>
                              )}
                              <span className="text-lg font-bold text-slate-800">{e.keyword}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Strategic Keyword Pool View */}
              {viewMode === 'keyword' && (
                <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-300 h-full">
                  {/* Left Panel: Keyword Pool List (approx 1/3) */}
                  <div className="md:w-[35%] bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col shadow-inner min-h-[400px] max-h-[600px]">
                    <div className="relative mb-4 shrink-0">
                      <input 
                        type="text" 
                        placeholder="키워드 검색..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                        value={keywordSearch}
                        onChange={e => setKeywordSearch(e.target.value)}
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                      {renderedKeywords.map(group => (
                        <div key={group.grade} className="space-y-1.5">
                          <button 
                            className={`w-full flex items-center justify-between text-xs font-bold px-3 py-2 rounded-lg transition-colors ${gradeColors[group.grade].bg}`}
                            onClick={() => setExpandedGrades(prev => ({...prev, [group.grade]: !prev[group.grade]}))}
                          >
                            <span className="truncate pr-2 text-left">{group.label}</span>
                            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${expandedGrades[group.grade] ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <div className={`space-y-1.5 overflow-hidden transition-all duration-300 ${expandedGrades[group.grade] ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {group.items.length === 0 ? (
                               <p className="text-[11px] text-slate-400 font-medium px-3 py-2">조건에 맞는 키워드가 없습니다.</p>
                            ) : group.items.map(item => {
                               const isSelected = selectedHistoryKeyword === item.name;
                               return (
                                <button 
                                  key={item.name}
                                  onClick={() => setSelectedHistoryKeyword(item.name)}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : `bg-white text-slate-700 border-slate-200 ${gradeColors[group.grade].hover} hover:border-indigo-300 hover:shadow-sm`}`}
                                >
                                  <span className="truncate pr-2">{item.name}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold ${isSelected ? 'bg-indigo-400 text-white' : item.count === 0 ? 'bg-slate-100 text-slate-400' : gradeColors[group.grade].count}`}>
                                    {item.count}회
                                  </span>
                                </button>
                               );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Panel: Detail History (approx 2/3) */}
                  <div className="md:w-[65%] bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px] max-h-[600px] overflow-y-auto">
                    {!selectedHistoryKeyword ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-70 py-20">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                          <Hash className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="font-medium text-base">좌측에서 풀(Pool) 키워드를 선택하여 발행 히스토리를 확인하세요.</p>
                      </div>
                    ) : (
                      <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className="mb-6 pb-6 border-b border-slate-100 sticky top-0 bg-white z-10 pt-2">
                          <h3 className="text-2xl font-bold text-slate-800 mb-4">{selectedHistoryKeyword}</h3>
                          
                          {/* Status Recommendation Box */}
                          {selectedKeywordData.length === 0 ? (
                            <div className="p-4 rounded-xl border flex items-start gap-3 shadow-sm bg-indigo-50 border-indigo-200">
                              <Info className="w-5 h-5 shrink-0 mt-0.5 text-indigo-500" />
                              <div>
                                <p className="font-bold text-sm text-indigo-800">미사용 키워드</p>
                                <p className="font-medium text-[13px] mt-1.5 leading-relaxed text-indigo-700">아직 한 번도 발행되지 않은 신선한 키워드입니다! 적극적으로 활용해 보세요.</p>
                              </div>
                            </div>
                          ) : (
                            <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${isGoodTiming ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                               <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isGoodTiming ? 'text-emerald-500' : 'text-amber-500'}`} />
                               <div>
                                 <p className={`font-bold text-sm ${isGoodTiming ? 'text-emerald-800' : 'text-amber-800'}`}>{daysSinceStr}</p>
                                 <p className={`font-medium text-[13px] mt-1.5 leading-relaxed ${isGoodTiming ? 'text-emerald-600' : 'text-amber-700'}`}>{recommendationMsg}</p>
                               </div>
                            </div>
                          )}
                        </div>
                        
                        {selectedKeywordData.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 font-medium text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50">
                            히스토리가 존재하지 않습니다.
                          </div>
                        ) : (
                          <div className="pl-6 border-l-2 border-slate-200 space-y-6 pb-4">
                            {selectedKeywordData.map((e, idx) => {
                              const isBlogA = e.channel === '블로그 A';
                              const isBlogB = e.channel === '블로그 B';
                              const dotColor = isBlogA ? 'bg-blue-500 ring-blue-100' : isBlogB ? 'bg-emerald-500 ring-emerald-100' : 'bg-orange-500 ring-orange-100';
                              const badgeColor = isBlogA ? 'bg-blue-50 text-blue-700 border-blue-200' : isBlogB ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200';
                              
                              return (
                                <div key={idx} className="relative group">
                                  <div className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full ring-4 transition-transform group-hover:scale-110 ${dotColor}`}></div>
                                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-slate-700 tracking-tight">{e.date.replace(/-/g, '.')}</span>
                                      <span className={`text-xs px-2.5 py-1 rounded-md border font-bold ${badgeColor}`}>{e.channel}</span>
                                      {e.region && (
                                        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-white font-bold">{e.region}</span>
                                      )}
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${e.status === '발행 완료' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                                      {e.status}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 flex flex-col">
            
            {/* NEW Keyword Combination Builder Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1">
              <div className="mb-6 flex items-center gap-2 text-slate-800">
                <Search className="w-6 h-6 text-indigo-500" />
                <h2 className="text-xl font-bold">키워드 조합 및 일정 등록</h2>
              </div>
              
              <div className="space-y-5">
                
                {/* 1. Target Date Box */}
                <div className={`p-4 border rounded-xl flex items-center justify-between shadow-sm transition-colors ${selectedDate ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-sm font-bold ${selectedDate ? 'text-indigo-800' : 'text-slate-500'}`}>목표 발행일</span>
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors ${selectedDate ? 'bg-white text-indigo-600 border border-indigo-100' : 'bg-slate-200 text-slate-400'}`}>
                    {selectedDate ? selectedDate : '달력에서 날짜를 선택해주세요'}
                  </span>
                </div>

                {/* 2. Combination Fields */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
                  {/* Region Field */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">1</span> 
                      지역 (선택)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm bg-white text-slate-800 font-bold"
                          value={builderRegion}
                          onChange={(e) => {
                            setBuilderRegion(e.target.value);
                            setErrorMsg('');
                          }}
                        >
                          <option value="">-- 지역 선택 안 함 --</option>
                          {groupedRegions.map(tier => (
                            <optgroup key={tier.tier} label={tier.label}>
                              {tier.regions.map(region => (
                                <option key={region} value={region}>{region} (Tier {tier.tier})</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                      </div>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center w-10 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 transition-colors shadow-sm shrink-0"
                        title="지역 관리"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main Keyword Field */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">2</span> 
                      메인 키워드 (선택)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <select
                          className="w-full appearance-none pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm bg-white text-slate-800 font-bold"
                          value={builderMain}
                          onChange={(e) => {
                            setBuilderMain(e.target.value);
                            setErrorMsg('');
                          }}
                        >
                          <option value="">-- 메인 키워드 선택 안 함 --</option>
                          {['S', 'A'].map(grade => {
                            const items = keywordPool.filter(k => k.grade === grade);
                            if (items.length === 0) return null;
                            return (
                              <optgroup key={grade} label={gradeLabels[grade].replace('🔥 ', '').replace('🍯 ', '').replace('☕ ', '')}>
                                {items.map(k => (
                                  <option key={k.name} value={k.name}>{k.name}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                      </div>
                      <button 
                        onClick={() => setIsKeywordModalOpen(true)}
                        className="flex items-center justify-center w-10 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 transition-colors shadow-sm shrink-0"
                        title="풀 키워드 관리"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub/Daily Keyword Field */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span> 
                      서브/일상 키워드 (입력 또는 픽)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="자유롭게 입력하거나 아래 꿀키워드 선택..."
                        className="w-full pl-3 pr-8 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm bg-white text-slate-800 font-bold"
                        value={builderSub}
                        onChange={(e) => {
                          setBuilderSub(e.target.value);
                          setErrorMsg('');
                        }}
                      />
                      {builderSub && (
                        <button onClick={() => setBuilderSub('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* B-grade Quick Picks */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {keywordPool.filter(k => k.grade === 'B').map(k => (
                        <button 
                          key={k.name}
                          onClick={() => setBuilderSub(k.name)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-sm"
                        >
                          {k.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cooldown Warning */}
                {isCooldownWarning && currentTierInfo && recentUsageData && builderRegion && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 w-full">
                      <p className="text-sm font-bold text-amber-900">
                        주의: 최근에 사용된 {currentTierInfo.label.replace(/Tier \d+ /, '')} 지역입니다.
                      </p>
                      <p className="text-xs text-amber-700 mt-1.5 font-medium leading-relaxed">
                        전체 채널 기준 <span className="font-bold underline">{currentTierInfo.cooldownDays}일</span> 이내에 사용된 이력이 있습니다. 다른 채널이나 다음 주로 미루는 것을 권장합니다.
                      </p>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <p className="text-sm text-rose-500 font-semibold flex items-center gap-1.5 animate-in slide-in-from-top-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errorMsg}
                  </p>
                )}

                {/* 3. Channel Selection */}
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-2 block">발행 채널 (필수)</label>
                   <div className="flex gap-2">
                     {['블로그 A', '블로그 B', '홈페이지'].map(ch => (
                       <button 
                         key={ch}
                         onClick={() => setBuilderChannel(ch)}
                         className={`flex-1 py-2.5 text-sm font-bold rounded-lg border transition-all ${builderChannel === ch ? (ch === '블로그 A' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md' : ch === '블로그 B' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md' : 'bg-orange-50 border-orange-500 text-orange-700 shadow-md') : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                       >
                         {ch}
                       </button>
                     ))}
                   </div>
                </div>

                {/* 4. Preview & Submit Box */}
                {previewKeyword.trim() && (
                  <div className="p-5 bg-indigo-600 rounded-xl space-y-4 shadow-lg text-white animate-in slide-in-from-bottom-2">
                    <p className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> 최종 조합 키워드 미리보기
                    </p>
                    <p className="text-xl font-bold tracking-tight">{previewKeyword}</p>
                    
                    <button 
                      onClick={handleRegisterSubmit}
                      className="w-full flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 py-3.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                      <Plus className="w-5 h-5" />
                      {selectedDate ? `${selectedDate} 일정으로 등록하기` : '날짜를 먼저 선택하세요'}
                    </button>
                  </div>
                )}
                
              </div>
            </div>

            {/* Empty Slot Recommendation Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="mb-6 flex items-center gap-2 text-slate-800">
                <CalendarPlus className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold">AI 빈자리 지역 키워드 추천</h2>
              </div>
              
              {selectedDate ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-indigo-600 text-base">{selectedDate}</span> 일정이 비어있습니다.<br/>지정된 <span className="font-bold text-slate-800">Tier 우선순위</span>에 기반한 추천 키워드입니다.
                  </p>
                  
                  {isLoadingRecs ? (
                    <div className="py-8 text-center text-sm text-slate-400 font-medium animate-pulse">
                      Tier 1 지역부터 사용 이력을 탐색 중...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.map((rec, idx) => (
                        <div key={idx} className="p-4 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors shadow-sm">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-orange-900">{rec.keyword}</span>
                              <span className="text-xs px-2.5 py-1 bg-white text-orange-700 font-semibold rounded-full border border-orange-100">{rec.reason}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <Info className="w-8 h-8 mb-3 opacity-60 text-slate-500" />
                  <p className="text-sm text-center font-medium leading-relaxed">달력에서 일정이 비어있는<br/>날짜를 클릭해보세요.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .fc {
          --fc-border-color: #e2e8f0;
          --fc-button-bg-color: #ffffff;
          --fc-button-border-color: #cbd5e1;
          --fc-button-text-color: #334155;
          --fc-button-hover-bg-color: #f8fafc;
          --fc-button-hover-border-color: #94a3b8;
          --fc-button-active-bg-color: #f1f5f9;
          --fc-button-active-border-color: #94a3b8;
          --fc-today-bg-color: #f8fafc;
          --fc-event-border-color: transparent;
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }
        .fc .fc-button-primary {
          text-transform: capitalize;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          transition: all 0.2s;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active {
          background-color: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .fc .fc-daygrid-event {
          border-radius: 6px;
          padding: 4px 6px;
          font-size: 0.75rem;
          font-weight: 600;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          cursor: pointer;
          white-space: normal !important;
          word-wrap: break-word;
          line-height: 1.3;
        }
        .fc-event-title {
          white-space: normal !important;
          word-wrap: break-word;
        }
        .fc .fc-daygrid-day-number {
          color: #475569;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 8px;
        }
        .fc .fc-col-header-cell-cushion {
          color: #334155;
          font-weight: 700;
          font-size: 0.875rem;
          padding: 12px 0;
        }
        .fc .fc-day-today {
          background-color: #f8fafc !important;
        }
        .fc .fc-day:hover {
          background-color: #f1f5f9;
          cursor: pointer;
        }
      `}} />
    </div>
  );
}
