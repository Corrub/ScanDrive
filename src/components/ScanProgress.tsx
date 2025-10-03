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
    <div style={{
      background: 'var(--cds-layer-01)',
      border: '1px solid var(--cds-border-subtle)',
      borderRadius: '4px',
      padding: '1.5rem',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      <h4 style={{ margin: 0 }}>Scanning Drive</h4>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
        <InlineLoading description="Analyzing disk space..." />
        
        <ProgressBar
          label="Progress"
          value={progress}
          max={100}
          helperText={`${Math.round(progress)}% complete`}
        />
        
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          background: 'var(--cds-layer-02)',
          borderRadius: '4px'
        }}>
          <p style={{ 
            margin: '0 0 0.5rem 0',
            fontSize: '0.875rem',
            color: 'var(--cds-text-secondary)'
          }}>
            <strong>Current:</strong> {currentPath || 'Initializing...'}
          </p>
          <p style={{ 
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--cds-text-secondary)'
          }}>
            <strong>Files scanned:</strong> {filesScanned.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
