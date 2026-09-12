-- Runs once, on first boot of an empty data volume. The dev database comes
-- from POSTGRES_DB; this is the second one the service tests truncate.
CREATE DATABASE curator_test;
