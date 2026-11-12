'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Lebar maksimum dialog, default 'md' */
  size?: 'sm' | 'md' | 'lg';
};

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync open/close ke <dialog> native
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    if (!isOpen && el.open) el.close();
  }, [isOpen]);

  // Tutup saat klik backdrop (area luar dialog)
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose} // Escape key
      onClick={handleBackdropClick}
      className={cn(
        'w-full rounded-2xl border border-neutral-200 bg-white p-0 shadow-xl',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm',
        sizeClass[size],
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog"
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
