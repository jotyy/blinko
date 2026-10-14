import { RootStore } from "@/store";
import { ResourceStore } from "@/store/resourceStore";
import { observer } from "mobx-react-lite";
import { useMemo, useCallback, useState } from "react";
import { ScrollArea } from "@/components/Common/ScrollArea";
import { Icon } from '@/components/Common/Iconify/icons';
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable } from 'react-beautiful-dnd-next';
import { toJS } from "mobx";
import { MemoizedResourceItem } from "@/components/BlinkoResource/ResourceItem";
import { ResourceGallery } from "@/components/BlinkoResource/ResourceGallery";
import { ResourceMultiSelectPop } from "@/components/BlinkoResource/ResourceMultiSelectpop";
import { Breadcrumbs, BreadcrumbItem, Button } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingAndEmpty } from "@/components/Common/LoadingAndEmpty";
import { PhotoProvider } from "react-photo-view";
import { useNavigate } from "react-router-dom";
const Page = observer(() => {
  const navigate = useNavigate();
  const resourceStore = RootStore.Get(ResourceStore);
  const { t } = useTranslation();
  const resources = useMemo(() => {
    const allResources = toJS(resourceStore.blinko.resourceList.value) || [];
    // Filter out .folder placeholder files
    return allResources.filter(resource => resource.name !== '.folder');
  }, [resourceStore.blinko.resourceList.value]);

  const selectedItems = resourceStore.selectedItems;

  // Gallery by default; the list stays for dragging files into folders. Remembered per browser.
  const [view, setView] = useState<'gallery' | 'list'>(() => {
    try { return localStorage.getItem('blinko-resources-view') === 'list' ? 'list' : 'gallery'; } catch { return 'gallery'; }
  });
  const chooseView = (v: 'gallery' | 'list') => {
    setView(v);
    try { localStorage.setItem('blinko-resources-view', v); } catch { }
  };

  const handleMoveSelectedToParent = useCallback(async () => {
    if (!resourceStore.currentFolder) return;
    const selectedResources = Array.from(selectedItems)
      .map(id => resources.find(r => r.id === id))
      .filter((item): item is NonNullable<typeof item> => item != null);

    if (selectedResources.length > 0) {
      await resourceStore.moveToParentFolder(selectedResources);
    }
  }, [resourceStore, selectedItems, resources]);

  const folderBreadcrumbs = useMemo(() => {
    if (!resourceStore.currentFolder) return [];
    return ['Root', ...resourceStore.currentFolder.split('/')];
  }, [resourceStore.currentFolder]);

  resourceStore.use();

  return (
    <>
      <DragDropContext onDragEnd={resourceStore.handleDragEnd}>
        <ScrollArea
          fixMobileTopBar
          onBottom={resourceStore.loadNextPage}
          className="md:px-6 h-[calc(100%_-_5px)] md:h-[calc(100vh_-_100px)] px-2 max-w-7xl w-full overflow-x-hidden mx-auto"
        >
          <div className="flex items-center justify-between ">
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {resourceStore.currentFolder && (
                  <motion.div
                    key={resourceStore.currentFolder}
                    initial={{ y: -10, opacity: 0, height: 0 }}
                    animate={{ y: 0, opacity: 1, height: "auto" }}
                    exit={{ y: -10, opacity: 0, height: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      duration: 0.15
                    }}
                  >
                    <Breadcrumbs variant="solid" className="ml-[-8px]" size='lg'>
                      {folderBreadcrumbs.map((folder, index) => (
                        <BreadcrumbItem
                          key={folder}
                          onPress={() => {
                            if (index === 0) {
                              resourceStore.navigateBack(navigate);
                            } else {
                              const currentPathSegments = resourceStore.currentFolder?.split('/') || [];
                              const clickedPathLevel = index;
                              const stepsToGoBack = currentPathSegments.length - clickedPathLevel;

                              for (let i = 0; i < stepsToGoBack; i++) {
                                resourceStore.navigateBack(navigate);
                              }
                            }
                          }}
                        >
                          {folder}
                        </BreadcrumbItem>
                      ))}
                    </Breadcrumbs>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 mt-2 ">
              <div role="radiogroup" aria-label={t('view', { defaultValue: 'View' })} className="flex items-center p-0.5 rounded-[10px] bg-muted/70">
                {([['gallery', 'reicon:gallery-wide', t('gallery', { defaultValue: 'Gallery' })], ['list', 'reicon:list3', t('list', { defaultValue: 'List' })]] as const).map(([key, icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={view === key}
                    aria-label={label}
                    onClick={() => chooseView(key)}
                    className={`grid place-items-center size-[28px] rounded-[8px] transition-colors duration-150 ${view === key ? 'bg-card text-foreground [box-shadow:var(--heroui-box-shadow-small)]' : 'text-desc hover:text-foreground'}`}
                  >
                    <Icon icon={icon} width="16" height="16" />
                  </button>
                ))}
              </div>
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <Button
                  size="sm"
                  variant="flat"
                  onPress={resourceStore.handleNewFolder}
                  startContent={<Icon icon="material-symbols:create-new-folder-outline" className="w-5 h-5" />}
                >
                  {t('new-folder')}
                </Button>
              </motion.div>

              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() => {
                    if (selectedItems.size === resources.length) {
                      resourceStore.clearSelection();
                    } else {
                      resourceStore.selectAllFiles(resources);
                    }
                  }}
                  startContent={
                    <Icon
                      icon={
                        selectedItems.size === resources.length
                          ? "material-symbols:deselect"
                          : "material-symbols:select-all"
                      }
                      className="w-5 h-5"
                    />
                  }
                >
                  {selectedItems.size === resources.length ? t('deselect-all') : t('select-all')}
                </Button>
              </motion.div>

              {selectedItems.size > 0 && resourceStore.currentFolder && resourceStore.currentFolder !== 'Root' && (
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                >
                  <Button
                    variant="light"
                    onPress={handleMoveSelectedToParent}
                    startContent={<Icon icon="material-symbols:drive-file-move-outline" className="w-5 h-5" />}
                  >
                    {t('move-to-parent')}
                  </Button>
                </motion.div>
              )}
            </div>
          </div>

          <LoadingAndEmpty
            isLoading={resourceStore.blinko.resourceList.isLoading}
            isEmpty={!resources.length}
            emptyMessage={t('no-resources-found')}
          />
          <PhotoProvider>
            {resources.length > 0 && view === 'gallery' && (
              <ResourceGallery
                resources={resources}
                selectedIds={selectedItems}
                onSelect={resourceStore.toggleSelect}
                onFolderClick={(folder) => resourceStore.navigateToFolder(folder, navigate)}
              />
            )}
            {resources.length > 0 && view === 'list' && (
              <Droppable droppableId="resources">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="my-2 bg-card rounded-[16px] [box-shadow:var(--heroui-box-shadow-small)] overflow-hidden divide-y divide-border/70"
                  >
                    {resources.map((item, index) => (
                      <MemoizedResourceItem
                        key={item.isFolder ? `folder-${item.folderName}` : `file-${item.id}`}
                        item={item}
                        index={index}
                        isSelected={selectedItems.has(item.id!)}
                        onSelect={resourceStore.toggleSelect}
                        onFolderClick={(folder) => resourceStore.navigateToFolder(folder, navigate)}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}

          </PhotoProvider>

        </ScrollArea>
      </DragDropContext>
      <ResourceMultiSelectPop />
    </>
  );
});

export default Page;