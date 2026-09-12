import { X } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { normaliseTags, TAGS_MAX } from '@/lib/annotation'

type TagInputProps = {
  /** The field's id, so the caller's own visible label names it. */
  id: string
  tags: string[]
  onChange: (tags: string[]) => void
}

/**
 * The user's own vocabulary, as chips over a text field. Enter or a comma
 * commits what is typed, Backspace on an empty field takes the last chip back,
 * and blanks and duplicates are dropped without a word.
 *
 * The same normalisation the API applies (`lib/annotation`), so what the editor
 * shows after a save is what was stored.
 */
const TagInput = ({ id, tags, onChange }: TagInputProps) => {
  const [draft, setDraft] = useState('')
  const full = tags.length >= TAGS_MAX

  const commit = () => {
    setDraft('')
    const next = normaliseTags([...tags, draft])
    // A blank or a repeat leaves the list as it was, so nothing is marked
    // unsaved.
    if (next.length !== tags.length) onChange(next)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter inside a dialog would otherwise submit.
      event.preventDefault()
      commit()
      return
    }

    if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="pr-1">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() =>
                    onChange(tags.filter((other) => other !== tag))
                  }
                  className="cursor-pointer rounded-full p-0.5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <Input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        // A tag typed but not committed is saved rather than lost: the Save
        // button takes the focus out of the field on its way to being clicked.
        onBlur={commit}
        disabled={full}
        placeholder={full ? undefined : 'add a tag…'}
        className="h-9"
      />

      {full ? (
        <p className="text-xs text-muted-foreground">
          That is the {TAGS_MAX}-tag limit. Remove one to add another.
        </p>
      ) : null}
    </div>
  )
}

export { TagInput }
