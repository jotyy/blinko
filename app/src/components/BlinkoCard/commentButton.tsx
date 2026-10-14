import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/trpc';
import { UserStore } from '@/store/user';
import { PromisePageState, PromiseState } from '@/store/standard/PromiseState';
import { type Comment } from '@shared/lib/types';
import { Icon } from '@/components/Common/Iconify/icons';
import { Button, Tooltip, Chip, Image } from '@heroui/react';
import { BlinkoStore } from '@/store/blinkoStore';
import { Note } from '@shared/lib/types';
import { RootStore } from '@/store';
import dayjs from '@/lib/dayjs';
import { useTranslation } from 'react-i18next';
import { useIsIOS } from '@/lib/hooks';
import { DialogStore } from '@/store/module/Dialog';
import { observer } from 'mobx-react-lite';
import { observable, runInAction } from 'mobx';
import { ScrollArea } from '../Common/ScrollArea';
import { MarkdownRender } from '../Common/MarkdownRender';
import { AnimatePresence, motion } from 'framer-motion';
import Avatar from "boring-avatars";
import { HubStore } from '@/store/hubStore';
import axios from 'axios';
import i18n from '@/lib/i18n';
import { Spinner } from '@heroui/react';
import { ToastPlugin } from '@/store/module/Toast/Toast';
import { BlinkoItem } from '.';
import { getBlinkoEndpoint } from '@/lib/blinkoEndpoint';
import { FallbackImage } from '../Common/FallbackImage';
export type AvatarAccount = { image?: string; nickname?: string; name?: string; id?: any | number; };

export const UserAvatar = observer(({ account, guestName, isAuthor, blinkoItem, withoutName, size = 20 }: {
  account?: AvatarAccount;
  guestName?: string;
  isAuthor?: boolean;
  blinkoItem?: BlinkoItem;
  withoutName?: boolean;
  size?: number;
}) => {
  const { t } = useTranslation();
  const displayName = account ? (account.nickname || account.name) : (guestName || '');
  return (
    <div className="flex items-center gap-2">
      {account ? (
        <>
          {account.image ? (
            <FallbackImage src={blinkoItem?.originURL ? (blinkoItem.originURL + account.image) : getBlinkoEndpoint(account.image + `?token=${RootStore.Get(UserStore).tokenData.value?.token}`)} radius="full" alt="" width={size} height={size} />
          ) : (
            <Avatar
              size={size}
              name={displayName}
              variant="beam"
            />
          )}
          {!withoutName && <span className="text-sm font-medium">{displayName}</span>}
          {isAuthor && blinkoItem && String(account.id) === String(blinkoItem.accountId) && (
            <Chip size="sm" color="warning" variant="flat">{t('author')}</Chip>
          )}
        </>
      ) : (
        <>
          <Avatar
            size={size}
            name={displayName}
            variant="beam"
          />
          {!withoutName && <span className="text-sm font-medium">{displayName}</span>}
        </>
      )}
    </div>
  );
});

// Which card has its thread open. One at a time, so the feed never turns into a wall of threads.
export const commentPanel = observable({ openId: null as number | null });
export const toggleComments = (id?: number | null) => {
  if (id == null) return;
  runInAction(() => { commentPanel.openId = commentPanel.openId === id ? null : id; });
};
export const openComments = (id?: number | null) => {
  if (id == null) return;
  runInAction(() => { commentPanel.openId = id; });
};

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

// One comment in the thread: avatar, name and time on one line, the body aligned under the name.
// Reply / delete appear on hover (always on touch); delete asks once more in place before it acts.
const NestedComment = observer(({
  comment,
  blinkoItem,
  depth = 0,
  Store,
}: {
  comment: Comment['items'][0],
  blinkoItem: BlinkoItem,
  depth?: number,
  Store: any
}) => {
  const { t } = useTranslation();
  const user = RootStore.Get(UserStore);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);
  const name = comment.account?.nickname || comment.account?.name || comment.guestName || t('anonymous');
  const canDelete = (user.id === comment.note?.account?.id || user.id === comment.account?.id) && !blinkoItem.originURL;
  const isFresh = Store.freshId === comment.id;
  const ua = comment.account ? '' : Store.safeUA(comment?.guestUA ?? '');
  const action = 'grid place-items-center size-7 rounded-md text-desc hover:text-foreground hover:bg-hover transition-colors duration-150';

  return (
    <div data-comment-id={comment.id}>
      <div className={`group/comment relative flex gap-3 rounded-xl px-2 py-2 -mx-2 transition-colors duration-700 ${isFresh ? 'bg-primary/10' : 'bg-transparent'}`}>
        <div className="pt-0.5 shrink-0">
          <UserAvatar account={comment.account || undefined} guestName={comment.guestName || undefined} withoutName size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 pr-16 min-w-0">
            <span className="text-[13px] font-medium text-foreground truncate">{name}</span>
            {comment.account && String(comment.account.id) === String(blinkoItem.accountId) && (
              <span className="text-[11px] text-desc">{t('author')}</span>
            )}
            <Tooltip content={dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')} delay={500} closeDelay={0}>
              <span className="text-[12px] text-desc tabular-nums shrink-0">{dayjs(comment.createdAt).fromNow()}</span>
            </Tooltip>
            {ua && <span className="text-[12px] text-ignore truncate">· {ua}</span>}
          </div>
          <div className="comment-body text-[14px] leading-relaxed mt-0.5">
            <MarkdownRender content={comment.content} />
          </div>
        </div>
        <div className="absolute right-1 top-1.5 flex items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
          <Tooltip content={t('reply', { defaultValue: 'Reply' })} delay={400} closeDelay={0}>
            <button type="button" aria-label={t('reply', { defaultValue: 'Reply' })} className={action}
              onClick={() => Store.handleReply(comment.id, name)}>
              <Icon icon="reicon:reply" width="16" height="16" />
            </button>
          </Tooltip>
          {canDelete && (
            confirming ? (
              <button type="button" onClick={() => Store.handleDelete.call(comment.id)}
                className="h-7 px-2 rounded-md text-[12px] font-medium text-danger bg-danger/10 hover:bg-danger/15 transition-colors duration-150">
                {t('delete')}?
              </button>
            ) : (
              <Tooltip content={t('delete')} delay={400} closeDelay={0}>
                <button type="button" aria-label={t('delete')} className={`${action} hover:!text-danger`} onClick={() => setConfirming(true)}>
                  <Icon icon="reicon:trash" width="16" height="16" />
                </button>
              </Tooltip>
            )
          )}
        </div>
      </div>

      {/* Replies hang off a hairline under the parent's avatar. Past a few levels they stop
          indenting, so a long exchange never squeezes the text column. */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={`${depth < 3 ? 'ml-[11px] pl-[21px]' : ''} border-l border-border`}>
          {comment.replies.map((reply) => (
            <NestedComment key={reply.id} comment={reply} blinkoItem={blinkoItem} depth={depth + 1} Store={Store} />
          ))}
        </div>
      )}
    </div>
  );
});

export const CommentDialog = observer(({ blinkoItem, inline = false, onClose }: { blinkoItem: BlinkoItem, inline?: boolean, onClose?: () => void }) => {
  const { t } = useTranslation();
  const blinko = RootStore.Get(BlinkoStore);
  const [content, setContent] = useState('');
  const user = RootStore.Get(UserStore);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const Store = RootStore.Local(() => ({
    reply: {
      id: null as number | null,
      name: ''
    },
    freshId: null as number | null,
    commentList: new PromisePageState({
      function: async ({ page, size }) => {
        if (blinkoItem.originURL) {
          const res = await axios.post(blinkoItem.originURL + '/api/v1/comment/list', {
            noteId: blinkoItem.id,
            page,
            size,
            orderBy: 'asc'
          })
          return res.data.items
        }

        const res = await api.comments.list.query({
          noteId: blinkoItem.id!,
          page,
          size,
          orderBy: 'asc'
        })
        return res.items
      }
    }),
    handleReply: (commentId: number, commentName: string) => {
      Store.reply = { id: commentId, name: commentName }
      inputRef.current?.focus()
    },
    handleSendComment: new PromiseState({
      function: async ({ content }: { content: string }) => {
        if (!content.trim()) return;
        const params: any = {
          content,
          noteId: blinkoItem.id
        }
        if (Store.reply.id) {
          params.parentId = Store.reply.id
        }

        if (blinkoItem.originURL) {
          await axios.post(blinkoItem.originURL + '/api/v1/comment/create', {
            ...params,
            guestName: user.userInfo.value?.nickName ?? user.userInfo.value?.name
          });
        } else {
          await api.comments.create.mutate(params);
        }

        setContent('');
        Store.reply = { id: null, name: '' };
        await Store.commentList.resetAndCall({});
        blinko.updateTicker++
        // Bring the new comment (the highest id in the thread; create returns no row) into view
        // and let it glow for a moment.
        const maxId = (items: any[] = []): number => items.reduce((m, c) => Math.max(m, c.id, maxId(c.replies)), -1);
        const top = maxId(Store.commentList.value as any[]);
        const id = top >= 0 ? top : null;
        Store.freshId = id;
        requestAnimationFrame(() => {
          const el = id != null ? listRef.current?.querySelector(`[data-comment-id="${id}"]`) : null;
          (el as HTMLElement | null)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          setTimeout(() => { if (Store.freshId === id) Store.freshId = null }, 1200);
        });
      }
    }),
    handleDelete: new PromiseState({
      function: async (commentId: number) => {
        if (blinkoItem.originURL) {
          await axios.post(blinkoItem.originURL + '/api/v1/comment/delete', {
            id: commentId
          });
        } else {
          await api.comments.delete.mutate({ id: commentId });
        }
        await Store.commentList.resetAndCall({});
        blinko.updateTicker++
      }
    }),
    safeUA: (ua: string) => {
      try {
        const _ua = JSON.parse(ua)
        return _ua.os.name + ' ' + _ua.browser.name
      } catch (error) {
        return ""
      }
    }
  }));

  useEffect(() => {
    Store.commentList.resetAndCall({});
    // Focus after the dialog has mounted, so typing can start immediately.
    const id = setTimeout(() => {
      const el = inputRef.current; if (!el) return;
      el.focus({ preventScroll: true });
      // Inline, the thread unfolds under the note: reveal the composer only as far as needed.
      if (inline) setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 220);
    }, 60);
    return () => clearTimeout(id);
  }, []);

  // The composer grows with its content, up to a cap, then scrolls.
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [content]);

  const sending = Store.handleSendComment.loading.value;
  const canSend = content.trim().length > 0 && !sending;
  const send = () => { if (canSend) Store.handleSendComment.call({ content }) };

  return (
    <div className="flex flex-col">
      {/* Thread */}
      {Store.commentList.isEmpty ? (
        inline ? null : (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <Icon icon="reicon:chat-round-dots" width="22" height="22" className="text-ignore" />
            <div className="text-[13px] text-desc">{t('no-comments-yet')}</div>
          </div>
        )
      ) : (
        <ScrollArea className={`${inline ? 'max-h-[420px]' : 'md:max-h-[480px] max-h-[360px] -mt-2'} overflow-y-auto pb-2`} onBottom={async () => {
          await Store.commentList.callNextPage({});
        }}>
          <div ref={listRef} className="flex flex-col gap-0.5 px-2">
            {Store.commentList.value?.map((comment: Comment['items'][0]) => (
              <NestedComment key={comment.id} comment={comment} blinkoItem={blinkoItem} depth={0} Store={Store} />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Composer */}
      <div className="mt-2 rounded-[14px] bg-card border border-border focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-[border-color,box-shadow] duration-150">
        {Store.reply.id && (
          <div className="flex items-center gap-1.5 pl-3 pr-1.5 pt-2 text-[12px] text-desc">
            <Icon icon="reicon:reply" width="14" height="14" />
            <span className="truncate">{t('reply-to')} <span className="font-medium text-foreground">@{Store.reply.name}</span></span>
            <button type="button" aria-label={t('cancel')} onClick={() => { Store.reply = { id: null, name: '' }; inputRef.current?.focus() }}
              className="ml-auto grid place-items-center size-6 rounded-md hover:bg-hover hover:text-foreground transition-colors duration-150">
              <Icon icon="reicon:xmark" width="14" height="14" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 pr-1.5">
          <textarea
            ref={inputRef}
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
              if (e.key === 'Escape') {
                if (Store.reply.id) { e.preventDefault(); e.stopPropagation(); Store.reply = { id: null, name: '' }; }
                else if (inline && !content) { e.preventDefault(); e.stopPropagation(); onClose?.(); }
              }
            }}
            placeholder={Store.reply.id ? t('write-a-reply', { defaultValue: 'Write a reply…' }) : t('leave-a-comment', { defaultValue: 'Leave a comment…' })}
            className="block flex-1 min-w-0 resize-none bg-transparent pl-3 py-[9px] text-[14px] leading-[22px] outline-none placeholder:text-ignore"
          />
          <div className="flex items-center gap-2 h-10 shrink-0">
            <span className={`text-[11px] text-ignore tabular-nums transition-opacity duration-150 ${content ? 'opacity-100' : 'opacity-0'}`}>
              {isMac ? '⌘' : 'Ctrl'} ↵
            </span>
            <button
              type="button"
              aria-label={t('send', { defaultValue: 'Send' })}
              disabled={!canSend}
              onClick={send}
              className="grid place-items-center size-7 rounded-full bg-foreground text-background enabled:active:scale-[0.96] disabled:opacity-20 transition-[opacity,scale] duration-150"
            >
              {sending ? <Spinner size="sm" color="current" classNames={{ wrapper: 'size-3.5' }} /> : <Icon icon="reicon:arrow-up" width="15" height="15" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const SimpleCommentList = observer(({ blinkoItem }: { blinkoItem: BlinkoItem }) => {
  const { t } = useTranslation();
  const commentList = blinkoItem.comments;

  if (!commentList || commentList?.length === 0) {
    return <div className="text-center text-gray-500 py-2">{t('no-comments-yet')}</div>;
  }

  // A comment preview inside the card: markdown markers stripped so headings and emphasis read
  // as text, at most three lines, and the whole thread one click away.
  const plain = (md: string) =>
    (md || '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/(\*\*|__|\*|_|`)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-border/70 pt-2.5">
      {commentList.map((comment: Comment['items'][0]) => (
        <button
          type="button"
          key={comment.id}
          onClick={(e) => { e.stopPropagation(); openComments(blinkoItem.id); }}
          className="text-left text-[13px] leading-relaxed text-desc rounded-lg -mx-1.5 px-1.5 py-1 hover:bg-hover hover:text-foreground/80 transition-colors duration-150"
        >
          <span className="line-clamp-3">
            <span className="font-medium text-foreground/80 mr-1.5">
              {comment.guestName || comment.account?.nickname || comment.account?.name || t('anonymous')}
            </span>
            {plain(comment.content)}
          </span>
        </button>
      ))}
    </div>
  );
});

// The thread, opened in place under the note. Clicks inside never reach the card (which would
// select or start editing it); Esc in an empty composer folds it away.
export const InlineComments = observer(({ blinkoItem }: { blinkoItem: BlinkoItem }) => {
  const isOpen = commentPanel.openId === blinkoItem.id;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="thread"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="overflow-hidden -mx-1 px-1"
          onClick={stop} onDoubleClick={stop} onContextMenu={stop} onKeyDown={stop} onPointerDown={stop}
        >
          <div className="mt-3 pt-3 border-t border-border/70">
            <CommentDialog blinkoItem={blinkoItem} inline onClose={() => toggleComments(blinkoItem.id)} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const ShowCommentDialog = async (noteId: number) => {
  const blinko = RootStore.Get(BlinkoStore);
  const dialog = RootStore.Get(DialogStore);

  try {
    dialog.setData({
      isOpen: true,
      size: 'lg',
      title: i18n.t('comment'),
      content: <div className="flex justify-center py-4"><Spinner /></div>
    });

    const noteDetail = await blinko.noteDetail.call({ id: noteId });

    if (!noteDetail) {
      RootStore.Get(ToastPlugin).error(i18n.t('note-not-found'));
      dialog.setData({ isOpen: false });
      return;
    }

    dialog.setData({
      isOpen: true,
      size: 'lg',
      title: `${i18n.t('comment')} ${noteDetail._count?.comments ? `(${noteDetail._count.comments})` : ''}`,
      content: <CommentDialog blinkoItem={noteDetail} />
    });

  } catch (error) {
    console.error('Failed to load note detail:', error);
    RootStore.Get(ToastPlugin).error(i18n.t('failed-to-load-comments'));
    dialog.setData({ isOpen: false });
  }
};

export const CommentButton = observer(({ blinkoItem, alwaysShow = false }: { blinkoItem: Note, alwaysShow?: boolean }) => {
  const { t } = useTranslation();
  const isIOSDevice = useIsIOS();
  const isOpen = commentPanel.openId === blinkoItem.id;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleComments(blinkoItem.id);
  };

  return (
    <Tooltip content={t('comment')} delay={1500}>
      <div className="flex items-center gap-2">
        <Icon
          icon="akar-icons:comment"
          width="15"
          height="15"
          className={`cursor-pointer ml-2 ${isIOSDevice
            ? 'opacity-60'
            : isOpen ? '!text-primary' : `${alwaysShow ? '!text-ignore' : '!text-desc opacity-0 group-hover/card:opacity-100 transition-opacity duration-150'}`
            }`}
          onClick={handleClick}
        />
      </div>
    </Tooltip>
  );
});

export const CommentCount = observer(({ blinkoItem }: { blinkoItem: Note }) => {
  if (blinkoItem?._count?.comments == 0) return null;
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleComments(blinkoItem.id);
  };
  return (
    <div className="flex items-center gap-1 hover:bg-background rounded-full px-1 py-0.5 cursor-pointer" onClick={handleClick}>
      <CommentButton blinkoItem={blinkoItem} alwaysShow={true} />
      <span className="text-sm text-ignore">{blinkoItem?._count?.comments}</span>
    </div>
  );
});
