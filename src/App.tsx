import { useState, useEffect } from 'react';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Content,
  Grid,
  Column,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Toggle,
  Search,
  Button,
  Breadcrumb,
  BreadcrumbItem,
  Loading,
} from '@carbon/react';
import { Settings, Renew, ArrowUp, Folder } from '@carbon/icons-react';
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { DriveCard } from './components/DriveCard';
import { ScanProgress } from './components/ScanProgress';
import './App.css';

interface Drive {
  name: string;
  path: string;
  totalSpace: string;
  usedSpace: string;
  freeSpace: string;
  usagePercentage: number;
}

interface FileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  path: string;
}

function App() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanPath, setCurrentScanPath] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // File data from directory listing
  const [fileData, setFileData] = useState<FileItem[]>([]);
  const [selectedDrivePath, setSelectedDrivePath] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isLoadingContents, setIsLoadingContents] = useState(false);

  const headers = [
    { key: 'name', header: 'Name' },
    { key: 'size', header: 'Size' },
    { key: 'type', header: 'Type' },
    { key: 'path', header: 'Path' },
  ];

  // Load drives on mount
  useEffect(() => {
    loadDrives();
  }, []);

  // Load directory contents when a drive is selected
  useEffect(() => {
    if (selectedDrivePath) {
      loadDirectoryContents(selectedDrivePath);
    }
  }, [selectedDrivePath]);

  const loadDrives = async () => {
    try {
      const drivesData = await invoke<Drive[]>('get_drives');
      setDrives(drivesData);
      // Don't auto-select first drive to avoid loading large directory immediately
    } catch (error) {
      console.error('Failed to load drives:', error);
    }
  };

  const loadDirectoryContents = async (path: string) => {
    try {
      console.log('Loading directory contents for:', path);
      setIsLoadingContents(true);
      setCurrentPath(path);
      const contents = await invoke<FileItem[]>('get_directory_contents', { path });
      console.log('Loaded', contents.length, 'items:', contents.slice(0, 3));
      setFileData(contents);
    } catch (error) {
      console.error('Failed to load directory contents:', error);
    } finally {
      setIsLoadingContents(false);
    }
  };
  
  const navigateUp = () => {
    if (!currentPath || currentPath === selectedDrivePath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectoryContents(parentPath);
  };

  const handleScan = async (drivePath: string) => {
    setIsScanning(true);
    setCurrentScanPath(drivePath);
    setScanProgress(0);
    setFilesScanned(0);
    setSelectedDrivePath(drivePath);
    setFileData([]); // Clear previous results

    // Listen for progress updates
    const unlistenProgress = await listen<{current_path: string, files_scanned: number, progress: number}>('scan-progress', (event) => {
      setCurrentScanPath(event.payload.current_path);
      setFilesScanned(event.payload.files_scanned);
      setScanProgress(event.payload.progress);
    });

    // Listen for scan completion with results
    const unlistenComplete = await listen<FileItem[]>('scan-complete', (event) => {
      console.log('Scan completed with', event.payload.length, 'files');
      setIsScanning(false);
      setScanProgress(100);
      // Display the scan results (top largest files)
      setFileData(event.payload);
      // Clean up listeners
      unlistenProgress();
      unlistenComplete();
    });

    try {
      // Start the scan (returns immediately, scan runs in background)
      await invoke('scan_drive', { path: drivePath });
      console.log('Scan started for:', drivePath);
    } catch (error) {
      console.error('Failed to start scan:', error);
      setIsScanning(false);
      unlistenProgress();
      unlistenComplete();
    }
  };

  const handleRefreshDrives = async () => {
    await loadDrives();
  };

  const filteredFiles = fileData.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app-container">
      <Header aria-label="ScanDrive">
        <HeaderName prefix="">
          ScanDrive
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Refresh Drives"
            tooltipAlignment="end"
            onClick={handleRefreshDrives}
          >
            <Renew size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Settings"
            tooltipAlignment="end"
          >
            <Settings size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <Content>
        <Grid className="main-grid" fullWidth>
          <Column lg={16} md={8} sm={4}>
            <div className="page-header">
              <h2>Drive Scanner</h2>
              <p>Analyze disk space usage across your drives</p>
            </div>
          </Column>

          {/* Drive Cards Section */}
          <Column lg={16} md={8} sm={4}>
            <div className="drives-section">
              <h3>Available Drives</h3>
              <div className="drives-grid">
                {drives.map((drive) => (
                  <DriveCard
                    key={drive.path}
                    driveName={drive.name}
                    drivePath={drive.path}
                    totalSpace={drive.totalSpace}
                    usedSpace={drive.usedSpace}
                    freeSpace={drive.freeSpace}
                    usagePercentage={drive.usagePercentage}
                    onScan={handleScan}
                    isScanning={isScanning && currentScanPath === drive.path}
                  />
                ))}
              </div>
            </div>
          </Column>

          {/* Scan Progress Section */}
          {isScanning && (
            <Column lg={16} md={8} sm={4}>
              <ScanProgress
                isScanning={isScanning}
                currentPath={currentScanPath}
                filesScanned={filesScanned}
                progress={scanProgress}
              />
            </Column>
          )}

          {/* File Analysis Section */}
          <Column lg={16} md={8} sm={4}>
            <div className="analysis-section">
              <div className="analysis-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <h3>File System Analysis</h3>
                  {currentPath && (
                    <>
                      <Button
                        kind="ghost"
                        size="sm"
                        renderIcon={ArrowUp}
                        onClick={navigateUp}
                        disabled={!currentPath || currentPath === selectedDrivePath}
                      >
                        Up
                      </Button>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Folder size={16} />
                        <code>{currentPath}</code>
                      </span>
                    </>
                  )}
                </div>
                <div className="analysis-controls">
                  <Toggle
                    id="hidden-files-toggle"
                    labelText="Show hidden files"
                    size="sm"
                    toggled={showHiddenFiles}
                    onToggle={(checked) => setShowHiddenFiles(checked)}
                  />
                  <Search
                    size="lg"
                    placeholder="Search files and folders..."
                    labelText="Search"
                    closeButtonLabelText="Clear search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery('')}
                  />
                </div>
              </div>

              {isLoadingContents && (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <Loading description="Calculating folder sizes..." withOverlay={false} />
                </div>
              )}
              
              {!isLoadingContents && (
                <DataTable rows={filteredFiles} headers={headers}>
                  {({
                    rows,
                    headers,
                    getHeaderProps,
                    getRowProps,
                    getTableProps,
                    getTableContainerProps,
                  }) => (
                    <TableContainer
                      title="Files and Folders"
                      description="Click on a folder to explore its contents (sorted by size)"
                      {...getTableContainerProps()}
                    >
                    <Table {...getTableProps()} aria-label="file system table">
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader
                              {...getHeaderProps({ header })}
                            >
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => {
                          const fileItem = filteredFiles.find(f => f.id === row.id);
                          const isDirectory = fileItem?.type === 'directory';
                          
                          return (
                            <TableRow 
                              {...getRowProps({ row })}
                              style={{ cursor: isDirectory ? 'pointer' : 'default' }}
                              onClick={() => {
                                if (isDirectory && fileItem) {
                                  loadDirectoryContents(fileItem.path);
                                }
                              }}
                            >
                              {row.cells.map((cell) => (
                                <TableCell key={cell.id}>{cell.value}</TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
              )}
            </div>
          </Column>
        </Grid>
      </Content>
    </div>
  );
}

export default App;
