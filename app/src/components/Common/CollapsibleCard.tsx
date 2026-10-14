import { Card } from "@heroui/react";
import { Icon } from '@/components/Common/Iconify/icons';
import { motion, AnimatePresence } from "motion/react";
import { useState, ReactNode, useEffect } from "react";

interface CollapsibleCardProps {
  icon: string;
  title: string | ReactNode;
  children: ReactNode;
  className?: string;
  defaultCollapsed?: boolean;
}

export const CollapsibleCard = ({
  icon,
  title,
  children,
  className = "",
  defaultCollapsed = false
}: CollapsibleCardProps) => {
  const storageKey = `blinko-card-collapsed-${typeof title === 'string' ? title : ''}`;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : false;
  });

  const handleCollapse = (value: boolean) => {
    setIsCollapsed(value);
    localStorage.setItem(storageKey, JSON.stringify(value));
  };

  return (
    <Card shadow="none" radius="none" className={`settings-card flex flex-col px-4 pt-3 pb-3 bg-card rounded-[16px] [box-shadow:var(--heroui-box-shadow-small)] relative ${className}`}>
      <div className="flex items-center justify-between min-h-[36px]">
        <div className="flex items-center gap-2 text-foreground">
          <Icon icon={icon} width="17" height="17" className="text-desc" />
          <div className="text-[15px] font-semibold tracking-[-0.01em]">{title}</div>
        </div>
        <button
          type="button"
          aria-expanded={!isCollapsed}
          onClick={() => handleCollapse(!isCollapsed)}
          className="grid place-items-center size-[28px] rounded-full text-desc hover:text-foreground hover:bg-hover transition-colors duration-150"
        >
          <Icon
            icon="reicon:chevron-down"
            width="16"
            height="16"
            className={`transition-transform duration-150 motion-reduce:transition-none ${isCollapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1]
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="settings-card-body mt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}; 