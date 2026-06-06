/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Source } from '../types';
import { ExternalLink, Layers } from 'lucide-react';

interface SourcesListProps {
  sources: Source[];
}

export function SourcesList({ sources }: SourcesListProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="w-full mt-4 border-t border-[#222] pt-3" id="sources-container">
      <div className="flex items-center gap-1.5 mb-2 text-xs text-[#888888] font-mono select-none">
        <Layers size={12} className="text-[#2563eb]" />
        <span>SOURCES ({sources.length})</span>
      </div>

      <div className="flex flex-wrap gap-2" id="sources-badge-list">
        {sources.map((source) => {
          // Robust domain extraction or fallback
          const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${source.domain}`;
          
          return (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 bg-[#121212] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] transition-all duration-150 px-2.5 py-1.5 rounded-lg text-xs text-[#d1d1d1] hover:text-[#ffffff] w-full sm:w-fit max-w-[240px]"
              title={source.snippet || source.title}
              id={`source-link-${source.id}`}
            >
              {/* Dynamic Favicon */}
              <img
                src={iconUrl}
                alt=""
                className="w-4 h-4 rounded object-cover border border-[#2e2e2e] bg-[#222]"
                onError={(e) => {
                  // Hide or fallback if icon fails to fetch
                  (e.target as HTMLImageElement).style.opacity = '0.5';
                }}
              />
              
              <div className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="font-semibold truncate text-[11px] text-[#e5e5e5] group-hover:text-blue-400 transition-colors">
                  {source.title}
                </span>
                <span className="text-[9px] text-[#666666] font-mono truncate">
                  {source.domain}
                </span>
              </div>
              
              <ExternalLink size={10} className="text-[#555] group-hover:text-white transition-colors flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
