import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Check, ChevronDown, Inbox } from 'lucide-react';

export interface BottomSheetOption<T = string | number> {
  id: T;
  title: string;
  subtitle?: string;
  category?: string;
  price?: number | string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface BottomSheetPickerProps<T = string | number> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: BottomSheetOption<T>[];
  selectedId?: T;
  onSelect: (option: BottomSheetOption<T>) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function BottomSheetPicker<T = string | number>({
  isOpen,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
  searchPlaceholder = 'Cari...',
  emptyMessage = 'Tidak ada pilihan yang cocok',
}: BottomSheetPickerProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchTitle = opt.title.toLowerCase().includes(q);
      const matchSub = opt.subtitle ? opt.subtitle.toLowerCase().includes(q) : false;
      const matchCat = opt.category ? opt.category.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return matchTitle || matchSub || matchCat || matchBadge;
    });
  }, [options, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (option: BottomSheetOption<T>) => {
    if (option.disabled) return;
    onSelect(option);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[88vh] border-t border-slate-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag / Bottom Sheet Handle */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">Pilih salah satu opsi di bawah</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6F00] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* List of Item Cards */}
        <div className="px-5 py-3 overflow-y-auto space-y-2.5 flex-1 max-h-[58vh]">
          {filteredOptions.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/60 text-[#FF6F00] flex items-center justify-center mb-3">
                <Inbox size={26} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{emptyMessage}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Coba gunakan kata kunci pencarian yang lain.
              </p>
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selectedId !== undefined && selectedId === opt.id;
              return (
                <button
                  key={String(opt.id)}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-3.5 ${
                    opt.disabled
                      ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-gradient-to-r from-orange-50/70 to-red-50/50 dark:from-orange-950/60 dark:to-red-950/40 border-[#FF6F00] shadow-sm ring-1 ring-[#FF6F00]'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200/90 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-xs'
                  }`}
                >
                  {/* Left Icon with Brand Gradient #E53935 to #FF6F00 */}
                  <div className="w-10 h-10 rounded-full brand-gradient-br text-white flex items-center justify-center shrink-0 shadow-sm font-black text-sm">
                    {opt.icon ? (
                      opt.icon
                    ) : (
                      <span>{opt.title.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Center Content: Title wrapped to 2 lines max, tag kategori, price */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 break-words"
                        title={opt.title}
                      >
                        {opt.title}
                      </h4>
                      {opt.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-[#FF6F00]">
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {opt.category && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                          {opt.category}
                        </span>
                      )}
                      {opt.subtitle && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {opt.subtitle}
                        </span>
                      )}
                      {opt.price !== undefined && (
                        <span className="text-xs font-black text-[#FF6F00] tabular-nums">
                          {typeof opt.price === 'number'
                            ? `Rp ${opt.price.toLocaleString('id-ID')}`
                            : opt.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Custom Checkmark */}
                  <div className="shrink-0 pl-1">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full brand-gradient-br text-white flex items-center justify-center shadow-xs">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-600 group-hover:border-slate-300" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center shrink-0">
          Total {filteredOptions.length} pilihan tersedia
        </div>
      </div>
    </div>
  );
}

export interface BottomSheetPickerTriggerProps {
  label?: string;
  valueTitle?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BottomSheetPickerTrigger({
  label,
  valueTitle,
  placeholder = 'Pilih salah satu...',
  icon,
  badge,
  onClick,
  disabled = false,
  className = '',
  error,
  size = 'md',
}: BottomSheetPickerTriggerProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`w-full bg-white dark:bg-slate-800 border rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
          error
            ? 'border-red-400 ring-1 ring-red-400'
            : 'border-slate-200 dark:border-slate-700 hover:border-orange-400 focus:border-[#FF6F00] focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900'
        } ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/60 opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:shadow-xs'
        } ${
          isSm
            ? 'px-3 py-1.5 text-xs'
            : isLg
            ? 'px-4 py-3 text-base'
            : 'px-3.5 py-2.5 text-sm'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon && (
            <div className="text-slate-400 shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {valueTitle ? (
              <span className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1 block">
                {valueTitle}
              </span>
            ) : (
              <span className="text-slate-400 font-normal line-clamp-1 block">
                {placeholder}
              </span>
            )}
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-[#FF6F00] shrink-0">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown size={18} className="text-slate-400 shrink-0" />
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
