import { ErrorText } from '@/components/error-text'
import { Button } from '@/components/ui/button'

type RetryableErrorProps = {
  error: Error | null
  onRetry: () => void
}

/**
 * What a read that failed looks like wherever one is shown in place: the
 * reason, and the one thing the user can do about it, so the retry's wording
 * and position are one decision rather than one per list.
 *
 * Only reads use it. A write that fails is a toast, because what the user was
 * looking at is still on screen and unchanged.
 */
const RetryableError = ({ error, onRetry }: RetryableErrorProps) => (
  <div className="flex flex-col items-start gap-3">
    <ErrorText error={error} />
    <Button variant="outline" onClick={onRetry}>
      Try again
    </Button>
  </div>
)

export { RetryableError }
