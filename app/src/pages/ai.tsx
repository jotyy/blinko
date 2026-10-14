import { useRef, useState, useEffect } from 'react';
import { AiInput } from '@/components/BlinkoAi/aiInput';
import { Icon } from '@/components/Common/Iconify/icons';
import { useMediaQuery } from 'usehooks-ts';
import { motion, AnimatePresence } from 'framer-motion';
import { AiStore } from '@/store/aiStore';
import { RootStore } from '@/store';
import { cn } from '@/lib/utils';
import { observer } from 'mobx-react-lite';
import { BlinkoChatBox } from '@/components/BlinkoAi/aiChatBox';
import { Watermark } from '@hirohe/react-watermark';
import { useTheme } from 'next-themes';
import { UserStore } from '@/store/user';
import { useTranslation } from 'react-i18next';
import { BaseStore } from '@/store/baseStore';
import i18n from '@/lib/i18n';
import { useSwiper } from '@/lib/hooks';
const AIPage = observer(() => {
  const [prompt, setPrompt] = useState('');
  const isPc = useMediaQuery('(min-width: 768px)');
  const userStore = RootStore.Get(UserStore)
  const { t } = useTranslation()
  const aiStore = RootStore.Get(AiStore)
  const baseStore = RootStore.Get(BaseStore)
  const InputBoxRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const [inputHeight, setInputHeight] = useState(0);
  const isVisible = useSwiper();
  useEffect(() => {
    if (!InputBoxRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setInputHeight(entry.contentRect.height);
      }
    });

    observer.observe(InputBoxRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // A greeting that follows the clock, and today's date in the interface language.
  const hour = new Date().getHours();
  const greeting = hour < 5 ? t('good-evening', { defaultValue: 'Good evening' })
    : hour < 12 ? t('good-morning', { defaultValue: 'Good morning' })
      : hour < 18 ? t('good-afternoon', { defaultValue: 'Good afternoon' })
        : t('good-evening', { defaultValue: 'Good evening' });
  const today = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const displayName = userStore.userInfo?.value?.nickName || userStore.userInfo?.value?.name || '';

  // Role presets always; the tool suggestions only when AI tools are on (as before).
  const starters = [
    { key: 'writing', label: t('writing'), icon: 'hugeicons:quill-write-02', run: () => aiStore.newRoleChat(t('ai-prompt-writing')) },
    { key: 'coding', label: t('coding'), icon: 'solar:code-bold', run: () => aiStore.newRoleChat(t('ai-prompt-coding')) },
    { key: 'translation', label: t('translation'), icon: 'hugeicons:message-translate', run: () => aiStore.newRoleChat(t('ai-prompt-translation', { lang: i18n.language })) },
    ...(aiStore.withTools.value
      ? ['ai-prompt-writing-content', 'ai-prompt-translation-content', 'ai-prompt-delete-content', 'ai-prompt-coding-content'].map((k) => ({
        key: k, label: t(k), icon: 'hugeicons:sparkles', run: () => aiStore.newChatWithSuggestion(t(k)),
      }))
      : []),
  ];

  // Staged entrance for the welcome view: heading, composer, list, 100ms apart. Under reduced
  // motion the MotionConfig in App.tsx drops the movement and blur, leaving the fade.
  const enter = (step: number) => ({
    initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.3, ease: 'easeOut', delay: step * 0.1 },
  });

  return (
    <div
      style={{
        height: isPc ? '100%' : `calc(100% - ${!isVisible ? '0px' : '60px'})`
      }}
      className={`flex flex-col items-center ${aiStore.isChatting ? 'pt-0' : 'pt-[8vh] md:pt-[16vh] px-4'} w-full gap-0 relative  md:h-[calc(100vh_-_80px)]`}>
      {!aiStore.isChatting ? (
        <motion.header {...enter(0)} className="w-full max-w-[680px] px-1">
          <div className="text-[13px] text-desc tabular-nums">{today}</div>
          <h1 className="mt-1 font-[family-name:var(--font-serif)] text-[28px] md:text-[32px] font-medium tracking-[-0.015em] text-foreground">
            {greeting}{displayName ? `, ${displayName}` : ''}
          </h1>
        </motion.header>
      ) : (
        <div className="w-full " style={{ height: `calc(100% - ${inputHeight}px)` }}>
          <BlinkoChatBox />
        </div>
      )}

      <motion.div
        ref={InputBoxRef}
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "flex flex-col items-center",
          isPc ? "w-[90%]" : "w-[95%]",
          aiStore.isChatting ? "absolute bottom-2" : "mt-4"
        )}
      >
        <motion.div {...(aiStore.isChatting ? {} : enter(1))} className="w-full flex justify-center">
          <AiInput className={aiStore.isChatting ? 'mt-0' : 'mt-6'} />
        </motion.div>

        {!aiStore.isChatting && (
          <motion.div {...enter(2)} className="w-full max-w-[680px] mt-5 px-1">
            <div className="px-1 mb-1.5 text-[12px] font-medium text-desc">
              {t('start-with', { defaultValue: 'Start with' })}
            </div>
            <div role="list" className="flex flex-wrap gap-2">
              {starters.map((item) => (
                <div role="listitem" key={item.key} className="max-w-full">
                  <button
                    type="button"
                    onClick={item.run}
                    title={item.label}
                    className="inline-flex max-w-full items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full border border-border bg-transparent text-[13px] font-medium text-foreground/85 hover:bg-hover hover:text-foreground transition-colors duration-150 enabled:active:scale-[0.96] motion-reduce:enabled:active:scale-100"
                  >
                    <Icon icon={item.icon} width="16" height="16" className="text-desc" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
});

export default AIPage;
