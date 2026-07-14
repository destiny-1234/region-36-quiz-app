/*
# Make questions.created_by nullable for seed data compatibility
*/
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'created_by' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE questions ALTER COLUMN created_by DROP NOT NULL;
  END IF;
END $$;
