import { Tile, ProgressBar, Button } from '@carbon/react';
import { Archive, Search } from '@carbon/icons-react';

interface DriveCardProps {
  driveName: string;
  drivePath: string;
  totalSpace: string;
  usedSpace: string;
  freeSpace: string;
  usagePercentage: number;
  onScan: (path: string) => void;
  isScanning?: boolean;
}

export const DriveCard: React.FC<DriveCardProps> = ({
  driveName,
  drivePath,
  totalSpace,
  usedSpace,
  freeSpace,
  usagePercentage,
  onScan,
  isScanning = false,
}) => {
  return (
    <Tile className="drive-card">
      <div className="drive-card-header">
        <div className="drive-info">
          <Archive size={32} />
          <div className="drive-details">
            <h4>{driveName}</h4>
            <p className="drive-path">{drivePath}</p>
          </div>
        </div>
        <Button
          kind="tertiary"
          renderIcon={Search}
          onClick={() => onScan(drivePath)}
          disabled={isScanning}
          size="sm"
        >
          {isScanning ? 'Scanning...' : 'Scan'}
        </Button>
      </div>
      
      <div className="drive-storage">
        <div className="storage-info">
          <span className="storage-label">Used: {usedSpace}</span>
          <span className="storage-label">Free: {freeSpace}</span>
          <span className="storage-label">Total: {totalSpace}</span>
        </div>
        <ProgressBar
          label="Storage Usage"
          value={usagePercentage}
          max={100}
          helperText={`${usagePercentage.toFixed(2)}% used`}
        />
      </div>
    </Tile>
  );
};
