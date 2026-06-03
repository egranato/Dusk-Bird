import { useState, useRef, type RefObject } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import * as tagsApi from '../../api/tags';
import type { TagResponse } from '../../types/api';

interface Props {
  allTags: TagResponse[];
  appliedIds: Set<string>;
  onAdd: (tagName: string) => void;
  isAdmin: boolean;
  inputRef?: RefObject<HTMLInputElement>;
  placeholder?: string;
}

export default function TagInput({ allTags, appliedIds, onAdd, isAdmin, inputRef, placeholder = 'Add tags…' }: Props) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  const [value, setValue] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [requestFeedback, setRequestFeedback] = useState('');

  const requestMutation = useMutation({
    mutationFn: (name: string) => tagsApi.requestTag(name),
    onSuccess: (_, name) => {
      setRequestFeedback(`"${name}" requested — an admin will review it`);
      setValue('');
      setFocusedIndex(-1);
      setTimeout(() => setRequestFeedback(''), 4000);
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err) && err.response?.status === 409
        ? (err.response.data?.message ?? 'Already exists or pending')
        : 'Request failed';
      setRequestFeedback(msg);
      setTimeout(() => setRequestFeedback(''), 4000);
    },
  });

  const filtered = value.trim().length > 0
    ? allTags
        .filter((t) => !appliedIds.has(t.id) && t.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 8)
    : [];

  const exactMatch = allTags.find(
    (t) => t.name.toLowerCase() === value.toLowerCase().trim(),
  );

  // The request option appears for everyone when there's no exact match.
  const showRequest = value.trim().length > 0 && !exactMatch;
  // Total navigable items: filtered tags + optional request row.
  const totalItems = filtered.length + (showRequest ? 1 : 0);

  function selectCurrent() {
    if (focusedIndex >= 0 && focusedIndex < filtered.length) {
      onAdd(filtered[focusedIndex].name);
      setValue('');
      setFocusedIndex(-1);
    } else if (showRequest && focusedIndex === filtered.length) {
      requestMutation.mutate(value.trim());
    } else if (exactMatch) {
      onAdd(exactMatch.name);
      setValue('');
      setFocusedIndex(-1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectCurrent();
    } else if (e.key === 'Escape') {
      setFocusedIndex(-1);
      setValue('');
    }
  }

  function handleChange(v: string) {
    setValue(v);
    setFocusedIndex(-1);
    setRequestFeedback('');
  }

  const canAdd = !!exactMatch;

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <input
          ref={ref}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 bg-surface-2 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          onClick={selectCurrent}
          disabled={!canAdd}
          className="bg-brand hover:bg-brand-hover disabled:opacity-40 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex-shrink-0"
        >
          Add
        </button>
      </div>

      {/* Dropdown */}
      {value.trim().length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-zinc-700 rounded-lg overflow-hidden z-20 shadow-xl">
          {filtered.length === 0 && !showRequest && (
            <li className="px-3 py-2 text-xs text-zinc-500">No matching tags</li>
          )}

          {filtered.map((t, i) => (
            <li key={t.id}>
              <button
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  focusedIndex === i ? 'bg-surface-3' : 'hover:bg-surface-3'
                }`}
                onMouseDown={(e) => { e.preventDefault(); onAdd(t.name); setValue(''); setFocusedIndex(-1); }}
                onMouseEnter={() => setFocusedIndex(i)}
              >
                {t.name}
              </button>
            </li>
          ))}

          {/* Request option for non-admins */}
          {showRequest && (
            <li>
              <button
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  focusedIndex === filtered.length ? 'bg-surface-3 text-zinc-300' : 'text-zinc-500 hover:bg-surface-3'
                }`}
                onMouseDown={(e) => { e.preventDefault(); requestMutation.mutate(value.trim()); }}
                onMouseEnter={() => setFocusedIndex(filtered.length)}
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending ? 'Requesting…' : `Request "${value.trim()}" as a new tag`}
              </button>
            </li>
          )}
        </ul>
      )}

      {requestFeedback && (
        <p className="text-xs text-zinc-400 mt-1">{requestFeedback}</p>
      )}
    </div>
  );
}
