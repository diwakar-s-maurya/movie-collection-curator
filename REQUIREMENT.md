This is a full stack exercise. All three layers are required: a backend API, a real data store, and a frontend. There's no opting out of a layer you're less comfortable with. If one of them is weaker than the others, that's fine, but we need to see you make choices at every level of the stack.

Time: take as much time as you want. We don't expect you to spend more than about four hours, and we won't reward volume. A smaller, deliberate submission beats a sprawling one every time. What we do expect is that you can tell us what you'd do with more time. Stopping somewhere on purpose and explaining the rest is a perfectly good submission.

Commit as you go. Real commits with real messages. Your history is part of what we read.

There's a follow-up conversation where we walk through your submission together and you explain the decisions you made, including the small ones. That conversation is important to us, so build something you'll want to talk about.

Don't bother with deployment. No Docker, no CI, no cloud setup. Running locally is fine. Infrastructure is a big part of the follow-up interview, but we'd rather you spend your time on the code and talk about deployment out loud.

# The scenario
Build a movie collection curator.

A user can create named collections ("Rainy Sunday", "Films I Should Have Seen By Now"), search a public movie database to add films to them, and annotate each film within a collection with their own notes, tags, and rating. Each collection surfaces some derived stats about what's in it. The external data source is TMDB https://developer.themoviedb.org/docs/getting-started. The API key is free and signup takes a few minutes.

# Deliverables
1. A library that wraps the parts of the TMDB API you need.
2. An API of your own, backed by a persistent data store.
3. A single-page app that consumes your API.
4. A readme covering the sections listed below.
Our stack is JavaScript/TypeScript with React, Node.js, GraphQL, PostgreSQL, and a lot of AWS. Use it if you're comfortable, or swap in whatever lets you do your best work. Just tell us why in the readme.

# Specs
# Library
- Given a search term, return matching movies.
- Given a movie ID, return that movie's details.
- Internal module inside your project. No need to package or publish it.
- Do not use an existing TMDB client library. Writing the wrapper is part of the exercise.
- Any HTTP or data-fetching library is fine.

Assume this library will grow to cover more of TMDB later.

# API and data store
- Create, list, and delete collections.
- Add a movie to a collection, and remove a movie from a collection.
- Attach user-owned annotations to a movie within a collection: a free-text note, zero or more tags, and a 1 to 5 rating. The same movie in two different collections can carry different annotations.
- Return a collection along with its movies and their annotations.
- Return derived stats for a collection. What's worth showing is your call: total runtime, genre breakdown, average rating, release-year span are all reasonable. Pick what you'd actually want and be ready to say why.
- Search must route through your API. The browser should never call TMDB
directly.
- Use a real persistent store, not an in-memory object or a JSON file. Anything durable is fine (Postgres, SQLite, Mongo, whatever you like). State should survive a server restart.
- Movie data lives in TMDB, not in your database. How much of it you copy locally, and when, is one of the more interesting decisions in this exercise. There's no right answer, but have a reason.
- Assume multiple users.

# App
- Create a collection, view a list of collections, open one.
- Search for movies and add results to the open collection.
- View and edit a movie's annotations inside a collection.
- Remove a movie from a collection.
- See a collection's derived stats.
- Navigate between views without a page refresh or the back button. The URL doesn't have to change.

Assume this app will grow to support more features.

# Required readme sections
Beyond the usual build and run instructions. Keep these brief. Bullets are fine, and short beats thorough. They exist to give our follow-up conversation somewhere to start, not to be graded as documents.

## 1. Decision log
Four to six real forks in the road. For each: the choice you faced, what you picked, and what you gave up.
We're looking for genuine decisions, not narration. "I used Postgres because it's reliable" isn't a decision log entry. "I store a local snapshot of TMDB movie fields rather than fetching live on every collection view, so my data goes stale and I have no invalidation story. I traded correctness for latency and request budget" is. Be ready to dig into these decisions as part of the discussion.

## 2. What you'd do with more time
Two things together:
- Places you knowingly did badly, or aren't happy with, and why you left them that way.
- Work you'd do next if this were real.
The first half is not a trick question and doesn't count against you. Every real codebase has weak spots. We want to know whether you can find them in your own.

## 3. What breaks first at 100x
Suppose this has fifty thousand users with large collections instead of one user with a few. What falls over first, and roughly what you'd do about it. A few bullets is plenty. This is a conversation starter, not a design document.

## 4. Notes
- Roughly how long you spent.
- What AI tools you used, if any, and how.
- Any requirement you found ambiguous, and how you chose to read it.

# How we'll review
We read the submission first, then talk it through with you. Some of what we'll be weighing:
- Judgment. The quality of your tradeoffs, and whether you can articulate them.
- Self-awareness. Do you know where your own weak spots are?
- Code quality. Is this coherent and consistent, like one person with a point of view built it?
- Completeness. Does it meet the spec?
- Maintainability. How expensive is the next feature?
- Usability. Is it intuitive to actually use?
One practical note about the follow-up: we'll ask you about specific lines. Not to catch you out, it's just the most reliable way to have a real conversation about a codebase. If something is in there that you'd change, or that you left in without much thought, saying so is a good answer. We're more interested in how you think about your code than in whether every line is defensible.

# Other notes
- Open-source utility libraries are fine.
- Keep the build and run process simple, ideally one or two commands.
- Unit tests aren't required. If you write them, write ones you'd actually trust.
- If a requirement seems ambiguous, it may be on purpose. State your reading and move on.
- Have fun with it. The domain is low-stakes so the engineering can be the focus.
