'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

export interface TableData {
  headers: string[];
  rows: string[][];
}

export type ChartType = 'line' | 'bar' | 'pie';

const COLORS = [
  '#2383e2', '#4dab9a', '#cb912f', '#e03e3e', '#787774',
  '#37352f', '#b4b4b0', '#2383e2', '#4dab9a', '#cb912f',
];

/* ── 숫자 파싱 ─────────────────────────────────────── */

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[,%원억만천\s]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function isNumericColumn(rows: string[][], colIndex: number): boolean {
  let numericCount = 0;
  for (const row of rows) {
    if (colIndex < row.length && parseNumber(row[colIndex]) !== null) {
      numericCount++;
    }
  }
  return numericCount >= rows.length * 0.5;
}

/* ── 비율/금액 컬럼 분류 ──────────────────────────── */

function isRatioColumn(header: string, rows: string[][], colIndex: number): boolean {
  // 헤더 키워드 매칭
  if (/[률율]|%|비율|증감|변동/.test(header)) return true;

  // 값 범위로 판별: 모든 값이 -100 ~ 200 범위 내이면 비율로 간주
  const values: number[] = [];
  for (const row of rows) {
    const num = parseNumber(row[colIndex] || '');
    if (num !== null) values.push(num);
  }
  if (values.length === 0) return false;
  return values.every((v) => v >= -100 && v <= 200);
}

interface ColumnClassification {
  header: string;
  colIndex: number;
  axis: 'left' | 'right';
}

function classifyColumns(
  headers: string[],
  rows: string[][],
  numericHeaders: string[],
): { columns: ColumnClassification[]; hasDualAxis: boolean } {
  const columns: ColumnClassification[] = [];
  let hasLeft = false;
  let hasRight = false;

  for (const h of numericHeaders) {
    const colIndex = headers.indexOf(h);
    const ratio = isRatioColumn(h, rows, colIndex);
    const axis = ratio ? 'right' : 'left';
    if (ratio) hasRight = true;
    else hasLeft = true;
    columns.push({ header: h, colIndex, axis });
  }

  // 한쪽만 있으면 단일 축
  if (!hasLeft || !hasRight) {
    return {
      columns: columns.map((c) => ({ ...c, axis: 'left' as const })),
      hasDualAxis: false,
    };
  }

  return { columns, hasDualAxis: true };
}

/* ── 차트 타입 감지 ───────────────────────────────── */

export function detectChartType(headers: string[], rows: string[][]): ChartType | null {
  if (headers.length < 2 || rows.length < 2) return null;

  const numericCols = headers
    .map((_, i) => i)
    .filter((i) => i > 0 && isNumericColumn(rows, i));
  if (numericCols.length === 0) return null;

  const firstHeader = headers[0];
  const firstColValues = rows.map((r) => r[0] || '');

  const isTimeSeries =
    /(?:연도|년도|기간|분기|월|year|date)/i.test(firstHeader) ||
    firstColValues.some((v) => /(?:20\d{2}|19\d{2})/.test(v));

  if (isTimeSeries) return 'line';
  if (numericCols.length === 1 && rows.length <= 6) return 'pie';
  return 'bar';
}

function getNumericHeaders(headers: string[], rows: string[][]): string[] {
  return headers.filter((_, i) => i > 0 && isNumericColumn(rows, i));
}

/* ── 데이터 추출 ──────────────────────────────────── */

function extractChartData(headers: string[], rows: string[][]) {
  return rows.map((row) => {
    const entry: Record<string, string | number> = { name: row[0] || '' };
    for (let i = 1; i < headers.length; i++) {
      const num = parseNumber(row[i] || '');
      if (num !== null) {
        entry[headers[i]] = num;
      }
    }
    return entry;
  });
}

/* ── 포맷터 ───────────────────────────────────────── */

function formatAmount(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_0000_0000) return `${sign}${(abs / 1_0000_0000).toFixed(1).replace(/\.0$/, '')}억`;
  if (abs >= 1_0000) return `${sign}${(abs / 1_0000).toFixed(1).replace(/\.0$/, '')}만`;
  return value.toLocaleString('ko-KR');
}

function formatRatio(value: number): string {
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`;
}

function getUnit(header: string, axis: 'left' | 'right'): string {
  if (axis === 'right') return '%';
  if (/억/.test(header)) return '억원';
  if (/만/.test(header)) return '만원';
  // 값 단위는 축 포맷터가 처리하므로 빈 문자열 허용
  return '';
}

function legendName(header: string, axis: 'left' | 'right'): string {
  const unit = getUnit(header, axis);
  return unit ? `${header} (${unit})` : header;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatTooltipValue = (value: any, name: any, _props: any) => {
  if (typeof value !== 'number') return [String(value ?? ''), name];
  if (typeof name === 'string' && /[률율]|%|비율|증감|변동/.test(name)) {
    return [formatRatio(value), name];
  }
  return [formatAmount(value), name];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderPieLabel = (entry: any) => {
  const name = entry.name ?? '';
  const pct = ((entry.percent ?? 0) * 100).toFixed(0);
  return `${name} (${pct}%)`;
};

/* ── 컴포넌트 ─────────────────────────────────────── */

interface ChartRendererProps {
  tableData: TableData;
}

export default function ChartRenderer({ tableData }: ChartRendererProps) {
  const { headers, rows } = tableData;
  const chartType = useMemo(() => detectChartType(headers, rows), [headers, rows]);
  const data = useMemo(() => extractChartData(headers, rows), [headers, rows]);
  const numericHeaders = useMemo(() => getNumericHeaders(headers, rows), [headers, rows]);
  const { columns, hasDualAxis } = useMemo(
    () => classifyColumns(headers, rows, numericHeaders),
    [headers, rows, numericHeaders],
  );

  // 범례 클릭으로 시리즈 숨김/표시 토글
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const handleLegendClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entry: any) => {
      const key = entry.dataKey ?? entry.value;
      if (!key) return;
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [],
  );

  if (!chartType || data.length === 0 || numericHeaders.length === 0) return null;

  const tooltipStyle = {
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid #e9e9e7',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  };

  const showToggle = numericHeaders.length >= 5;

  /* ── Line Chart ─────────────────────────────────── */
  if (chartType === 'line') {
    return (
      <div className="h-[300px] w-full py-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: hasDualAxis ? 20 : 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#b4b4b0" />

            {/* 왼쪽 Y축 (금액) */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              stroke="#b4b4b0"
              tickFormatter={formatAmount}
            />

            {/* 오른쪽 Y축 (비율) — 이중 축일 때만 */}
            {hasDualAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                stroke="#b4b4b0"
                tickFormatter={formatRatio}
              />
            )}

            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              onClick={showToggle ? handleLegendClick : undefined}
              formatter={(value: string) => {
                const col = columns.find((c) => c.header === value);
                const label = col ? legendName(col.header, col.axis) : value;
                const hidden = hiddenKeys.has(value);
                return (
                  <span style={{ color: hidden ? '#b4b4b0' : undefined, cursor: showToggle ? 'pointer' : undefined }}>
                    {label}
                  </span>
                );
              }}
            />

            {columns.map(({ header, axis }, i) => (
              <Line
                key={header}
                type="monotone"
                dataKey={header}
                yAxisId={hasDualAxis ? axis : 'left'}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                strokeDasharray={axis === 'right' && hasDualAxis ? '5 5' : undefined}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                hide={hiddenKeys.has(header)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ── Pie Chart ──────────────────────────────────── */
  if (chartType === 'pie') {
    return (
      <div className="h-[300px] w-full py-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={numericHeaders[0]}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderPieLabel}
              labelLine={{ stroke: '#b4b4b0' }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* ── Bar Chart ──────────────────────────────────── */
  return (
    <div className="h-[300px] w-full py-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: hasDualAxis ? 20 : 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#b4b4b0" />

          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            stroke="#b4b4b0"
            tickFormatter={formatAmount}
          />

          {hasDualAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              stroke="#b4b4b0"
              tickFormatter={formatRatio}
            />
          )}

          <Tooltip contentStyle={tooltipStyle} formatter={formatTooltipValue} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            onClick={showToggle ? handleLegendClick : undefined}
            formatter={(value: string) => {
              const col = columns.find((c) => c.header === value);
              const label = col ? legendName(col.header, col.axis) : value;
              const hidden = hiddenKeys.has(value);
              return (
                <span style={{ color: hidden ? '#b4b4b0' : undefined, cursor: showToggle ? 'pointer' : undefined }}>
                  {label}
                </span>
              );
            }}
          />

          {columns.map(({ header, axis }, i) => (
            <Bar
              key={header}
              dataKey={header}
              yAxisId={hasDualAxis ? axis : 'left'}
              fill={COLORS[i % COLORS.length]}
              radius={[4, 4, 0, 0]}
              hide={hiddenKeys.has(header)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
