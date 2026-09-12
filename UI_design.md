# UI design

How the app looks and behaves, at the level of screens and interactions. This is the fourth file in the set and the only one that argues about the user:

- **What, and in what order** — [PLAN.md](PLAN.md).
- **How it is wired** — [IMPLEMENTATION.md](IMPLEMENTATION.md): routes, queries, cache policy, component inventory. Where that file names a component, this one says what it should feel like to use.
- **Why the engineering decisions went the way they did** — [README.md](README.md).

Nothing here overrides a decision in those. Where a rule below implies work that is not in the build order, it is listed at the bottom as not built.

## 1. What the app is, in one line

A workbench for one collection at a time. The list view exists to get you into a collection; everything interesting — stats, films, search, annotation — happens on one screen without leaving it.

That sentence settles most of the layout questions. Search is a panel over the detail view rather than its own route, because searching is something you do *to* the open collection. The annotation editor is a dialog over it rather than a page, because a film opening to the middle of the screen is the gesture everyone already knows from the services these collections are made of. The only full navigation in the app is list → collection → back.

## 2. Principles

1. **The collection's numbers are the headline.** Derived stats are the point of the exercise and the reason to open a collection, so they sit above the films, not in a sidebar or behind a tab.
2. **Frequent actions cost one click; typed actions get a panel.** Rating is inline on the card. Notes and tags open the annotation dialog.
3. **Never lose the user's place.** Paging keeps the previous page on screen, adding a film keeps the search panel open, saving an annotation keeps the dialog open on the grid's page.
4. **Every state says what to do next.** Empty, error and not-found are instructions with a control attached, not apologies.
5. **Writes look instant.** A star fills on click and the strip's average follows a moment later; nothing blocks on a round trip that can be optimistic.
6. **Destructive actions name what they destroy.** Remove and delete both confirm, and the confirm copy contains the collection or film name.
7. **One palette, one density, no settings.** A submission-sized app earns nothing from a theme toggle or a grid/list switch; both are choices the user has to make before they can start.

## 3. Shell and visual language

```
+--------------------------------------------------------------+
| (C) Collections                         alice   [ Sign out ]  |  sticky, h-14, blurred
+--------------------------------------------------------------+
|                                                              |
|   <main>  max-w-5xl, px-4 / sm:px-6, py-8, flex-col gap-6     |
|                                                              |
+--------------------------------------------------------------+
```

- **Frame.** One centred column, `max-w-5xl`. Two column widths in the app: this one for signed-in views, `max-w-sm` (`CenteredPanel`) for sign-in and not-found, which are a heading, a line of text and one control.
- **Header.** Sticky, translucent, on every signed-in view. The wordmark is the link back to the list — that is the "way back" the spec asks for, and it is in the same place on every screen. It carries the current user's name because the app claims to support several and the name is the only evidence of which one you are.
- **Type.** Geist Variable throughout. Three sizes carry the whole app: `text-2xl/3xl` page heading, `text-base` body, `text-sm` for everything secondary. Secondary text is `text-muted-foreground`, never a lighter weight — colour separates hierarchy, weight is reserved for the one thing on a surface that matters most.
- **Colour.** shadcn's neutral tokens, light only. Colour is used for exactly three things: destructive red on delete and remove affordances, filled amber stars, and the focus ring. Genre chips are muted; the user's own tags get the higher-contrast chip style, so TMDB's labels and the user's vocabulary never read as the same kind of thing.
- **Density.** Cards are `rounded-xl` with generous padding and `gap-4` between them. A collection of 24 films should look browsable, not like a spreadsheet.
- **Separators.** Facts on one line join with ` · ` (`24 films · 41h 20m · 3.8 avg`). One idiom for "a row of small facts", used on collection cards and in the stats strip, so the eye learns it once.

## 4. Screens

### 4.1 Sign in

```
                  Sign in
                  No password. Pick any name.
                  Use a second browser to try another user.

                  Name
                  [ alice                    ]
                  [        Continue          ]
```

Autofocused field, submit on Enter, button reads "Signing in…" while pending. The hint line is doing real work: it pre-empts "where do I register" and tells a reviewer how to see multi-user scoping in thirty seconds. An unknown name creates the user; the UI does not distinguish sign-in from sign-up, because the model does not.

### 4.2 Collections

The create affordance has two presentations, and which one is right depends on whether the account has anything in it.

**An empty account.** There is no list to protect, so the page is the invitation. One field, focused, Enter creates:

```
Collections

+--------------------------------------------------------------+
|  Nothing here yet. Name your first collection.               |
|                                                              |
|  [ Sunday night noir                       ]     [ Create ]  |
|  + Add a description                                         |
|                                                              |
|  Or start from:  [ Rainy Sunday ]  [ Films I should have      |
|                                      seen by now ]           |
+--------------------------------------------------------------+
```

**An account with collections.** The form folds into a button in the heading row; the list is all that is left:

```
Collections                                  [ + New collection ]

+- Rainy Sunday ---------------------[del]-+  +- Films I ---[del]-+
| Slow films for grey afternoons           |  |                   |
| 12 films · 21h 4m · 3.8 avg (9 rated)    |  | 0 films           |
+------------------------------------------+  +-------------------+

                  < Previous    Page 1 of 3    Next >
```

Pressing it opens a composer **in the grid's first slot** — the place the new card is about to appear — rather than a banner above the grid or a modal over it:

```
Collections                                  [ + New collection ]

+- new ------------------------------------+  +- Rainy Sunday ---+
| [ Name                                 ] |  | Slow films…      |
| + Add a description                      |  | 12 films · 21h 4m|
|                     [ Cancel ] [ Create ]|  +------------------+
+------------------------------------------+
```

Why this shape:

- **The form is only open when it is the obvious next thing.** On an empty account it is the entry point to the whole app, so it is already open and is itself the empty state — one surface, rather than an empty-state paragraph pointing at a form directly above it. Once collections exist, the list is what the user came for, and a permanently open form is a fixed block of chrome above it, every visit, for an action taken far less often than browsing.
- **The composer is card-shaped and sits where the card will land.** It is the same width, height and radius as a collection card, so filling it in and pressing Create reads as the form *becoming* the thing it made. A banner above the grid or a modal both break that: the user fills in a box in one place and the result appears somewhere else.
- **One field commits.** Name plus Enter is the whole interaction. The description is optional, is the kind of thing people write later rather than at the moment of naming, and a second visible field doubles the apparent cost of the first action — so it is behind "+ Add a description", one click for the people who want it.
- **Starter names cure the blank page.** Naming is the one genuinely hard part of creating a collection, and a blank field with a blinking cursor is where a new user stalls. Two example chips prefill the field rather than creating anything, so the user still names their collection — they just do not start from nothing. They appear only on the empty account, where the stall actually happens.
- **No modal anywhere in this flow.** A modal interrupts; this is the view's own primary action, and the list is useful context while naming the next one ("do I already have something like this?").

The mechanics that make it feel right:

- Opening focuses the name field. Enter submits, Esc cancels, Cancel cancels; either way focus returns to the "New collection" button, which is a disclosure (`aria-expanded`, `aria-controls`) rather than a button that fires an action.
- **On success the composer becomes the card**: it collapses, the new card takes that slot, and focus moves onto its link — which rings the card, so the highlight and the focus are the same thing rather than two mechanisms, and it clears as soon as the user moves on. They end up standing on what they just made, one Enter from opening it. No toast; the card arriving is the confirmation, and a toast for a result already on screen is noise.
- **Creating from page 2 navigates to page 1 first.** Newest lands at the top of the first page; without this the write succeeds and nothing visibly happens, which reads as a bug.
- A rejected create keeps the composer open with the fields as typed and the reason under them. Nothing the user wrote is ever thrown away by a failure.
- **Neither affordance renders while the list is loading.** Which one is right depends on the answer, and a form that flashes into a button is worse than a beat of skeletons. If the list fails to load, the button shows — creating still works, and a first collection is a reasonable thing to attempt when the list is what broke.
- **Cards are the whole hit target.** The title is the link, stretched over the card with an `::after` overlay, so there is one link in the accessibility tree and the entire card is clickable. The delete button sits above that overlay and is the only competing target — and it is not even visible until the card is hovered, so at rest there is nothing on the card but the collection.
- **The numbers come free.** `collections.list` returns the grouped summary, so a card costs no request of its own. Breakdowns — genres, tags, year span — are deliberately absent here: a chip list per card is noise, and each breakdown is another scan.
- **An empty collection shows "0 films" and nothing else.** Not "0h 0m · 0.0 avg", which read as facts about films that do not exist.
- **Delete confirms by name**, and deleting the last card on a page steps back a page rather than stranding the user on a page that no longer exists.

### 4.3 Collection detail — the workbench

```
Rainy Sunday                                     [ Add films ]
Slow films for grey afternoons

+- stats strip ------------------------------------------------+
| Films      Runtime      Average rating      Years             |
| 24         41h 20m      ****o 3.8           1972 – 2019       |
|                         12 of 24 rated                        |
| ------------------------------------------------------------- |
| Genres                          Your tags                     |
| (Drama 9)(Thriller 5)(Comedy 3) (rewatch 7)(sunday 4)(noir 3) |
+--------------------------------------------------------------+

+--------+ +--------+ +--------+ +--------+
| poster | | poster | | poster | | poster |
|        | |        | |        | |        |
+--------+ +--------+ +--------+ +--------+
| Solaris| | ...    | | ...    | | ...    |
| 1972   | |        | |        | |        |
| ****o  | |        | |        | |        |
| #rewatch| |       | |        | |        |
+--------+ +--------+ +--------+ +--------+

                  < Previous    Page 1 of 2    Next >
```

**Stats strip.** A row of labelled figures, then the two breakdowns under a rule. The figures come first and in the order each answers a question actually being asked: how many and how long (can I fit this in tonight), how it is rated, when the films are from. **Every figure carries its label** — a bare "1972" is a puzzle, "Years 1972" is a fact — and the average carries "12 of 24 rated" under it, because an average without its denominator is not a fact yet.

Both breakdowns are chips with the count in them, ordered by count, in two columns: TMDB's genres in the muted outline style, the user's tags in the filled one, the same two styles the annotation dialog tells them apart with. Chips rather than a bar list or a pie: a bar spends a full row on each of five small integers and makes the panel mostly grey rules, and at five categories the order plus the printed count answers "what is this collection mostly about" without the arithmetic a bar was saving. What that gives up is proportion at a glance — 9 against 5 is read, not seen — which is the right thing to give up at this size.

A figure with nothing to say is left out rather than printed as a zero: "0h 0m" and "0.0 avg" read as facts about films that are not there. The breakdowns are hidden entirely rather than rendered as empty containers.

**An empty collection has no strip at all.** Not even the "Films 0" tile: a panel the width of the page carrying a single zero takes the room and the attention that belong to the one instruction on that screen — "Nothing here yet. Add films." The strip appears with the first film, which is also the first moment it has anything to describe.

**Movie card.** The poster is the identity; the title is text under it, never burned into the image, and a missing poster gets a titled placeholder tile rather than a broken image. The card carries poster, title, year, a clickable star row, the user's tags and a remove button. No genres: with rating and tags the card gets noisy, and inside a collection the user's own vocabulary matters more than TMDB's.

**Star rating.** Five stars, click to set, click the current rating again to clear (the control's title says so), left and right arrows when focused. Writes immediately and optimistically — the star fills on click, the strip's average follows when `collections.get` comes back. Rating is the highest-frequency action in the app and it costs one click from the grid.

**Remove.** Icon button on the card, revealed on hover, confirms by film title. Removing a film is cheap to redo and expensive to do by accident, which is the case a one-line confirm is for.

**Destructive controls appear on hover**, on both cards, through the one shared button. A wall of posters is the thing worth looking at, and a trash icon burned into every tile is a row of small distractions on a screen whose whole job is browsing. Hover is never the only way in: the button appears when it takes keyboard focus, so Tab still reaches it, and on a device with no hover it is simply always there — "reveal on hover" on a phone means "unreachable". Both escapes live on the button, not in the two cards.

**Paging.** 24 per page, page number in the URL, previous page held on screen while the next loads, so the grid never collapses to zero height mid-click.

### 4.4 Search — a dialog over the detail view

```
+- Add films to Rainy Sunday ---------------------------- X -+
| [ search: solaris                                        ] |
|                                                            |
| [==] Solaris · 1972                            [ Add ]     |
| [==] A psychologist is sent to a space station…            |
|                                                            |
| [==] Solaris · 2002                            + Added     |
| [==] A widowed psychologist is sent to…                    |
+------------------------------------------------------------+
```

- **It does not navigate.** The collection stays behind the overlay, and its name is in the dialog title, so there is never a doubt about where a film is going.
- **It stays open after an add.** Adding is a row-level state change — the button becomes "Added" — so five films can be added from one search without reopening anything. The grid behind refreshes on close.
- **Results already in the collection say "Added" from the first render.** The API sets `inCollection` per result for the open collection; the client cannot work this out on its own, because the grid only holds one page of ids.
- **Typing is debounced 300ms**, minimum two characters, and the debounced term is the cache key — so backspacing to a term already searched is instant and free.
- **States inside the dialog:** under two characters, a hint line; searching, three skeleton rows in the result shape; no matches, "No films match *solaris*." with the term echoed; TMDB unreachable, the error and a "Try again" button, since this is the one failure the user can usefully retry.
- Esc closes, focus returns to the "Add films" button, focus is trapped while open.

### 4.5 Annotation dialog

```
+- Solaris --------------------------------------- X -+
| [======]  1972 · 167m · 8.0 TMDB                     |
| [poster]  Drama   Sci-Fi   Mystery                   |
| [======]  A psychologist is sent to a space station… |
| ---------------------------------------------------- |
| Your rating  ****o                                   |
|                                                      |
| Note                                                 |
| [                                                  ] |
| [                                                  ] |
|                                          0 / 2000    |
| Tags                                                 |
| [ #rewatch x ] [ #noir x ]                           |
| [ add a tag…                                       ] |
| ---------------------------------------------------- |
|                                           [ Save ]   |
+------------------------------------------------------+
```

- **A dialog, centred, wider than the search panel.** This is the shape a film opens in on every service these collections are made of — Netflix expands a card into a preview modal over a dimmed grid, and Prime Video opens a detail view — so it is the gesture people arrive already knowing. It is wide enough to put the poster beside the writing, which a side panel is not, and the two overlays in the app are told apart by their proportions: search is a tall narrow list, this is a wide two-column card.
- **It is also the only place the full TMDB facts appear** — runtime, every genre, the vote average and the overview — which is the second reason to open it, and why the facts get the top half rather than a line of small print.
- **What the dialog gives up** against a side panel: the grid behind it is dimmed rather than readable, so "how does this note sit beside the other four films" costs a close. That is the trade accepted for the familiar gesture and the room; the stats strip, which is the collection-level context, is one Esc away and does not scroll.
- **Rating appears here too**, the same control as the card, through the same mutation. Duplicating it is deliberate: someone who opened the dialog to write a note should not have to close it to rate.
- **Remove lives here as well**, in the footer's far corner from Save and in the destructive colour. This is the film's own screen, so it is where deciding the film does not belong is made; the card's icon button is the same action for someone who never opens the dialog, and both raise the same confirm. The word is just "Remove" — the dialog is titled with the film and only one collection is open, so the rest of the sentence is already on screen. Removing closes the dialog, because a panel about a film that is no longer in the collection has nothing left to say.
- **Note and tags save together** on one button, because they are one row and one write. The dialog does not autosave: a note is a draft until the user says otherwise, and an autosaving textarea on a debounce writes a lot of half-sentences.
- **Tags are chips with a text input.** Enter or comma commits a tag, Backspace on an empty input removes the last one, duplicates and blanks are dropped silently — the same normalisation the API applies, so the optimistic copy matches what was stored. Twenty tags maximum, at which point the input is disabled with a line saying why.
- Close on Esc or the X; closing with an unsaved edit confirms first, since a typed note is the most expensive thing in the app to lose. The confirm is a second, smaller dialog over this one, which reads as what it is: a question about the panel underneath, not a replacement for it.

### 4.6 Not found

One `CenteredPanel` for both unknown routes and a collection that no longer exists — "This collection isn't here." plus a link back to the list. A collection can be deleted on another device or arrive from a stale link; that is a normal outcome and gets a normal screen, not an error boundary.

## 5. The three flows, and what they cost

| Flow | Steps |
|---|---|
| Sign in and create the first collection | name → Enter → name → Enter (4 keystrokes-plus-typing, no mouse) |
| Create another collection | New collection → name → Enter (3) |
| Add three films to the open collection | Add films → type → Add ×3 → Esc (6) |
| Rate a film | one click, from the grid |
| Write a note and two tags | click card → type → tag, tag → Save (5) |
| Remove a film | remove icon → confirm (2) |

No flow is more than two screens deep, and only one of them — opening a collection — is a navigation.

## 6. State rules

Every surface that fetches has four states, and each is specified rather than inherited:

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Collections list | 4 card skeletons, no create affordance yet | the open composer: "Nothing here yet. Name your first collection." | message + "Try again", create button still shown |
| Stats strip | one strip-shaped skeleton | not rendered at all | message inline, grid still renders |
| Movie grid | 8 poster-shaped skeletons | "Nothing here yet." + "Add films" | message + "Try again" |
| Search results | 3 row skeletons | "No films match *term*." | message + "Try again" |

The rules behind the table:

- **Skeletons take the shape of what is coming**, so the page does not reflow when it arrives. No spinners anywhere: a spinner says "something is happening", a skeleton says "this is what is about to be here".
- **Paging never empties a list.** `keepPreviousData` on both paginated queries; the control reads the page from the router, not from the response, so it never disagrees with the URL mid-fetch.
- **Read errors are inline with a retry. Write errors are toasts**, because the thing the user was looking at is still on screen and unchanged — and a confirm dialog stays open on failure, so the row's state and the dialog's state do not contradict each other.
- **Optimistic writes roll back visibly.** A failed rating returns the star to where it was and raises a toast; silently reverting a value the user set is worse than the error.
- **Nothing refetches the grid for a one-field change.** The annotation patch updates every cached page of that collection and invalidates only the stats.

## 7. Keyboard and accessibility

- Focus ring on every interactive element (`ring-3 ring-ring/50`), including the card's stretched link — the ring follows the card outline, not the title text.
- Every dialog traps focus, closes on Esc, and returns focus to whatever opened it — including the confirm that opens over the annotation dialog, which returns focus to the note.
- A control revealed on hover is still reachable without one: the delete button becomes visible when it takes keyboard focus, and is permanently visible under `(hover: none)`.
- Every icon-only button carries an `sr-only` label naming its target ("Delete Rainy Sunday", "Remove Solaris from this collection"), so a screen reader never hears a bare "button".
- The star rating is a radio group: arrows move, Enter or Space sets, and the accessible name is "Rate Solaris 4 of 5".
- Posters take the film title as alt text; placeholder tiles are decorative and take `alt=""`.
- Toasts are polite live regions, bottom-centre, and never the only report of a failure that also has an inline home.
- Colour is never the only signal: "Added" carries a check, destructive controls carry a trash icon, filled stars differ in fill as well as hue.

## 8. Responsive

One breakpoint decision per surface, all at Tailwind's `sm` and `lg`:

- Collections list: one column, two at `sm`.
- Movie grid: two columns at 320px, three at `sm`, four at `lg`. Posters stay 2:3 at every width and the card never becomes a row, because the poster is how a film is recognised.
- Stats strip: figures are two per row below `sm` and four above it; the breakdowns stack into one column and their chips wrap.
- Annotation dialog: full-screen below `sm`, where the poster and the writing stack; 672px above it, wide enough to put them side by side.
- Search dialog: full-screen below `sm`. Search on a phone is a focused task, and a modal with a 40px margin wastes the screen the results need.
- The header never collapses into a menu — two items do not need one.

## 9. Copy

- Sentence case everywhere, including buttons. No title case, no exclamation marks.
- Buttons are verbs, with an object when the object is ambiguous: "Add films", not "Add"; "Create", not "Submit".
- Empty states are two sentences at most and end in the action, ideally beside the control that performs it.
- Errors say what happened, not what the layer was doing: "TMDB is not responding" beats "Request failed with status 502".
- Numbers are formatted for reading, not for storage: `41h 20m`, `3.8 avg · 12 of 24 rated`, `1972 – 2019` — a single year when the span collapses, hidden when nothing has a release date.

## 10. Deliberately not built

Each of these is a real improvement that lost to scope, and each is cheap to add later:

- **Rename a collection, or fix its description.** The sharpest gap in the app: a name is typed once, in a hurry, and can never be corrected — and because the description is write-once too, the composer's progressive disclosure is doing more work than it should. It wants a `collections.update` procedure and an edit affordance on the card; until it exists, the composer's copy must not imply the fields can be changed later.
- **Sort and filter the grid** (by rating, year, genre, tag). The first thing a collection of 200 films needs, and it is a parameter on `collectionMovies.list` plus a control row above the grid. The stats strip would keep describing the whole collection, not the filtered view.
- **Dark mode.** The tokens are already in `index.css`; what is missing is a toggle, persistence, and a pass over the two places colour is hand-picked.
- **Undo instead of confirm.** A toast with "Undo" is a better interaction than a confirm dialog for remove, and needs a soft delete or a client-side replay to be honest about it.
- **Infinite scroll.** Explicitly not wanted: a numbered page is linkable, refresh-safe, and tells you how much is left.
- **Drag to reorder, multi-select, bulk add.** All want a selection model the app does not have.
- **Keyboard shortcuts** (`/` to search, `j`/`k` through the grid). Good for a power user, premature for a five-screen app.
