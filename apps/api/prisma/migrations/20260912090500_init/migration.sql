-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies" (
    "tmdb_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "poster_path" TEXT,
    "release_date" DATE,
    "runtime" INTEGER,
    "genres" JSONB NOT NULL,
    "tmdb_vote_average" DOUBLE PRECISION NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("tmdb_id")
);

-- CreateTable
CREATE TABLE "collection_movies" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "collection_id" UUID NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" SMALLINT,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_movies_pkey" PRIMARY KEY ("id")
);

-- Added by hand: the Prisma schema cannot declare a CHECK, and a rating
-- outside 1-5 would skew every average the app shows.
ALTER TABLE "collection_movies"
    ADD CONSTRAINT "collection_movies_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

-- CreateIndex
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");

-- CreateIndex
CREATE INDEX "collections_user_id_created_at_idx" ON "collections"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "collection_movies_collection_id_added_at_id_idx" ON "collection_movies"("collection_id", "added_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_movies_collection_id_tmdb_id_key" ON "collection_movies"("collection_id", "tmdb_id");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_movies" ADD CONSTRAINT "collection_movies_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_movies" ADD CONSTRAINT "collection_movies_tmdb_id_fkey" FOREIGN KEY ("tmdb_id") REFERENCES "movies"("tmdb_id") ON DELETE RESTRICT ON UPDATE CASCADE;
