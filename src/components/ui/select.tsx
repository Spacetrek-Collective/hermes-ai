import * as React from 'react'
import { Select } from '@base-ui-components/react/select'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

function SelectRoot(props: React.ComponentProps<typeof Select.Root>) {
  return <Select.Root {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Select.Trigger>) {
  return (
    <Select.Trigger
      className={cn(
        'flex h-7 items-center gap-1 rounded-md px-2 text-sm',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <Select.Icon render={<ChevronsUpDown className="size-3 opacity-50" />} />
    </Select.Trigger>
  )
}

function SelectValue(props: React.ComponentProps<typeof Select.Value>) {
  return <Select.Value {...props} />
}

function SelectPositioner(props: React.ComponentProps<typeof Select.Positioner>) {
  return (
    <Select.Portal>
      <Select.Positioner sideOffset={4} {...props} />
    </Select.Portal>
  )
}

function SelectPopup({
  className,
  ...props
}: React.ComponentProps<typeof Select.Popup>) {
  return (
    <Select.Popup
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border',
        'bg-popover text-popover-foreground shadow-md',
        'data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95',
        'data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95',
        className,
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Select.Item>) {
  return (
    <Select.Item
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 px-3 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <Select.ItemIndicator>
          <Check className="size-3.5" />
        </Select.ItemIndicator>
      </span>
      <span className="pl-5">
        <Select.ItemText>{children}</Select.ItemText>
      </span>
    </Select.Item>
  )
}

export {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPositioner,
  SelectPopup,
  SelectItem,
}
