-- One collection name per user, compared case-insensitively: "Horror" and
-- "horror" are the same label to the person reading the list.
--
-- `citext` rather than a lowercased second column or an index over
-- `lower(name)`: the rule lives in the column's own type, so there is no copy
-- to keep in step and the unique index stays one Prisma can express. The type
-- applies to this column alone.
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE "collections" ALTER COLUMN "name" TYPE CITEXT USING "name"::citext;

-- Two collections a user already named the same thing collide here: this is
-- meant to fail on them rather than pick one to rename.
CREATE UNIQUE INDEX "collections_user_id_name_key"
  ON "collections" ("user_id", "name");
