import type { TagResponse } from '../../types/api';

interface Props {
  tags: TagResponse[];
  includedSlugs: string[];
  excludedSlugs: string[];
  mode: 'and' | 'or';
  untaggedOnly: boolean;
  onCycle: (slug: string) => void;
  onClear: () => void;
  onModeChange: (mode: 'and' | 'or') => void;
  onUntaggedToggle: () => void;
}

export default function TagFilterPanel({
  tags,
  includedSlugs,
  excludedSlugs,
  mode,
  untaggedOnly,
  onCycle,
  onClear,
  onModeChange,
  onUntaggedToggle,
}: Props) {
  const visible = tags.filter((t) => t.usageCount > 0);
  const hasAnyFilter = includedSlugs.length > 0 || excludedSlugs.length > 0;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between px-1.5 mb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Filters</h2>
        {hasAnyFilter && (
          <button
            onClick={onClear}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <button
        onClick={onUntaggedToggle}
        className={`text-sm text-left rounded-lg px-2.5 py-1.5 transition-colors ${
          untaggedOnly
            ? 'bg-brand text-white'
            : 'text-zinc-400 hover:bg-surface-2 hover:text-zinc-200'
        }`}
      >
        Untagged
      </button>

      {includedSlugs.length > 1 && (
        <button
          onClick={() => onModeChange(mode === 'and' ? 'or' : 'and')}
          className="text-xs text-left px-2.5 py-1.5 rounded-lg text-zinc-500 hover:bg-surface-2 hover:text-zinc-300 font-mono transition-colors"
          title={
            mode === 'and'
              ? 'Showing items with ALL selected tags — click for ANY'
              : 'Showing items with ANY selected tag — click for ALL'
          }
        >
          Match: {mode.toUpperCase()}
        </button>
      )}

      <div className="flex flex-col gap-0.5 mt-1.5 pt-1.5 border-t border-zinc-800 overflow-y-auto">
        {visible.map((tag) => {
          const included = includedSlugs.includes(tag.slug);
          const excluded = excludedSlugs.includes(tag.slug);

          return (
            <button
              key={tag.id}
              onClick={() => onCycle(tag.slug)}
              className={`flex items-center justify-between gap-2 text-sm text-left rounded-lg px-2.5 py-1.5 border-l-2 transition-colors ${
                included
                  ? 'border-brand bg-brand/15 text-zinc-100'
                  : excluded
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-transparent text-zinc-400 hover:bg-surface-2 hover:text-zinc-200'
              }`}
            >
              <span className="truncate">
                {excluded && <span className="mr-1 font-bold">−</span>}
                {tag.name}
              </span>
              <span className="text-xs opacity-60 shrink-0">{tag.usageCount}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
