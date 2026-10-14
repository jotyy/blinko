import { Icon } from '@/components/Common/Iconify/icons';
import { Button, DropdownTrigger, DropdownItem, DropdownMenu, Dropdown, Tooltip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { observer } from "mobx-react-lite";

type IProps = {
  leftContent?: any
  rightContent?: any
  type?: 'row' | 'col'
  hidden?: boolean
  className?: string
}


export const Item = observer(({ leftContent, rightContent, type = 'row', hidden = false, className }: IProps) => {
  if (hidden) return null
  // Rows of a grouped settings card: regular-weight labels, a hairline between rows.
  if (type == 'col') {
    return <div className={`settings-row flex flex-col py-3 ${className ?? ''}`}>
      <div className="text-[14px] font-medium text-foreground">{leftContent}</div>
      <div className="mt-2 w-full">{rightContent}</div>
    </div>
  } else {
    return <div className={`settings-row flex flex-row items-center gap-4 min-h-[48px] py-2.5 ${className ?? ''}`}>
      {!!leftContent && <div className={rightContent ? "text-[14px] font-medium text-foreground min-w-0" : 'w-full'}>{leftContent}</div>}
      {!!rightContent && <div className="ml-auto shrink-0">{rightContent}</div>}
    </div>
  }
})


export const ItemWithTooltip = observer(({ content, toolTipContent }: { content: any, toolTipContent: any }) => {
  return  <Tooltip content={<div className="max-w-[300px] flex flex-col gap-2 p-2">
      {toolTipContent}
    </div>}>
      <div className="flex items-center gap-2">
        {content}
        <Icon icon="reicon:info-circle" width="15" height="15" className="text-desc" />
      </div>
    </Tooltip>
})


interface SelectDropdownProps {
  value?: string
  placeholder?: string
  icon?: string
  options: Array<{
    key: string
    label: string
  }>
  onChange: (value: string) => void | Promise<void>
}
export const SelectDropdown = ({
  value,
  placeholder,
  icon,
  options,
  onChange
}: SelectDropdownProps) => {
  const { t } = useTranslation()
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant='flat'
          startContent={icon && <Icon icon={icon} width="20" height="20" />}
        >
          {t(value as string) || placeholder}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Selection"
        onAction={async (key) => {
          await onChange(key.toString())
        }}
        selectedKeys={[value || '']}
      >
        {options.map(option => (
          <DropdownItem key={option.key}>{option.label}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}