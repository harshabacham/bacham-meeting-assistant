-- Seed static commands into the global search index

-- 1. Open Settings
INSERT OR IGNORE INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
VALUES ('command', 'cmd_settings', NULL, 'Open Settings', 'Preferences, configuration, theme, audio setup, API keys, storage, index health');
INSERT OR IGNORE INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
VALUES ('command', 'cmd_settings', NULL, datetime('now'));

-- 2. Switch Theme
INSERT OR IGNORE INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
VALUES ('command', 'cmd_theme', NULL, 'Switch Theme', 'Dark mode, light mode, appearance, system theme');
INSERT OR IGNORE INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
VALUES ('command', 'cmd_theme', NULL, datetime('now'));

-- 3. Start Recording
INSERT OR IGNORE INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
VALUES ('command', 'cmd_record', NULL, 'Start Recording', 'Capture new lecture, microphone, screen record, system audio');
INSERT OR IGNORE INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
VALUES ('command', 'cmd_record', NULL, datetime('now'));

-- 4. Open Folder / Library
INSERT OR IGNORE INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
VALUES ('command', 'cmd_library', NULL, 'Open Library', 'Folders, subjects, semesters, all lectures, browse');
INSERT OR IGNORE INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
VALUES ('command', 'cmd_library', NULL, datetime('now'));

-- 5. Generate Flashcards (General / Current)
INSERT OR IGNORE INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
VALUES ('command', 'cmd_gen_flashcards', NULL, 'Generate Flashcards', 'Create anki cards, study deck, spaced repetition from current lecture');
INSERT OR IGNORE INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
VALUES ('command', 'cmd_gen_flashcards', NULL, datetime('now'));

-- 6. Generate Quiz (General / Current)
INSERT OR IGNORE INTO global_search_index(entity_type, entity_id, parent_lecture_id, title, body)
VALUES ('command', 'cmd_gen_quiz', NULL, 'Generate Quiz', 'Test knowledge, multiple choice, practice questions from current lecture');
INSERT OR IGNORE INTO search_index_meta(entity_type, entity_id, parent_lecture_id, updated_at)
VALUES ('command', 'cmd_gen_quiz', NULL, datetime('now'));
