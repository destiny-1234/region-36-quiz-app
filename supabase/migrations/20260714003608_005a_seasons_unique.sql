/*
# Add unique constraint on seasons.name
*/
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seasons_name_key') THEN
    ALTER TABLE seasons ADD CONSTRAINT seasons_name_key UNIQUE (name);
  END IF;
END $$;
