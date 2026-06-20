import { mediaThumbnailUrl } from '../../api/media';
import type { MediaItem } from '../../types/api';

interface Props {
  item: MediaItem;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
}

export default function MediaCard({ item, onClick, selectable, selected }: Props) {
  const isVideo = item.mimeType.startsWith('video/');

  return (
    <button
      onClick={onClick}
      className={`group relative w-full bg-surface-1 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand sm:aspect-square transition-transform ${
        selected ? 'ring-2 ring-brand scale-[0.96]' : ''
      }`}
    >
      {isVideo ? (
        <>
          <img
            src={mediaThumbnailUrl(item.id)}
            alt=""
            className="w-full h-auto sm:h-full sm:object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full w-10 h-10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </>
      ) : (
        <img
          src={mediaThumbnailUrl(item.id)}
          alt=""
          className="w-full h-auto sm:h-full sm:object-cover"
          loading="lazy"
        />
      )}

      {/* Selection checkbox */}
      {selectable && (
        <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected
            ? 'bg-brand border-brand'
            : 'bg-black/40 border-white/60 group-hover:border-white'
        }`}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* Tag hover overlay */}
      {!selectable && item.tags.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-zinc-300 truncate">
            {item.tags.map((t) => t.name).join(', ')}
          </p>
        </div>
      )}
    </button>
  );
}
