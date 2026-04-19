'use client';

import { useMemo } from 'react';
import styles from './Dashboard.module.css';

interface VisitorTrendChartProps {
  data: Array<{ date: string; count: number }>;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 200;
const PADDING_X = 32;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function VisitorTrendChart({ data }: VisitorTrendChartProps) {
  const points = useMemo(() => {
    if (data.length === 0) return null;

    const max = Math.max(...data.map((d) => d.count), 1);
    const innerW = CHART_WIDTH - PADDING_X * 2;
    const innerH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const coords = data.map((d, i) => {
      const x = PADDING_X + step * i;
      const y = PADDING_TOP + innerH - (d.count / max) * innerH;
      return { x, y, ...d };
    });

    const linePath = coords
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');

    const areaPath =
      `M ${coords[0].x.toFixed(2)} ${PADDING_TOP + innerH} ` +
      coords.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
      ` L ${coords[coords.length - 1].x.toFixed(2)} ${PADDING_TOP + innerH} Z`;

    return { coords, linePath, areaPath, max, innerH };
  }, [data]);

  if (!points) {
    return <div className={styles.chartEmpty}>표시할 데이터가 없습니다.</div>;
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = PADDING_TOP + points.innerH * (1 - ratio);
    return { y, label: Math.round(points.max * ratio) };
  });

  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="최근 방문자 추이"
      >
        <defs>
          <linearGradient id="visitor-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--public-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--public-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={PADDING_X}
              x2={CHART_WIDTH - PADDING_X}
              y1={g.y}
              y2={g.y}
              className={styles.chartGrid}
            />
            <text
              x={PADDING_X - 8}
              y={g.y + 4}
              textAnchor="end"
              className={styles.chartAxisLabel}
            >
              {g.label}
            </text>
          </g>
        ))}

        <path d={points.areaPath} fill="url(#visitor-area)" />
        <path
          d={points.linePath}
          fill="none"
          stroke="var(--public-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.coords.map((p) => (
          <g key={p.date}>
            <circle cx={p.x} cy={p.y} r={3} className={styles.chartDot} />
            <title>{`${formatShortDate(p.date)} · ${p.count}회`}</title>
          </g>
        ))}

        {points.coords.map((p, i) => {
          const show =
            i === 0 ||
            i === points.coords.length - 1 ||
            i === Math.floor(points.coords.length / 2);
          if (!show) return null;
          return (
            <text
              key={`label-${p.date}`}
              x={p.x}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              className={styles.chartAxisLabel}
            >
              {formatShortDate(p.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
