-- Permisos de administración: puede editar y borrar publicaciones y
-- comentarios de cualquier cuenta.

ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
