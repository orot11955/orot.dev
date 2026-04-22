'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './Dashboard.module.css';

interface VisitorTrendChartProps {
  data: Array<{ date: string; count: number }>;
}

const DESKTOP_CHART = {
  width: 720,
  height: 220,
  paddingX: 32,
  paddingTop: 16,
  paddingBottom: 32,
  dotRadius: 3,
};

const MOBILE_CHART = {
  width: 640,
  height: 320,
  paddingX: 24,
  paddingTop: 20,
  paddingBottom: 40,
  dotRadius: 2.5,
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function VisitorTrendChart({ data }: VisitorTrendChartProps) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 600px)');
    const sync = () => setCompact(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  const chart = compact ? MOBILE_CHART : DESKTOP_CHART;

  const points = useMemo(() => {
    if (data.length === 0) return null;

    const rawMax = Math.max(...data.map((d) => d.count), 1);
    const max = rawMax <= 4 ? rawMax + 1 : Math.ceil(rawMax * 1.15);
    const innerW = chart.width - chart.paddingX * 2;
    const innerH = chart.height - chart.paddingTop - chart.paddingBottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const coords = data.map((d, i) => {
      const x = chart.paddingX + step * i;
      const y = chart.paddingTop + innerH - (d.count / max) * innerH;
      return { x, y, ...d };
    });

    const linePath = coords
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');

    const areaPath =
      `M ${coords[0].x.toFixed(2)} ${chart.paddingTop + innerH} ` +
      coords.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
      ` L ${coords[coords.length - 1].x.toFixed(2)} ${chart.paddingTop + innerH} Z`;

    return { coords, linePath, areaPath, max, innerH };
  }, [chart, data]);

  if (!points) {
    return <div className={styles.chartEmpty}>표시할 데이터가 없습니다.</div>;
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = chart.paddingTop + points.innerH * (1 - ratio);
    return { y, label: Math.round(points.max * ratio) };
  });

  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        preserveAspectRatio="xMidYMid meet"
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
              x1={chart.paddingX}
              x2={chart.width - chart.paddingX}
              y1={g.y}
              y2={g.y}
              className={styles.chartGrid}
            />
            <text
              x={chart.paddingX - 8}
              y={g.y + 4}
              textAnchor="end"
              className={styles.chartAxisLabel}
            >
              {g.label}
            </text>
          </g>
        ))}

        <path d={points.areaPath} className={styles.chartArea} />
        <path
          d={points.linePath}
          className={styles.chartLine}
        />

        {points.coords.map((p) => (
          <g key={p.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={chart.dotRadius}
              className={styles.chartDot}
            />
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
              y={chart.height - 10}
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
