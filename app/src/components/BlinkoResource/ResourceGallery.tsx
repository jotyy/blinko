import { Checkbox, Tooltip } from '@heroui/react';
import { observer } from 'mobx-react-lite';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import filesize from 'filesize';
import { useTranslation } from 'react-i18next';
import { _ } from '@/lib/lodash';
import { type ResourceType } from '@shared/lib/types';
import { Icon } from '@/components/Common/Iconify/icons';
import { FileIcons } from '@/components/Common/AttachmentRender/FileIcon';
import { ImageThumbnailRender } from '../Common/AttachmentRender/imageRender';
import { getBlinkoEndpoint } from '@/lib/blinkoEndpoint';
import { RootStore } from '@/store';
import { ResourceStore } from '@/store/resourceStore';
import { UserStore } from '@/store/user';
import { ResourceContextMenu } from './ResourceContextMenu';

interface ResourceGalleryProps {
  resources: ResourceType[];
  selectedIds: Set<number>;
  onSelect: (id: number) => void;
  onFolderClick: (folderName: string) => void;
}

const splitName = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? { base: name, ext: '' } : { base: name.slice(0, dot), ext: name.slice(dot + 1).toLowerCase() };
};

/*
 * Resources as a gallery: folders as a row of chips, then files as a masonry wall, name and size beneath.
 * Selection and the actions menu appear on hover (and stay while selected / focused). Every image
 * shares one PhotoProvider, so the viewer swipes through the whole gallery.
 */
export const ResourceGallery = observer(({ resources, selectedIds, onSelect, onFolderClick }: ResourceGalleryProps) => {
  const { t } = useTranslation();
  const resourceStore = RootStore.Get(ResourceStore);
  const token = RootStore.Get(UserStore).tokenData.value?.token;

  const folders = resources.filter((r) => r.isFolder);
  const files = resources.filter((r) => !r.isFolder);

  const tileBase =
    'group/tile relative flex flex-col rounded-[14px] bg-card overflow-hidden ' +
    '[box-shadow:var(--heroui-box-shadow-small)] hover:[box-shadow:var(--heroui-box-shadow-medium)] ' +
    'transition-shadow duration-150 ease-out';

  return (
    <PhotoProvider>
      {/* Folders first, as a compact row of chips: they're places to go, not things to look at. */}
      {folders.length > 0 && (
        <div className="grid gap-2 pt-2 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {folders.map((folder) => (
            <div
              role="button"
              tabIndex={0}
              key={`folder-${folder.folderName}`}
              onClick={() => onFolderClick(folder.folderName || '')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFolderClick(folder.folderName || ''); } }}
              className="group/tile flex items-center gap-2.5 h-12 pl-3 pr-1.5 rounded-[12px] bg-card cursor-pointer outline-none [box-shadow:var(--heroui-box-shadow-small)] hover:[box-shadow:var(--heroui-box-shadow-medium)] transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <Icon icon="reicon:folder-filled" width="20" height="20" className="text-primary/80" />
              <span className="flex-1 min-w-0 truncate text-[13px] font-medium">{folder.folderName}</span>
              <div className="opacity-0 group-hover/tile:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                <ResourceContextMenu onTrigger={() => resourceStore.setContextMenuResource(_.cloneDeep(folder))} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Files as a masonry: images keep their own proportions (very tall ones are capped), other
          files sit in a shorter card — so the wall reads as a collage, not a spreadsheet. */}
      <div className="columns-[176px] gap-3 py-3">
        {files.map((item) => {
          const { base, ext } = splitName(item.name);
          const isImage = item.type?.startsWith('image/');
          const selected = selectedIds.has(item.id!);
          return (
            <div key={`file-${item.id}`} className={`${tileBase} mb-3 break-inside-avoid ${selected ? 'ring-2 ring-inset ring-primary' : ''}`}>
              <div className={`relative overflow-hidden bg-muted/60 ${isImage ? 'min-h-[96px]' : 'aspect-[5/3]'}`}>
                {isImage ? (
                  <PhotoView src={getBlinkoEndpoint(`${item.path}?token=${token}`)}>
                    <button type="button" aria-label={base} className="block w-full cursor-zoom-in">
                      <ImageThumbnailRender src={item.path} className="!w-full !h-auto max-h-[420px] !rounded-none object-cover" />
                    </button>
                  </PhotoView>
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <FileIcons path={item.path} size={40} />
                  </div>
                )}

                {/* Select: on hover, and pinned while selected. */}
                <div
                  className={`absolute z-10 top-2 left-2 rounded-md bg-card/90 p-0.5 transition-opacity duration-150 ${selected ? 'opacity-100' : 'opacity-0 group-hover/tile:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox size="sm" isSelected={selected} onChange={() => onSelect(item.id!)} aria-label={base} />
                </div>

                {/* Actions menu: on hover / focus. */}
                <div
                  className="absolute z-10 top-2 right-2 rounded-md bg-card/90 opacity-0 group-hover/tile:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ResourceContextMenu onTrigger={() => resourceStore.setContextMenuResource(_.cloneDeep(item))} />
                </div>
              </div>

              <div className="px-3 py-2.5 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-medium text-foreground truncate">{base}</span>
                  {!item.noteId && (
                    <Tooltip content={t('no-note-associated')} delay={400}>
                      <span className="shrink-0 text-desc"><Icon icon="reicon:link-broken" width="13" height="13" /></span>
                    </Tooltip>
                  )}
                </div>
                <div className="text-[11px] text-desc tabular-nums truncate">
                  {ext ? `${ext.toUpperCase()} · ` : ''}{filesize(Number(item.size))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PhotoProvider>
  );
});
