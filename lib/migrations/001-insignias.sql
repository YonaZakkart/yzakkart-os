-- Insignias de cuenta.
-- dorada: verificación tipo red social.
-- yz: marca del equipo de YZakkartOS (solo con el token del propietario).

ALTER TABLE users ADD COLUMN badge_gold INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN badge_yz INTEGER NOT NULL DEFAULT 0;
