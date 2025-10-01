import { Tile } from '@carbon/react';
import { FileCategory } from '../types';

interface StorageBreakdownProps {
  categories: FileCategory[];
  totalSize: string;
}

export const StorageBreakdown: React.FC<StorageBreakdownProps> = ({
  categories,
  totalSize,
}) => {
  return (
    <Tile className="storage-breakdown">
      <h4>Storage Breakdown</h4>
      <p className="total-size">Total: {totalSize}</p>
      
      <div className="category-list">
        {categories.map((category) => (
          <div key={category.name} className="category-item">
            <div className="category-header">
              <div className="category-info">
                <span
                  className="category-color"
                  style={{ backgroundColor: category.color }}
                />
                <span className="category-name">{category.name}</span>
              </div>
              <span className="category-percentage">{category.percentage}%</span>
            </div>
            <div className="category-bar">
              <div
                className="category-bar-fill"
                style={{
                  width: `${category.percentage}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Tile>
  );
};
