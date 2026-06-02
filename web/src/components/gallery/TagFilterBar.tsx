import type { TagResponse } from '../../types/api';

interface Props {
  tags: TagResponse[];
  activeSlugs: string[];
  mode: 'and' | 'or';
  onToggle: (slug: string) => void;
  onClear: () => void;
  onModeChange: (mode: 'and' | 'or') => void;
}

export default function TagFilterBar({ tags, activeSlugs, mode, onToggle, onClear, onModeChange }: Props) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag) => {
        const active = activeSlugs.includes(tag.slug);
        return (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.slug)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              active
                ? 'bg-brand border-brand text-white'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            {tag.name}
            <span className="ml-1 opacity-60">{tag.usageCount}</span>
          </button>
        );
      })}

      {activeSlugs.length > 1 && (
        <button
          onClick={() => onModeChange(mode === 'and' ? 'or' : 'and')}
          className="text-xs px-2.5 py-1 rounded-full border border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition-colors font-mono"
          title={mode === 'and' ? 'Showing items with ALL selected tags — click for ANY' : 'Showing items with ANY selected tag — click for ALL'}
        >
          {mode.toUpperCase()}
        </button>
      )}

      {activeSlugs.length > 0 && (
        <button
          onClick={onClear}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
