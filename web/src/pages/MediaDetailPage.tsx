import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import * as mediaApi from '../api/media';
import AppLayout from '../components/layout/AppLayout';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let i = -1;
  do {
    size /= 1024;
    i++;
  } while (size >= 1024 && i < units.length - 1);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`;
}

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [linkCopied, setLinkCopied] = useState(false);

  const itemQuery = useQuery({
    queryKey: ['media', 'item', id],
    queryFn: () => mediaApi.getOne(id!),
    enabled: !!id,
    retry: false,
  });

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  const notFound = axios.isAxiosError(itemQuery.error) && itemQuery.error.response?.status === 404;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {itemQuery.isLoading && <p className="text-zinc-500 text-sm">Loading…</p>}

        {notFound && (
          <div className="bg-surface-1 rounded-xl p-8 text-center">
            <p className="text-zinc-300 font-medium mb-1">Not found</p>
            <p className="text-zinc-500 text-sm mb-4">
              This doesn't exist, or you don't have access to it.
            </p>
            <Link to="/" className="text-brand text-sm hover:text-brand-hover">
              Back to gallery
            </Link>
          </div>
        )}

        {itemQuery.data && (
          <div className="bg-surface-1 rounded-2xl overflow-hidden">
            {itemQuery.data.kind === 'media' && (
              <div className="bg-black flex items-center justify-center max-h-[70vh]">
                {itemQuery.data.mimeType.startsWith('video/') ? (
                  <video src={mediaApi.mediaDownloadUrl(itemQuery.data.id)} controls className="max-w-full max-h-[70vh]" />
                ) : (
                  <img
                    src={mediaApi.mediaDownloadUrl(itemQuery.data.id)}
                    alt={itemQuery.data.fileName}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                )}
              </div>
            )}

            <div className="p-5">
              <p className="font-medium mb-1 break-all">{itemQuery.data.fileName}</p>
              <p className="text-xs text-zinc-500 mb-4">
                {formatSize(itemQuery.data.sizeBytes)} ·{' '}
                {itemQuery.data.visibility === 'public' ? 'Visible to everyone' : 'Private'}
              </p>

              <div className="flex gap-2">
                <a
                  href={mediaApi.mediaDownloadUrl(itemQuery.data.id)}
                  download={itemQuery.data.fileName}
                  className="flex-1 text-center bg-brand hover:bg-brand-hover rounded-lg py-2 text-sm font-medium transition-colors"
                >
                  Download
                </a>
                <button
                  onClick={copyLink}
                  className="flex-1 text-center bg-surface-2 hover:bg-surface-3 rounded-lg py-2 text-sm transition-colors"
                >
                  {linkCopied ? 'Link copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
