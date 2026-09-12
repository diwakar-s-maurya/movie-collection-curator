import { errorMessage } from '@/lib/error-message'

// What a failed request looks like wherever one is shown in place. Every form
// and list renders its failure through this, so the role cannot be left off.
const ErrorText = ({ error }: { error: Error | null }) =>
  error ? (
    <p role="alert" className="text-sm text-destructive">
      {errorMessage(error)}
    </p>
  ) : null

export { ErrorText }
