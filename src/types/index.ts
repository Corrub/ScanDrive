export interface Drive {
  name: string;
  path: string;
  totalSpace: string;
  usedSpace: string;
  freeSpace: string;
  usagePercentage: number;
}

export interface FileItem {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  type: string;
  path: string;
  lastModified?: string;
}

export interface ScanStatus {
  isScanning: boolean;
  currentPath: string;
  filesScanned: number;
  progress: number;
}

export interface FileCategory {
  name: string;
  size: number;
  percentage: number;
  color: string;
}
