-- ============================================================
-- Migration 001 — Schéma initial PEEB Cool Santa Fe
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES DE RÉFÉRENCE (ÉNUMÉRATIONS)
-- ============================================================

CREATE TABLE componentes (
  code        TEXT    PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  color       TEXT    NOT NULL,
  texto_claro BOOLEAN NOT NULL DEFAULT FALSE  -- true = texte clair sur fond foncé
);

CREATE TABLE tipologias (
  code        TEXT    PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  color       TEXT    NOT NULL,
  texto_claro BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE fases (
  code   TEXT     PRIMARY KEY,
  nombre TEXT     NOT NULL,
  orden  SMALLINT NOT NULL
);

CREATE TABLE estados (
  code   TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  color  TEXT NOT NULL
);

CREATE TABLE tipo_linea (
  code   TEXT PRIMARY KEY,
  nombre TEXT NOT NULL
);

-- ============================================================
-- ENTITÉS ET PROFILS
-- ============================================================

CREATE TABLE entidades (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid        TEXT        UNIQUE NOT NULL,
  nombre     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profils utilisateurs (liés à auth.users via Supabase Auth)
CREATE TABLE perfiles (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol        TEXT        NOT NULL CHECK (rol IN ('admin', 'usuario')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SOUS-PROJETS
-- ============================================================

CREATE TABLE subproyectos (
  id           UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid          TEXT             UNIQUE NOT NULL,
  nombre       TEXT             NOT NULL,
  tipologia    TEXT             NOT NULL REFERENCES tipologias(code),
  seccion      TEXT             NOT NULL CHECK (seccion IN ('Aeropuertos', 'Hospitales', 'Escuelas')),
  orden        SMALLINT         NOT NULL,
  -- Datos del edificio
  direccion    TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  superficie_m2 DOUBLE PRECISION,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÉTRIQUES (1 ligne par sous-projet × scénario)
-- ============================================================

-- Ne jamais stocker les calculs dérivés (économie kWh, %, kWh/m²).
-- Données manquantes = NULL → afficher « — », jamais 0.
CREATE TABLE metricas (
  id                    UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  subproyecto_uid       TEXT             NOT NULL REFERENCES subproyectos(uid) ON DELETE CASCADE,
  escenario             TEXT             NOT NULL CHECK (escenario IN ('faisabilidad', 'proyecto')),
  -- Consommations
  demanda_kwh           DOUBLE PRECISION,
  demanda_despues_kwh   DOUBLE PRECISION,
  -- GEI
  gei_antes_tco2        DOUBLE PRECISION,
  gei_despues_tco2      DOUBLE PRECISION,
  -- Coûts
  costo_ee_eur          DOUBLE PRECISION,
  costo_otras_eur       DOUBLE PRECISION,
  -- Bénéficiaires (scénario faisabilidad uniquement)
  benef_personal        INTEGER,
  benef_personal_pct_muj    DOUBLE PRECISION,
  benef_usuarios        INTEGER,
  benef_usuarios_pct_muj    DOUBLE PRECISION,
  benef_indirectos      INTEGER,
  benef_indirectos_pct_muj  DOUBLE PRECISION,
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (subproyecto_uid, escenario)
);

-- ============================================================
-- ÉQUIPE
-- ============================================================

CREATE TABLE equipo (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid          TEXT        UNIQUE NOT NULL,
  apellido     TEXT        NOT NULL,
  nombre       TEXT        NOT NULL,
  entidad_uid  TEXT        REFERENCES entidades(uid),
  rol          TEXT,
  componente   TEXT        REFERENCES componentes(code),
  telefono     TEXT,
  mail         TEXT,
  sexo         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÉVÉNEMENTS CALENDRIER
-- ============================================================

CREATE TABLE eventos (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid           TEXT        UNIQUE NOT NULL,
  nombre        TEXT        NOT NULL,
  fecha         DATE        NOT NULL,
  hora_inicio   TIME,
  hora_fin      TIME,
  participantes TEXT[]      NOT NULL DEFAULT '{}',  -- UIDs equipo
  componente    TEXT        REFERENCES componentes(code),
  modalidad     TEXT        CHECK (modalidad IN ('Presencial', 'Virtual')),
  lugar         TEXT,
  url_conexion  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTATION GP
-- ============================================================

CREATE TABLE documentacion_gp (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid              TEXT        UNIQUE NOT NULL,
  nombre_documento TEXT        NOT NULL,
  url              TEXT,
  orden            SMALLINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GESTION FINANCIÈRE (structure minimale, contenu à définir)
-- ============================================================

CREATE TABLE gestion_financiera (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid        TEXT        UNIQUE NOT NULL,
  titulo     TEXT,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CAPACITACIONES — DOCUMENTS
-- ============================================================

CREATE TABLE capacitaciones_documentos (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid        TEXT        UNIQUE NOT NULL,
  subseccion TEXT        NOT NULL CHECK (subseccion IN ('EE', 'AyS', 'G')),
  componente TEXT        REFERENCES componentes(code),
  titulo     TEXT        NOT NULL,
  url        TEXT,
  orden      SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CAPACITACIONES — ÉVÉNEMENTS
-- ============================================================

CREATE TABLE capacitaciones_eventos (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid            TEXT        UNIQUE NOT NULL,
  subseccion     TEXT        NOT NULL CHECK (subseccion IN ('EE', 'AyS', 'G')),
  componente     TEXT        REFERENCES componentes(code),
  entidades      TEXT[]      NOT NULL DEFAULT '{}',  -- UIDs entidades
  participantes  TEXT[]      NOT NULL DEFAULT '{}',  -- UIDs equipo
  fecha_hora     TIMESTAMPTZ,
  documento_uid  TEXT        REFERENCES capacitaciones_documentos(uid),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GESTION DES SOUS-PROJETS — LIGNES FLEXIBLES
-- ============================================================

CREATE TABLE gestion_lineas (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid              TEXT        UNIQUE NOT NULL,
  subproyecto_uid  TEXT        NOT NULL REFERENCES subproyectos(uid) ON DELETE CASCADE,
  titulo           TEXT        NOT NULL,
  orden            SMALLINT    NOT NULL DEFAULT 0,
  tipo_linea       TEXT        REFERENCES tipo_linea(code),
  componente       TEXT        REFERENCES componentes(code),
  -- url actif uniquement si tipo_linea = 'documento' (règle UI, non contrainte DB)
  url              TEXT,
  estado           TEXT        REFERENCES estados(code),
  fecha            DATE,
  fase             TEXT        REFERENCES fases(code),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGER updated_at (appliqué à toutes les tables mutables)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subproyectos_upd   BEFORE UPDATE ON subproyectos           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_metricas_upd        BEFORE UPDATE ON metricas               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_equipo_upd          BEFORE UPDATE ON equipo                 FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_eventos_upd         BEFORE UPDATE ON eventos                FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_doc_gp_upd          BEFORE UPDATE ON documentacion_gp       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gf_upd              BEFORE UPDATE ON gestion_financiera      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cap_docs_upd        BEFORE UPDATE ON capacitaciones_documentos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cap_evts_upd        BEFORE UPDATE ON capacitaciones_eventos  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gestion_lineas_upd  BEFORE UPDATE ON gestion_lineas          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
