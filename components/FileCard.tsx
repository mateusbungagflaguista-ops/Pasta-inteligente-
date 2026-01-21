
import React from 'react';
import { SmartFile } from '../types';

interface FileCardProps {
  file: SmartFile;
  onClick: (file: SmartFile) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.isImage) return '📸';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type === 'application/pdf') return '📕';
    return '📄';
  };

  const getIconColor = () => {
    if (file.isImage) return 'text-pink-500 bg-pink-50 dark:bg-pink-900/30';
    if (file.type.startsWith('audio/')) return 'text-purple-500 bg-purple-50 dark:bg-purple-900/30';
    if (file.type.startsWith('video/')) return 'text-red-500 bg-red-50 dark:bg-red-900/30';
    if (file.type === 'application/pdf') return 'text-orange-500 bg-orange-50 dark:bg-orange-900/30';
    return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30';
  };

  return (
    <div 
      onClick={() => onClick(file)}
      className="glass rounded-2xl p-4 shadow-sm border border-white dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group dark:bg-slate-800/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 group-hover:scale-110 ${getIconColor()}`}>
          {getFileIcon()}
        </div>
        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-md">
          {formatSize(file.size)}
        </div>
      </div>
      <h3 className="font-bold text-gray-800 dark:text-gray-200 truncate mb-1 text-sm">{file.name}</h3>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[32px] italic">
        {file.summary || "A ver que mambo é esse..."}
      </p>
      
      <div className="mt-3 flex flex-wrap gap-1">
        {file.tags?.slice(0, 2).map((tag, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-slate-600 rounded-md text-[9px] font-bold shadow-sm">
            #{tag}
          </span>
        ))}
        {file.tags && file.tags.length > 2 && (
          <span className="text-[9px] text-gray-400 self-center">+{file.tags.length - 2}</span>
        )}
      </div>
    </div>
  );
};

export default FileCard;
