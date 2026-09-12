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
 */
const DeleteIconButton = ({
  label,
  onClick,
  className,
}: DeleteIconButtonProps) => (
  <Button
    variant="ghost"
    size="icon-sm"
    className={cn('text-muted-foreground hover:text-destructive', className)}
    onClick={onClick}
  >
    <Trash2 />
    <span className="sr-only">{label}</span>
  </Button>
)

export { DeleteIconButton }
