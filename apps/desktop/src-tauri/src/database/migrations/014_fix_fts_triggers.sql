-- Fix broken FTS5 triggers that cause (code: 1) SQL logic error on update/delete

DROP TRIGGER IF EXISTS lectures_ad;
DROP TRIGGER IF EXISTS lectures_au;

CREATE TRIGGER IF NOT EXISTS lectures_ad AFTER DELETE ON lectures BEGIN
    DELETE FROM lectures_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS lectures_au AFTER UPDATE ON lectures BEGIN
    DELETE FROM lectures_fts WHERE rowid = old.rowid;
    INSERT INTO lectures_fts(rowid, title, notes, tags_flat)
    VALUES (new.rowid, new.title, new.notes, new.tags_flat);
END;
