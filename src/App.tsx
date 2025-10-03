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
  Button,
  Loading,
  Theme,
  Modal,
  InlineNotification,
  Checkbox,
} from '@carbon/react';
import { Settings, Renew, ArrowUp, Folder, Asleep, Light, TrashCan } from '@carbon/icons-react';
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { DriveCard } from './components/DriveCard';
import { ScanProgress } from './components/ScanProgress';
import { FolderPieChart } from './components/FolderPieChart';
import { FileItem } from './types';
import './App.css';

interface Drive {
  name: string;
  path: string;
  totalSpace: string;
  usedSpace: string;
  freeSpace: string;
  usagePercentage: number;
}

function App() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanPath, setCurrentScanPath] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  // File data from directory listing
  const [fileData, setFileData] = useState<FileItem[]>([]);
  const [selectedDrivePath, setSelectedDrivePath] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  
  // Delete functionality state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotification, setDeleteNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filesToDelete, setFilesToDelete] = useState<FileItem[]>([]);
  
  // Theme state
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkTheme(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const headers = [
    { key: 'select', header: '' }, // Checkbox column
    { key: 'name', header: 'Name' },
    { key: 'size', header: 'Size' },
    { key: 'type', header: 'Type' },
    { key: 'actions', header: '' }, // Delete button column
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
      
      // Add actions property for table display
      const contentsWithActions = contents.map(item => ({
        ...item,
        actions: 'delete' // This will be handled by the table rendering
      }));
      
      setFileData(contentsWithActions);
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
    // Clear selections when navigating
    setSelectedItems(new Set());
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === fileData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(fileData.map(f => f.id)));
    }
  };

  const handleDeleteSelected = () => {
    const itemsToDelete = fileData.filter(f => selectedItems.has(f.id));
    setFilesToDelete(itemsToDelete);
    setDeleteModalOpen(true);
  };

  const handleDeleteFile = async (fileItem: FileItem) => {
    setFilesToDelete([fileItem]);
    setDeleteModalOpen(true);
  };  const confirmDelete = async () => {
    if (filesToDelete.length === 0) return;
    
    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      // Delete all selected files
      for (const item of filesToDelete) {
        try {
          await invoke<string>('delete_file_or_directory', { 
            path: item.path 
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to delete ${item.name}:`, error);
        }
      }
      
      // Show notification
      if (errorCount === 0) {
        setDeleteNotification({
          type: 'success',
          message: `Successfully deleted ${successCount} item(s)`
        });
      } else {
        setDeleteNotification({
          type: 'error',
          message: `Deleted ${successCount} item(s), failed to delete ${errorCount} item(s)`
        });
      }
      
      // Refresh the current directory contents
      if (currentPath) {
        await loadDirectoryContents(currentPath);
      } else if (selectedDrivePath) {
        await loadDirectoryContents(selectedDrivePath);
      }
      
      // Clear selections
      setSelectedItems(new Set());
      
    } catch (error) {
      setDeleteNotification({
        type: 'error',
        message: `Failed to delete: ${error}`
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setFilesToDelete([]);
      setSelectedItems(new Set());
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setDeleteNotification(null);
      }, 5000);
    }
  };

  const confirmMoveToTrash = async () => {
    if (filesToDelete.length === 0) return;
    
    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    
    try {
      // Move all selected files to trash
      for (const item of filesToDelete) {
        try {
          await invoke<string>('move_to_trash', { 
            path: item.path 
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to move ${item.name} to trash:`, error);
        }
      }
      
      // Show notification
      if (errorCount === 0) {
        setDeleteNotification({
          type: 'success',
          message: `Successfully moved ${successCount} item(s) to trash`
        });
      } else {
        setDeleteNotification({
          type: 'error',
          message: `Moved ${successCount} item(s) to trash, failed to move ${errorCount} item(s)`
        });
      }
      
      // Refresh the current directory contents
      if (currentPath) {
        await loadDirectoryContents(currentPath);
      } else if (selectedDrivePath) {
        await loadDirectoryContents(selectedDrivePath);
      }
      
      // Clear selections
      setSelectedItems(new Set());
      
    } catch (error) {
      setDeleteNotification({
        type: 'error',
        message: `Failed to move to trash: ${error}`
      });
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setFilesToDelete([]);
      setSelectedItems(new Set());
      
      // Clear notification after 5 seconds
      setTimeout(() => {
        setDeleteNotification(null);
      }, 5000);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setFilesToDelete([]);
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
      
      // Add actions property for table display
      const resultsWithActions = event.payload.map(item => ({
        ...item,
        actions: 'delete' // This will be handled by the table rendering
      }));
      
      // Display the scan results (top largest files)
      setFileData(resultsWithActions);
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



  return (
    <Theme theme={isDarkTheme ? 'g100' : 'white'}>
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
            aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
            tooltipAlignment="end"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
          >
            {isDarkTheme ? <Light size={20} /> : <Asleep size={20} />}
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

          {/* Left Column - Drives and File Table */}
          <Column lg={10} md={8} sm={4}>
            {/* Drive Cards Section */}
            <div className="drives-section">
              <h3>Available Drives</h3>
              <div className="drives-list">
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

            {/* File Analysis Section */}
            <div className="analysis-section" style={{ marginTop: '2rem' }}>
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
                {selectedItems.size > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <Button
                      kind="danger"
                      size="sm"
                      renderIcon={TrashCan}
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                    >
                      Delete {selectedItems.size} selected item(s)
                    </Button>
                  </div>
                )}
              </div>

              {isLoadingContents && (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <Loading description="Calculating folder sizes..." withOverlay={false} />
                </div>
              )}
              
              {!isLoadingContents && (
                <DataTable 
                  rows={fileData} 
                  headers={headers}
                  radio={false}
                  isSortable={false}
                >
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
                          {headers.map((header) => {
                            // Render select all checkbox in header
                            if (header.key === 'select') {
                              return (
                                <TableHeader
                                  key={header.key}
                                >
                                  <Checkbox
                                    id="select-all"
                                    labelText=""
                                    checked={selectedItems.size === fileData.length && fileData.length > 0}
                                    indeterminate={selectedItems.size > 0 && selectedItems.size < fileData.length}
                                    onChange={handleSelectAll}
                                  />
                                </TableHeader>
                              );
                            }
                            
                            return (
                              <TableHeader
                                {...getHeaderProps({ header })}
                              >
                                {header.header}
                              </TableHeader>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => {
                          const fileItem = fileData.find(f => f.id === row.id);
                          const isDirectory = fileItem?.type === 'directory';
                          
                          return (
                            <TableRow {...getRowProps({ row })}>
                              {row.cells.map((cell) => {
                                // Checkbox cell
                                if (cell.info.header === 'select') {
                                  return (
                                    <TableCell key={cell.id}>
                                      <Checkbox
                                        id={`select-${fileItem?.id}`}
                                        labelText=""
                                        checked={fileItem ? selectedItems.has(fileItem.id) : false}
                                        onChange={() => fileItem && handleSelectItem(fileItem.id)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </TableCell>
                                  );
                                }
                                
                                // Actions (delete button) cell
                                if (cell.info.header === 'actions') {
                                  // Don't show delete button for root folders (when currentPath equals selectedDrivePath)
                                  const isRootFolder = currentPath === selectedDrivePath;
                                  
                                  return (
                                    <TableCell key={cell.id}>
                                      {!isRootFolder && (
                                        <Button
                                          hasIconOnly
                                          kind="ghost"
                                          size="sm"
                                          renderIcon={TrashCan}
                                          iconDescription="Delete file"
                                          tooltipPosition="left"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (fileItem) {
                                              handleDeleteFile(fileItem);
                                            }
                                          }}
                                          disabled={isDeleting}
                                        />
                                      )}
                                    </TableCell>
                                  );
                                }
                                return (
                                  <TableCell 
                                    key={cell.id}
                                    style={{ 
                                      cursor: isDirectory ? 'pointer' : 'default',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onClick={() => {
                                      if (isDirectory && fileItem) {
                                        loadDirectoryContents(fileItem.path);
                                      }
                                    }}
                                    title={cell.info.header === 'name' ? fileItem?.path : undefined}
                                  >
                                    {cell.value}
                                  </TableCell>
                                );
                              })}
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

          {/* Right Column - Scan Progress and Pie Chart */}
          <Column lg={6} md={8} sm={4}>
            {isScanning ? (
              <ScanProgress
                isScanning={isScanning}
                currentPath={currentScanPath}
                filesScanned={filesScanned}
                progress={scanProgress}
              />
            ) : (
              <FolderPieChart 
                fileData={fileData}
                currentPath={currentPath}
                selectedItems={selectedItems}
              />
            )}
          </Column>
        </Grid>
      </Content>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        modalHeading="Confirm Deletion"
        modalLabel={filesToDelete.length > 1 ? `Delete ${filesToDelete.length} items` : "Delete File/Folder"}
        primaryButtonText="Delete permanently"
        secondaryButtonText="Move to trash"
        onRequestClose={cancelDelete}
        onRequestSubmit={confirmDelete}
        onSecondarySubmit={confirmMoveToTrash}
        danger
        size="sm"
      >
        <div>
          {filesToDelete.length === 1 ? (
            <>
              <p>
                Are you sure you want to delete <strong>{filesToDelete[0]?.name}</strong>?
              </p>
              <br />
              <div>
                <strong>Path:</strong>
                <br />
                <code style={{ 
                  display: 'block',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'var(--cds-layer-01)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  marginTop: '0.25rem',
                  maxHeight: '100px',
                  overflowY: 'auto'
                }}>
                  {filesToDelete[0]?.path}
                </code>
              </div>
              <br />
              <p>
                <strong>Size:</strong> {filesToDelete[0]?.size}
              </p>
            </>
          ) : (
            <>
              <p>
                Are you sure you want to delete <strong>{filesToDelete.length} items</strong>?
              </p>
              <br />
              <div>
                <strong>Items to be deleted:</strong>
                <ul style={{ 
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--cds-layer-01)',
                  padding: '0.5rem 0.5rem 0.5rem 2rem',
                  borderRadius: '4px',
                  marginTop: '0.25rem'
                }}>
                  {filesToDelete.map(item => (
                    <li key={item.id} style={{ wordBreak: 'break-word' }}>
                      {item.name} ({item.size})
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <br />
          <p style={{ color: 'var(--cds-text-secondary)' }}>
            <strong>Note:</strong> "Delete permanently" cannot be undone. "Move to trash" allows recovery.
          </p>
        </div>
      </Modal>

      {/* Delete Notification */}
      {deleteNotification && (
        <div style={{ 
          position: 'fixed', 
          top: '4rem', 
          right: '1rem', 
          zIndex: 9999,
          maxWidth: '400px'
        }}>
          <InlineNotification
            kind={deleteNotification.type}
            title={deleteNotification.type === 'success' ? 'Success' : 'Error'}
            subtitle={deleteNotification.message}
            onClose={() => setDeleteNotification(null)}
            hideCloseButton={false}
          />
        </div>
      )}
    </div>
    </Theme>
  );
}

export default App;
