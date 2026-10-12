-- Parts split from one original PDF share a group, so they are deleted as a unit.
ALTER TABLE library_book_pdfs ADD COLUMN part_group TEXT;
