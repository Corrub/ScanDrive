import { TreeView, TreeNode } from '@carbon/react';
import { Folder, Document } from '@carbon/icons-react';

interface FileNode {
  id: string;
  label: string;
  isFolder: boolean;
  size?: string;
  children?: FileNode[];
}

interface FileSystemTreeProps {
  nodes: FileNode[];
  onNodeClick?: (node: FileNode) => void;
}

export const FileSystemTree: React.FC<FileSystemTreeProps> = ({
  nodes,
  onNodeClick,
}) => {
  const renderNode = (node: FileNode) => {
    return (
      <TreeNode
        key={node.id}
        id={node.id}
        label={
          <div className="tree-node-label">
            {node.isFolder ? <Folder size={16} /> : <Document size={16} />}
            <span>{node.label}</span>
            {node.size && <span className="node-size">{node.size}</span>}
          </div>
        }
        onClick={() => onNodeClick?.(node)}
      >
        {node.children?.map(renderNode)}
      </TreeNode>
    );
  };

  return (
    <div className="file-system-tree">
      <TreeView label="File System">
        {nodes.map(renderNode)}
      </TreeView>
    </div>
  );
};
