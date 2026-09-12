// What a failed request looks like wherever one is shown in place: the API's
// own message, announced. Every form and every list renders its failure
// through this, so the role cannot be left off one of them.
const ErrorText = ({ error }: { error: Error | null }) =>
  error ? (
    <p role="alert" className="text-sm text-destructive">
      {error.message}
    </p>
  ) : null

export { ErrorText }
