import { ProgressBar, InlineLoading } from '@carbon/react';

interface ScanProgressProps {
  isScanning: boolean;
  currentPath?: string;
  filesScanned?: number;
  progress?: number;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({
  isScanning,
  currentPath = '',
  filesScanned = 0,
  progress = 0,
}) => {
  if (!isScanning) return null;

  return (
    <div className="scan-progress-container">
      <div className="scan-status">
        <InlineLoading description="Scanning in progress..." />
        <div className="scan-details">
          <p className="scan-path">Current: {currentPath}</p>
          <p className="scan-count">Files scanned: {filesScanned.toLocaleString()}</p>
        </div>
      </div>
      <ProgressBar
        label="Scan Progress"
        value={progress}
        max={100}
        helperText={`${progress}% complete`}
      />
    </div>
  );
};
