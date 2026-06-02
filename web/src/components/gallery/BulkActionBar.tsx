interface Props {
  count: number;
  onTag: () => void;
  onDelete: () => void;
  onDone: () => void;
  isDeleting: boolean;
}

export default function BulkActionBar({ count, onTag, onDelete, onDone, isDeleting }: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-surface-2 border border-zinc-700 rounded-2xl px-5 py-3 shadow-2xl">
      <span className="text-sm text-zinc-300 font-medium">
        {count > 0 ? `${count} selected` : 'Select items'}
      </span>

      {count > 0 && (
        <>
          <div className="w-px h-4 bg-zinc-700" />

          <button
            onClick={onTag}
            className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Edit tags
          </button>

          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </>
      )}

      <div className="w-px h-4 bg-zinc-700" />

      <button
        onClick={onDone}
        className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
