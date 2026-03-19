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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid #e9e9e7',
        background: '#ffffff',
        padding: '10px 16px',
      }}
    >
      {/* Search */}
      <div className="relative" ref={resultsRef}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            border: '1px solid #e9e9e7',
            background: '#f7f7f5',
            padding: '6px 10px',
          }}
        >
          <Search style={{ height: 14, width: 14, color: '#b4b4b0' }} />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="지표 검색..."
            style={{
              width: 180,
              background: 'transparent',
              fontSize: 12,
              color: '#37352f',
              outline: 'none',
              border: 'none',
            }}
            className="placeholder:text-[#b4b4b0]"
          />
        </div>
        {showResults && searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              zIndex: 50,
              marginTop: 4,
              width: 280,
              borderRadius: 8,
              border: '1px solid #e9e9e7',
              background: '#ffffff',
              padding: '4px 0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {searchResults.slice(0, 8).map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  useGraphStore.getState().selectNode(node);
                  setShowResults(false);
                  focusNode(node.id);
                }}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: '#37352f' }} className="truncate">{node.name}</span>
                {node.occurrences && node.occurrences.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#b4b4b0' }}>
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
          { key: null, label: '전체' },
          { key: 'increase', label: '증가 ▲' },
          { key: 'decrease', label: '감소 ▼' },
        ].map(({ key, label }) => {
          const active = filters.changeDirection === key;

          let activeStyle: React.CSSProperties = {};
          if (active) {
            if (key === null) {
              activeStyle = {
                background: '#ebebea',
                border: '1px solid #d4d4d0',
                color: '#37352f',
              };
            } else if (key === 'increase') {
              activeStyle = {
                background: '#f7f7f5',
                borderLeft: '3px solid #4dab9a',
                border: '1px solid #e9e9e7',
                borderLeftWidth: 3,
                color: '#37352f',
              };
            } else if (key === 'decrease') {
              activeStyle = {
                background: '#f7f7f5',
                borderLeft: '3px solid #e03e3e',
                border: '1px solid #e9e9e7',
                borderLeftWidth: 3,
                color: '#37352f',
              };
            }
          }

          return (
            <button
              key={label}
              onClick={() => setFilter({ changeDirection: key })}
              style={{
                borderRadius: 20,
                border: '1px solid #e9e9e7',
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: active ? undefined : '#ffffff',
                color: active ? undefined : '#b4b4b0',
                ...activeStyle,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Multi-Doc Only Checkbox */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginLeft: 8,
          fontSize: 11,
          color: '#787774',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={filters.multiDocOnly}
          onChange={(e) => setFilter({ multiDocOnly: e.target.checked })}
          style={{ height: 14, width: 14, borderRadius: 4, border: '1px solid #d4d4d0' }}
        />
        2개+ 문서
      </label>

      {/* Document Filter */}
      {indexedDocs.length > 0 && (
        <div className="relative ml-1" ref={docFilterRef}>
          <button
            onClick={() => setShowDocFilter(!showDocFilter)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              borderRadius: 8,
              border: filters.documentIds.length > 0 ? '1px solid #d4d4d0' : '1px solid #e9e9e7',
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: filters.documentIds.length > 0 ? '#f7f7f5' : '#ffffff',
              color: filters.documentIds.length > 0 ? '#37352f' : '#787774',
            }}
            onMouseEnter={(e) => { if (filters.documentIds.length === 0) e.currentTarget.style.background = '#f7f7f5'; }}
            onMouseLeave={(e) => { if (filters.documentIds.length === 0) e.currentTarget.style.background = '#ffffff'; }}
          >
            <FileText style={{ height: 12, width: 12 }} />
            문서{filters.documentIds.length > 0 && ` (${filters.documentIds.length})`}
            <ChevronDown style={{ height: 12, width: 12 }} />
          </button>
          {showDocFilter && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '100%',
                zIndex: 50,
                marginTop: 4,
                width: 260,
                borderRadius: 8,
                border: '1px solid #e9e9e7',
                background: '#ffffff',
                padding: '4px 0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  borderBottom: '1px solid #e9e9e7',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: '#787774' }}>문서 필터</span>
                {filters.documentIds.length > 0 && (
                  <button
                    onClick={() => setFilter({ documentIds: [] })}
                    style={{ fontSize: 11, color: '#2383e2', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1a73d1')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#2383e2')}
                  >
                    전체 선택
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
                {indexedDocs.map((doc) => {
                  const selected = filters.documentIds.length === 0 || filters.documentIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => toggleDocumentId(doc.id)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        style={{
                          display: 'flex',
                          height: 14,
                          width: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 4,
                          border: selected ? '1px solid #2383e2' : '1px solid #d4d4d0',
                          background: selected ? '#2383e2' : 'transparent',
                          flexShrink: 0,
                        }}
                      >
                        {selected && <Check style={{ height: 10, width: 10, color: '#ffffff' }} strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 12, color: '#37352f' }} className="truncate">{doc.originalFilename}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#b4b4b0' }}>{doc.fileType}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rebuild */}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={rebuildGraph}
          disabled={rebuilding}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            border: '1px solid #e9e9e7',
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: '#787774',
            background: 'transparent',
            cursor: rebuilding ? 'not-allowed' : 'pointer',
            opacity: rebuilding ? 0.5 : 1,
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { if (!rebuilding) e.currentTarget.style.background = '#f0f0ee'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <RefreshCw style={{ height: 14, width: 14 }} className={rebuilding ? 'animate-spin' : ''} />
          {rebuilding ? '재구축 중...' : '재구축'}
        </button>
      </div>
    </div>
  );
}
