import React, { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RootStore } from '@/store';
import { BlinkoStore } from '@/store/blinkoStore';
import { observer } from 'mobx-react-lite';
import { eventBus } from '@/lib/event';
import { GlobalSearch } from './GlobalSearch';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearSearchState, getSearchWithClearedFilters } from '@/lib/searchFilters';

interface BarSearchInputProps {
  isPc: boolean;
}

export const BarSearchInput = observer(({ isPc }: BarSearchInputProps) => {
  const { t } = useTranslation();
  const blinkoStore = RootStore.Get(BlinkoStore);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [localSearchText, setLocalSearchText] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        eventBus.emit('open-global-search');
      }
    };

    eventBus.on('open-global-search', () => {
      setIsGlobalSearchOpen(true);
    });

    // Sync with blinkoStore.searchText
    setLocalSearchText(blinkoStore.searchText || '');

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [blinkoStore.searchText]);

  // Check if there are any active filters
  const hasActiveFilters = () => {
    const config = blinkoStore.noteListFilterConfig;
    return !!(
      localSearchText ||
      config.tagId !== null ||
      config.withoutTag ||
      config.withFile ||
      config.withLink ||
      config.isShare !== null ||
      config.hasTodo ||
      config.startDate !== null ||
      config.endDate !== null ||
      config.type !== 0
    );
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const handleGlobalSearch = () => {
    // Emit an event that will be caught by the CommonLayout to open the global search
    eventBus.emit('open-global-search');
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();

    setLocalSearchText('');
    clearSearchState(blinkoStore);

    navigate({
      pathname: location.pathname,
      search: getSearchWithClearedFilters(searchParams),
    });

    // Focus back on the search input after clearing
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <>
      <GlobalSearch isOpen={isGlobalSearchOpen} onOpenChange={setIsGlobalSearchOpen} />
      {!isPc && !showSearchInput ? (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
          <Button isIconOnly className="ml-auto mt-[2px]" size="sm" variant="light" onPress={() => handleGlobalSearch()}>
            <Icon className="text-default-600" icon="lets-icons:search" width="24" height="24" />
          </Button>
        </motion.div>
      ) : (
        <div className="hidden md:flex items-center relative">
          {/* A soft pill: light fill, hairline edge, the shortcut as one keycap. */}
          <button
            type="button"
            onClick={() => setIsGlobalSearchOpen(true)}
            className={`${!hasActiveFilters() ? 'w-[200px]' : 'w-auto min-w-[140px] max-w-[260px]'} group flex items-center gap-2 h-[32px] pl-3 pr-1.5 rounded-full border border-border bg-muted/60 hover:bg-hover text-[13px] text-desc transition-colors duration-150`}
          >
            <Icon icon="lets-icons:search" width="15" height="15" className="shrink-0" />
            {localSearchText.length > 0 ? (
              <span className="truncate mr-auto px-2 py-0.5 rounded-full bg-primary/12 text-primary font-medium">{localSearchText}</span>
            ) : (
              <span className="truncate mr-auto">{t('search')}</span>
            )}
            {localSearchText ? (
              <span
                role="button"
                aria-label={t('clear', { defaultValue: 'Clear' })}
                className="grid place-items-center size-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                onClick={handleClearSearch}
              >
                <Icon icon="ph:x-bold" width="12" height="12" />
              </span>
            ) : (
              <kbd className="shrink-0 h-[22px] px-1.5 grid place-items-center rounded-md border border-border bg-background text-[11px] font-medium text-desc font-sans tabular-nums">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            )}
          </button>
        </div>
      )}
    </>
  );
});
