import { Plus } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react'

import { ErrorText } from '@/components/error-text'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * `first` is the empty account's whole page: a prompt, names to start from, and
 * no way out of the only thing there is to do. `composer` sits in the grid slot
 * the new card is about to take, and can be called off — the one difference the
 * type has to carry.
 */
type Presentation =
  | { variant: 'first'; onCancel?: undefined }
  | { variant: 'composer'; onCancel: () => void }

type CreateCollectionFormProps = Presentation & {
  /** The mutation's own `mutate`, per-call callback and all, so the form can
   * clear itself on success without the route holding its fields. */
  onCreate: (
    input: { name: string; description: string | null },
    options: { onSuccess: () => void },
  ) => void
  pending: boolean
  error: Error | null
  /** The names the user already has, to catch a clash before the round trip.
   * Only the loaded page of them: the API is what enforces the rule. */
  takenNames: string[]
}

// The API's schema is what enforces these; they only stop the browser sending
// a request already known to fail.
const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500

// Naming is where people stall. These fill the field rather than creating
// anything, so the collection is still the user's own.
const STARTER_NAMES = ['Rainy Sunday', 'Films I should have seen by now']

/**
 * Never a dialog: creating is this view's primary action, and the list is
 * useful context while naming the next one. The name is the only field on show
 * — a second one doubles the apparent cost of a new user's first action.
 */
const CreateCollectionForm = ({
  variant,
  onCreate,
  pending,
  error,
  onCancel,
  takenNames,
}: CreateCollectionFormProps) => {
  const [name, setName] = useState('')
  // `null` is "not writing one", which is also what the API stores for a
  // description left out, so the disclosure needs no flag of its own.
  const [description, setDescription] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const trimmed = name.trim()
  // Matched the way the column compares it, and the name that is already taken
  // rather than a boolean: showing the user their own spelling of it is what
  // tells them which collection they are about to duplicate.
  const clash = takenNames.find(
    (taken) => taken.toLowerCase() === trimmed.toLowerCase(),
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    onCreate(
      { name: trimmed, description: description?.trim() || null },
      // On success only: a rejected write leaves what the user typed in place,
      // with the reason under it.
      {
        onSuccess: () => {
          setName('')
          setDescription(null)
        },
      },
    )
  }

  return (
    <Card
      // Esc leaves the composer, as it leaves every dialog in the app.
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Escape') onCancel?.()
      }}
    >
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {variant === 'first' ? (
            <p className="font-medium">
              Nothing here yet. Name your first collection.
            </p>
          ) : null}

          {/* The prompt above, or the button this came from, is the visible
              label; the field still needs its own for a screen reader. */}
          <Label htmlFor="collection-name" className="sr-only">
            Collection name
          </Label>
          <Input
            id="collection-name"
            ref={nameRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sunday night noir"
            autoFocus
            maxLength={NAME_MAX_LENGTH}
            aria-invalid={clash !== undefined}
          />

          {description === null ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2.5 self-start text-muted-foreground"
              onClick={() => setDescription('')}
            >
              <Plus />
              Add a description
            </Button>
          ) : (
            <Textarea
              aria-label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this list for?"
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={2}
              autoFocus
            />
          )}

          {variant === 'first' ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Or start from:
              {STARTER_NAMES.map((starter) => (
                <Button
                  key={starter}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setName(starter)
                    nameRef.current?.focus()
                  }}
                >
                  {starter}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={!trimmed || pending || !!clash}>
              {pending ? 'Creating…' : 'Create'}
            </Button>
          </div>

          {/* The clash replaces the last request's failure rather than
              stacking under it: it is the reason the button is disabled now. */}
          {clash ? (
            <ErrorText
              message={`You already have a collection called “${clash}”.`}
            />
          ) : (
            <ErrorText error={error} />
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export { CreateCollectionForm }
