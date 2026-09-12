import { useParams } from '@tanstack/react-router'

import { PageHeading } from '@/components/page-heading'

// Placeholder: the stats strip, the paginated grid, search and the annotation
// sheet land here next. The route exists now so the list's cards have
// somewhere to go.
const CollectionDetail = () => {
  const { collectionId } = useParams({
    from: '/_authed/collections/$collectionId',
  })

  return (
    <div className="flex flex-col gap-2">
      <PageHeading>Collection</PageHeading>
      <p className="text-sm text-muted-foreground">{collectionId}</p>
    </div>
  )
}

export { CollectionDetail }
