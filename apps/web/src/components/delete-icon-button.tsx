import { cn } from 'cn'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type DeleteIconButtonProps = {
  /** Names the target, since the button itself is an icon: "Delete Rainy
   * Sunday", "Remove Solaris from this collection". */
  label: string
  onClick: () => void
  /** Where it sits on the card it belongs to. */
  className?: string
}

/**
 * The app's one destructive affordance, on the collection card and the movie
 * card. Shared so the icon, the size, the hover colour and the screen-reader
 * label that names what would be destroyed are one decision.
 *
 * It stays out of sight until its card is hovered: a trash icon burned into
 * every tile competes for attention on a screen whose job is to be browsed.
 * Hover cannot be the only way to reach it, so it also appears on keyboard
 * focus and is always there where there is no hover at all. Both are conditions
 * on the button rather than rules each card has to remember; the card supplies
 * the `group` it watches.
 */
const DeleteIconButton = ({
  label,
  onClick,
  className,
}: DeleteIconButtonProps) => (
  <Button
    variant="ghost"
    size="icon-sm"
    className={cn(
      'text-muted-foreground transition-opacity hover:text-destructive',
      'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
      '[@media(hover:none)]:opacity-100',
      className,
    )}
    onClick={onClick}
  >
    <Trash2 />
    <span className="sr-only">{label}</span>
  </Button>
)

export { DeleteIconButton }
