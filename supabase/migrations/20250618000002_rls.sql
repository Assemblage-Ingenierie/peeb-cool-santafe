-- ============================================================
-- Migration 002 — Row Level Security (RLS)
-- Lecture : utilisateurs authentifiés
-- Écriture : rôle admin uniquement
-- ============================================================

-- ============================================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================================

ALTER TABLE componentes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipologias               ENABLE ROW LEVEL SECURITY;
ALTER TABLE fases                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_linea               ENABLE ROW LEVEL SECURITY;
ALTER TABLE entidades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE subproyectos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipo                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentacion_gp         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestion_financiera       ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones_eventos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestion_lineas           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER : is_admin()
-- Vérifie que l'utilisateur courant a le rôle 'admin' dans perfiles.
-- SECURITY DEFINER pour éviter la récursion RLS sur perfiles.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE user_id = auth.uid()
      AND rol = 'admin'
  );
END;
$$;

-- ============================================================
-- POLITIQUES — TABLES DE RÉFÉRENCE
-- Lecture : authentifiés ; écriture : admin
-- ============================================================

CREATE POLICY "sel_componentes"  ON componentes  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_componentes"  ON componentes  FOR ALL    USING (is_admin());

CREATE POLICY "sel_tipologias"   ON tipologias   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_tipologias"   ON tipologias   FOR ALL    USING (is_admin());

CREATE POLICY "sel_fases"        ON fases        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_fases"        ON fases        FOR ALL    USING (is_admin());

CREATE POLICY "sel_estados"      ON estados      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_estados"      ON estados      FOR ALL    USING (is_admin());

CREATE POLICY "sel_tipo_linea"   ON tipo_linea   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_tipo_linea"   ON tipo_linea   FOR ALL    USING (is_admin());

-- ============================================================
-- POLITIQUES — TABLES PRINCIPALES
-- ============================================================

-- perfiles : chaque utilisateur voit son propre profil ; admin voit tout
CREATE POLICY "sel_perfiles"     ON perfiles     FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "all_perfiles"     ON perfiles     FOR ALL    USING (is_admin());

CREATE POLICY "sel_entidades"    ON entidades    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_entidades"    ON entidades    FOR ALL    USING (is_admin());

CREATE POLICY "sel_subproyectos" ON subproyectos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_subproyectos" ON subproyectos FOR ALL    USING (is_admin());

CREATE POLICY "sel_metricas"     ON metricas     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_metricas"     ON metricas     FOR ALL    USING (is_admin());

CREATE POLICY "sel_equipo"       ON equipo       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_equipo"       ON equipo       FOR ALL    USING (is_admin());

CREATE POLICY "sel_eventos"      ON eventos      FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_eventos"      ON eventos      FOR ALL    USING (is_admin());

CREATE POLICY "sel_doc_gp"       ON documentacion_gp          FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_doc_gp"       ON documentacion_gp          FOR ALL    USING (is_admin());

CREATE POLICY "sel_gf"           ON gestion_financiera         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_gf"           ON gestion_financiera         FOR ALL    USING (is_admin());

CREATE POLICY "sel_cap_docs"     ON capacitaciones_documentos  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_cap_docs"     ON capacitaciones_documentos  FOR ALL    USING (is_admin());

CREATE POLICY "sel_cap_evts"     ON capacitaciones_eventos     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_cap_evts"     ON capacitaciones_eventos     FOR ALL    USING (is_admin());

CREATE POLICY "sel_gestion_lin"  ON gestion_lineas             FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_gestion_lin"  ON gestion_lineas             FOR ALL    USING (is_admin());
