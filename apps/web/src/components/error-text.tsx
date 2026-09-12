import { errorMessage } from '@/lib/error-message'

// What a failed request looks like wherever one is shown in place. Every form
// and list renders its failure through this, so the role cannot be left off.
// `message` is for a form that knows the reason without asking the server.
const ErrorText = ({
  error,
  message,
}: {
  error?: Error | null
  message?: string
}) => {
  const text = message ?? (error ? errorMessage(error) : null)

  return text ? (
    <p role="alert" className="text-sm text-destructive">
      {text}
    </p>
  ) : null
}

export { ErrorText }
