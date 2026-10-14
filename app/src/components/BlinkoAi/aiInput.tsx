import { observer } from 'mobx-react-lite';
import { Textarea, Tooltip } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { useMediaQuery } from 'usehooks-ts';
import { api } from '@/lib/trpc';
import { AiStore } from '@/store/aiStore';
import { RootStore } from '@/store/root';
import { DialogStore } from '@/store/module/Dialog';
import { AiConversactionList } from './aiConversactionList';
import { PromiseCall } from '@/store/standard/PromiseState';
import { BlinkoSelectNote } from '../Common/BlinkoSelectNote';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '../Common/ScrollArea';
import AiSetting from '../BlinkoSettings/AiSetting/AiSetting';
import { useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AiInputProps {
  mode?: 'card' | 'inline';
  onSubmit?: (value: string) => void;
  className?: string;
  withoutOutline?: boolean;
}

/*
 * The composer is two layers:
 *   tray  — a quiet surface holding the session options (knowledge base, web, tools) and the
 *           secondary actions (settings, history);
 *   card  — the writing surface itself: the text, a reference button and the send button.
 * The card sits 6px inside the tray, so its radius is the tray's minus 6px and the curves stay
 * concentric. While chatting, the same structure collapses to a single docked line.
 */
const TRAY_RADIUS = 'rounded-[22px]';
const CARD_RADIUS = 'rounded-[16px]';

// A 32px circular icon action. Icon-only, so it always carries a tooltip and an aria-label.
const RoundAction = forwardRef<HTMLButtonElement, {
  label: string;
  icon: string;
  onPress?: () => void;
  className?: string;
}>(({ label, icon, onPress, className, ...rest }, ref) => (
  <Tooltip content={label} placement="top" delay={400} closeDelay={0}>
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={onPress}
      className={cn(
        'grid place-items-center size-[32px] shrink-0 rounded-full text-desc',
        'hover:bg-hover hover:text-foreground transition-colors duration-150',
        'enabled:active:scale-[0.96] motion-reduce:enabled:active:scale-100',
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} width="18" height="18" />
    </button>
  </Tooltip>
));
RoundAction.displayName = 'RoundAction';

// A session option that is either on or off, labelled so its state reads without a tooltip.
const ToolChip = ({ label, hint, icon, active, onToggle }: {
  label: string;
  hint?: string;
  icon: string;
  active: boolean;
  onToggle: () => void;
}) => {
  const chip = (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 h-[32px] pl-2.5 pr-3 rounded-full text-[13px] font-medium whitespace-nowrap',
        'border transition-[background-color,border-color,color] duration-150',
        'enabled:active:scale-[0.96] motion-reduce:enabled:active:scale-100',
        active
          ? 'bg-primary/10 border-primary/25 text-primary'
          : 'bg-transparent border-border text-desc hover:text-foreground hover:bg-hover',
      )}
    >
      <Icon icon={icon} width="16" height="16" />
      {label}
    </button>
  );
  return hint ? <Tooltip content={hint} placement="bottom" delay={400} closeDelay={0}>{chip}</Tooltip> : chip;
};

export const AiInput = observer(({ onSubmit, className, withoutOutline }: AiInputProps) => {
  const isPc = useMediaQuery('(min-width: 768px)');
  const aiStore = RootStore.Get(AiStore);
  const inline = aiStore.isChatting;
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = aiStore.input.trim() !== '';

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(aiStore.input);
    } else {
      aiStore.onInputSubmit();
    }
    // Blur on mobile to dismiss the keyboard.
    if (!isPc) {
      setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
          activeElement.blur();
        }
        textareaRef.current?.blur();
      }, 100);
    }
  };

  const onSendPress = () => {
    if (aiStore.isAnswering) return aiStore.abortAiChat();
    if (!canSend) return;
    handleSubmit();
  };

  const openSettings = () => {
    RootStore.Get(DialogStore).setData({
      isOpen: true,
      size: '2xl',
      onlyContent: true,
      title: t('settings'),
      content: (
        <ScrollArea className="h-full md:h-[600px]" onBottom={() => { }}>
          <AiSetting />
        </ScrollArea>
      ),
    });
  };

  const openHistory = () => {
    RootStore.Get(DialogStore).setData({
      isOpen: true,
      title: t('conversation-history'),
      content: <AiConversactionList />,
    });
  };

  const clearConversation = async () => {
    await PromiseCall(api.conversation.clearMessages.mutate({ id: aiStore.currentConversationId }));
    await aiStore.currentConversation.call();
  };

  const tools = [
    {
      key: 'rag',
      label: t('knowledge-base-search'),
      icon: 'hugeicons:search-list-01',
      active: aiStore.withRAG.value,
      toggle: () => aiStore.withRAG.save(!aiStore.withRAG.value),
    },
    {
      key: 'online',
      label: t('online-search'),
      icon: 'hugeicons:global-search',
      active: aiStore.withOnline.value,
      toggle: () => aiStore.withOnline.save(!aiStore.withOnline.value),
    },
    {
      key: 'tools',
      label: t('ai-tools'),
      hint: t('add-tools-to-model'),
      icon: 'hugeicons:ai-chemistry-02',
      active: aiStore.withTools.value,
      toggle: () => aiStore.withTools.save(!aiStore.withTools.value),
    },
  ];

  const sendLabel = aiStore.isAnswering ? t('stop') : t('send', { defaultValue: 'Send' });

  return (
    <div
      className={cn(
        'w-full transition-[max-width] duration-300 ease-out motion-reduce:transition-none',
        inline ? (isPc ? 'max-w-[85%]' : 'max-w-full') : (isPc ? 'max-w-[680px]' : 'max-w-full'),
        className,
      )}
    >
      {/* Tray */}
      <div
        className={cn(
          'p-1.5',
          withoutOutline ? '' : cn(TRAY_RADIUS, 'bg-secondbackground border border-border/70'),
        )}
      >
        {/* Card */}
        <div className={cn(CARD_RADIUS, 'bg-card shadow-[var(--heroui-box-shadow-small)]')}>
          <Textarea
            data-focus-visible="false"
            autoFocus
            value={aiStore.input}
            ref={(el) => {
              if (el) {
                const textareaElement = el.querySelector('textarea') as HTMLTextAreaElement;
                if (textareaElement) textareaRef.current = textareaElement;
              }
            }}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter breaks the line; an IME composition never sends.
              const isComposing = Boolean(e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing));
              if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            onChange={(e) => (aiStore.input = e.target.value)}
            classNames={{
              base: 'w-full',
              input: cn(
                '!bg-transparent border-none whitespace-pre-wrap text-[15px] leading-relaxed placeholder:text-desc/80',
                inline ? 'min-h-[22px]' : 'min-h-[72px]',
              ),
              inputWrapper: '!bg-transparent border-none !shadow-none px-4 pt-3.5 pb-0',
            }}
            minRows={inline ? 1 : 3}
            maxRows={inline ? 8 : 14}
            placeholder={t('search-blinko-content-or-help-create')}
          />

          <div className="flex items-center gap-1 px-2.5 pb-2.5 pt-1">
            <BlinkoSelectNote
              onSelect={(item) => {
                if (aiStore.referencesNotes?.includes(item.id)) return;
                aiStore.referencesNotes.push(item);
                aiStore.input = aiStore.input += `${item.content}`;
              }}
              iconButton={<RoundAction label={t('reference-note')} icon="hugeicons:at" />}
              blackList={aiStore.referencesNotes.map((i) => i.id ?? 0)}
            />
            {inline && (
              <>
                <RoundAction label={t('new-conversation')} icon="hugeicons:bubble-chat-add" onPress={() => aiStore.newChat()} />
                <RoundAction label={t('clear-current-content')} icon="hugeicons:delete-01" onPress={clearConversation} />
              </>
            )}

            <button
              type="button"
              aria-label={sendLabel}
              onClick={onSendPress}
              disabled={!canSend && !aiStore.isAnswering}
              className={cn(
                'ml-auto grid place-items-center size-[32px] shrink-0 rounded-full transition-[background-color,color,scale] duration-150',
                'enabled:active:scale-[0.96] motion-reduce:enabled:active:scale-100',
                canSend || aiStore.isAnswering
                  ? 'bg-foreground text-background hover:opacity-90'
                  : 'bg-muted text-desc/70 cursor-not-allowed',
              )}
            >
              {aiStore.isAnswering
                ? <span aria-hidden="true" className="block size-2.5 rounded-[2px] bg-current" />
                : <Icon icon="uil:arrow-up" width="16" height="16" />}
            </button>
          </div>
        </div>

        {/* Tray row: session options on the left, secondary actions on the right. */}
        {!inline && (
          <div className="flex items-center gap-1.5 px-1 pt-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {tools.map((tool) => (
                <ToolChip key={tool.key} label={tool.label} hint={tool.hint} icon={tool.icon} active={tool.active} onToggle={tool.toggle} />
              ))}
            </div>
            <div className="ml-auto flex items-center">
              <RoundAction label={t('settings')} icon="hugeicons:settings-03" onPress={openSettings} />
              <RoundAction label={t('conversation-history')} icon="hugeicons:book-edit" onPress={openHistory} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
