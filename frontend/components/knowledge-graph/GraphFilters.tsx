'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, RefreshCw, FileText, ChevronDown, Check } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';
import { useDocumentStore } from '@/stores/documentStore';
import type { GraphNode } from '@/lib/types';

export default function GraphFilters() {
  const { filters, setFilter, searchMetrics, fetchGraph, rebuildGraph, rebuilding, focusNode } = useGraphStore();
  const documents = useDocumentStore((s) => s.documents);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showDocFilter, setShowDocFilter] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const resultsRef = useRef<HTMLDivElement>(null);
  const docFilterRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      searchMetrics('');
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      const results = await searchMetrics(value);
      setSearchResults(results);
      setShowResults(results.length > 0);
    }, 300);
  }, [searchMetrics]);

  // Enter key → select first result + zoom to it
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      const first = searchResults[0];
      useGraphStore.getState().selectNode(first);
      setShowResults(false);
      focusNode(first.id);
    }
  }, [searchResults, focusNode]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (docFilterRef.current && !docFilterRef.current.contains(e.target as Node)) {
        setShowDocFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleDocumentId = (docId: string) => {
    const current = filters.documentIds;
    const next = current.includes(docId)
      ? current.filter((id) => id !== docId)
      : [...current, docId];
    setFilter({ documentIds: next });
  };

  useEffect(() => {
    fetchGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.changeDirection, filters.multiDocOnly, filters.documentIds]);

  const indexedDocs = documents.filter((d) => d.status === 'INDEXED');

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
      {/* Search */}
      <div className="relative" ref={resultsRef}>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="지표 검색..."
            className="w-[180px] bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 w-[280px] rounded-lg border border-slate-200 bg-white py-1 shadow-modal">
            {searchResults.slice(0, 8).map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  useGraphStore.getState().selectNode(node);
                  setShowResults(false);
                  focusNode(node.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
              >
                <span className="text-xs font-medium text-slate-700 truncate">{node.name}</span>
                {node.occurrences && node.occurrences.length > 0 && (
                  <span className="ml-auto text-[10px] text-slate-400">
                    {node.occurrences.length}개 문서
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Change Direction Filter */}
      <div className="flex items-center gap-1 ml-2">
        {[
          { key: null, label: '전체', activeColor: '' },
          { key: 'increase', label: '증가 ▲', activeColor: 'border-green-400 bg-green-50 text-green-700' },
          { key: 'decrease', label: '감소 ▼', activeColor: 'border-red-400 bg-red-50 text-red-700' },
        ].map(({ key, label, activeColor }) => {
          const active = filters.changeDirection === key;
          return (
            <button
              key={label}
              onClick={() => setFilter({ changeDirection: key })}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                active ? (activeColor || 'border-primary-400 bg-primary-50 text-primary-700') : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Multi-Doc Only Checkbox */}
      <label className="flex items-center gap-1.5 ml-2 text-[11px] text-slate-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.multiDocOnly}
          onChange={(e) => setFilter({ multiDocOnly: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600"
        />
        2개+ 문서
      </label>

      {/* Document Filter */}
      {indexedDocs.length > 0 && (
        <div className="relative ml-1" ref={docFilterRef}>
          <button
            onClick={() => setShowDocFilter(!showDocFilter)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all ${
              filters.documentIds.length > 0
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-3 w-3" />
            문서{filters.documentIds.length > 0 && ` (${filters.documentIds.length})`}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showDocFilter && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[260px] rounded-lg border border-slate-200 bg-white py-1 shadow-modal">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">문서 필터</span>
                {filters.documentIds.length > 0 && (
                  <button
                    onClick={() => setFilter({ documentIds: [] })}
                    className="text-[11px] text-primary-600 hover:text-primary-700"
                  >
                    전체 선택
                  </button>
                )}
              </div>
              <div className="max-h-[200px] overflow-y-auto py-1">
                {indexedDocs.map((doc) => {
                  const selected = filters.documentIds.length === 0 || filters.documentIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDocumentId(doc.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                    >
                      <div className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                        selected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
                      }`}>
                        {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-xs text-slate-700 truncate">{doc.originalFilename}</span>
                      <span className="ml-auto text-[10px] text-slate-400">{doc.fileType}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rebuild */}
      <div className="ml-auto">
        <button
          onClick={rebuildGraph}
          disabled={rebuilding}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${rebuilding ? 'animate-spin' : ''}`} />
          {rebuilding ? '재구축 중...' : '재구축'}
        </button>
      </div>
    </div>
  );
}
