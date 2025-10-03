import { useState } from 'react';
import { FileItem } from '../types';

interface FolderPieChartProps {
  fileData: FileItem[];
  currentPath: string;
}

interface PieSlice {
  name: string;
  value: number;
  percentage: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

const COLORS = [
  '#0f62fe', // Blue 60 (primary)
  '#4589ff', // Blue 50
  '#78a9ff', // Blue 40
  '#a6c8ff', // Blue 30
  '#d0e2ff', // Blue 20
  '#0043ce', // Blue 70
  '#002d9c', // Blue 80
  '#001d6c', // Blue 90
  '#001141', // Blue 100
  '#8ab4ff', // Blue 35
];

export function FolderPieChart({ fileData, currentPath }: FolderPieChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Parse size string to bytes for calculations
  const parseSizeToBytes = (sizeStr: string): number => {
    const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024,
    };
    
    return value * (multipliers[unit] || 1);
  };

  // Calculate pie slices from file data
  const calculateSlices = (): PieSlice[] => {
    if (fileData.length === 0) return [];

    // Get top items and group others
    const itemsWithBytes = fileData.map(item => ({
      ...item,
      bytes: parseSizeToBytes(item.size),
    })).sort((a, b) => b.bytes - a.bytes);

    const totalBytes = itemsWithBytes.reduce((sum, item) => sum + item.bytes, 0);
    if (totalBytes === 0) return [];

    // Take top 9 items, group the rest as "Others"
    const topItems = itemsWithBytes.slice(0, 9);
    const otherItems = itemsWithBytes.slice(9);
    const otherBytes = otherItems.reduce((sum, item) => sum + item.bytes, 0);

    const items = [...topItems];
    if (otherBytes > 0) {
      items.push({
        id: 'others',
        name: `Others (${otherItems.length} items)`,
        size: formatBytes(otherBytes),
        sizeBytes: otherBytes,
        type: 'group',
        path: '',
        bytes: otherBytes,
      });
    }

    let currentAngle = -90; // Start from top
    return items.map((item, index) => {
      const percentage = (item.bytes / totalBytes) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      return {
        name: item.name,
        value: item.bytes,
        percentage,
        color: COLORS[index % COLORS.length],
        startAngle,
        endAngle,
      };
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const createArc = (
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): string => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', centerX, centerY,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  const slices = calculateSlices();
  const size = 300;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 10;

  if (fileData.length === 0) {
    return (
      <div className="pie-chart-container">
        <h4>Folder Distribution</h4>
        <div className="empty-chart">
          <p>No data to display</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)' }}>
            Scan a drive or navigate to a folder to see the size distribution
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pie-chart-container">
      <div className="pie-chart-header">
        <h4>Folder Distribution</h4>
        <p className="pie-chart-path">
          {currentPath || 'Select a drive'}
        </p>
      </div>

      <div className="pie-chart-wrapper">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, index) => (
            <g
              key={index}
              onMouseEnter={() => setHoveredSlice(index)}
              onMouseLeave={() => setHoveredSlice(null)}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={createArc(centerX, centerY, radius, slice.startAngle, slice.endAngle)}
                fill={slice.color}
                opacity={hoveredSlice === null || hoveredSlice === index ? 1 : 0.5}
                style={{
                  transition: 'opacity 0.2s ease',
                  stroke: 'var(--cds-layer-01)',
                  strokeWidth: 2,
                }}
              />
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredSlice !== null && slices[hoveredSlice] && (
          <div className="pie-chart-tooltip">
            <div className="tooltip-header">
              <div 
                className="tooltip-color" 
                style={{ backgroundColor: slices[hoveredSlice].color }}
              />
              <strong>{slices[hoveredSlice].name}</strong>
            </div>
            <div className="tooltip-content">
              <div>Size: {formatBytes(slices[hoveredSlice].value)}</div>
              <div>Percentage: {slices[hoveredSlice].percentage.toFixed(1)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="pie-chart-legend">
        {slices.map((slice, index) => (
          <div
            key={index}
            className="legend-item"
            onMouseEnter={() => setHoveredSlice(index)}
            onMouseLeave={() => setHoveredSlice(null)}
            style={{ opacity: hoveredSlice === null || hoveredSlice === index ? 1 : 0.5 }}
          >
            <div className="legend-color" style={{ backgroundColor: slice.color }} />
            <div className="legend-text">
              <span className="legend-name">{slice.name}</span>
              <span className="legend-value">{slice.percentage.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
