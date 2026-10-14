import { Icon } from '@/components/Common/Iconify/icons';
import { EditorStore } from '../../editorStore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

interface Props {
  store: EditorStore;
  isSendLoading?: boolean;
}

// The same round ink button as the AI composer's send, so both writing surfaces finish the same way.
export const SendButton = observer(({ store, isSendLoading }: Props) => {
  const { t } = useTranslation();
  const busy = Boolean(store.files?.some(i => i.uploadPromise?.loading?.value) || isSendLoading);

  const send = () => {
    if (busy) return;
    store.handleSend();
  };

  return (
    <button
      type="button"
      aria-label={t('send', { defaultValue: 'Send' })}
      aria-busy={busy}
      onClick={send}
      onTouchEnd={(e) => {
        // Touch fires before the synthetic click on mobile; handle it once here.
        e.preventDefault();
        e.stopPropagation();
        send();
      }}
      className={[
        'ml-1 grid place-items-center size-[32px] shrink-0 rounded-full',
        'bg-foreground text-background hover:opacity-90',
        'transition-[opacity,scale] duration-150 ease-out',
        'enabled:active:scale-[0.96] motion-reduce:enabled:active:scale-100',
        busy ? 'cursor-progress opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      {busy
        ? <Icon icon="eos-icons:three-dots-loading" width="16" height="16" />
        : <Icon icon="uil:arrow-up" width="16" height="16" />}
    </button>
  );
});
