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
      className={`group relative w-full bg-surface-1 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand transition-transform ${
        selected ? 'ring-2 ring-brand scale-[0.96]' : ''
      }`}
    >
      {isVideo ? (
        <>
          <img
            src={mediaThumbnailUrl(item.id)}
            alt=""
            className="w-full h-auto"
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
          className="w-full h-auto"
          loading="lazy"
        />
      )}

      {/* Visibility badge */}
      {!selectable && (
        <div
          className="absolute top-2 right-2 bg-black/50 rounded-full w-6 h-6 flex items-center justify-center text-white/90"
          title={item.visibility === 'public' ? 'Visible to everyone' : 'Private — only you and admins'}
        >
          {item.visibility === 'public' ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>
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
