-- ============================================================
-- Seed — PEEB Cool Santa Fe (tables peebcoolsf_, projet EXTERNAL)
-- Reflet du déploiement réel. Idempotent (on conflict do nothing).
-- Chargé par lots via le connecteur MCP (execute_sql).
-- NULL = donnée manquante (afficher « — »), jamais 0.
-- ============================================================

-- ============================================================
-- LOT 1 — Référentiels
-- ============================================================
insert into public.peebcoolsf_componentes (code, nombre, color, texto_claro) values
  ('GP',  'Gestión de proyecto',   '#30323e', true),
  ('EE',  'Eficiencia energética', '#fff2cc', false),
  ('AyS', 'Ambiental y social',    '#d9ead3', false),
  ('G',   'Género',                '#d9d2e9', false)
on conflict (code) do nothing;

insert into public.peebcoolsf_tipologias (code, nombre, color, texto_claro) values
  ('A', 'Aeropuertos', '#990000', true),
  ('H', 'Hospitales',  '#cc0000', true),
  ('E', 'Escuelas',    '#3c78d8', true)
on conflict (code) do nothing;

insert into public.peebcoolsf_fases (code, nombre, orden) values
  ('estudios_preliminares', 'Estudios preliminares', 1),
  ('proyecto_ejecutivo',    'Proyecto ejecutivo',    2),
  ('licitacion',            'Licitación',            3),
  ('obra',                  'Obra',                  4),
  ('general',               'General',               5)
on conflict (code) do nothing;

insert into public.peebcoolsf_estados (code, nombre, color) values
  ('en_proceso', 'En proceso', '#ffd966'),
  ('terminado',  'Terminado',  '#b6d7a8')
on conflict (code) do nothing;

insert into public.peebcoolsf_tipo_linea (code, nombre) values
  ('documento', 'Documento'),
  ('etapa',     'Etapa')
on conflict (code) do nothing;

-- ============================================================
-- LOT 2 — Sous-projets
-- Écoles : coordonnées CDC §5 (E407 approximative).
-- Aéroports/hôpitaux : recherche web. Centenario : OSM way W190050427 (centroïde).
-- ============================================================
insert into public.peebcoolsf_subproyectos
  (uid, nombre, tipologia, seccion, orden, direccion, lat, lng, superficie_m2) values
  ('SUB-AIR',        'Aeropuerto Internacional de Rosario (Malvinas)', 'A', 'Aeropuertos', 1, 'Av. Jorge Newbery s/n, Fisherton, Rosario',   -32.90361,    -60.78444,    8547),
  ('SUB-ASV',        'Aeropuerto de Sauce Viejo',                      'A', 'Aeropuertos', 2, 'Ruta Nacional 11, Sauce Viejo, Santa Fe',     -31.71104,    -60.81138,    3276),
  ('SUB-CENTENARIO', 'Hospital del Centenario de Rosario',             'H', 'Hospitales',  3, 'Urquiza 3101, Rosario',                       -32.9385417,  -60.6647429,  3962),
  ('SUB-CULLEN',     'Hospital J. M. Cullen de Santa Fe',              'H', 'Hospitales',  4, 'Av. Freyre 2150, Santa Fe',                   -31.64850,    -60.71891,    1295),
  ('SUB-E67',        'Escuela 67 Pestalozzi',                          'E', 'Escuelas',    5, 'Mendoza 3969, Echesortu, Rosario',            -32.94461140, -60.67859581, 1479.76),
  ('SUB-E407',       'Escuela 407 Flores (Pocho Lepratti)',            'E', 'Escuelas',    6, '5 de Agosto y España, Las Flores, Rosario',   -32.99057,    -60.69833,    2150),
  ('SUB-E574',       'Escuela 574 Pérez (Juan Carlos)',                'E', 'Escuelas',    7, 'Las Casuarinas 306, Cabin 9, Pérez',          -32.96837094, -60.73702427, 2713),
  ('SUB-E1109',      'Escuela 1109 Yrigoyen',                          'E', 'Escuelas',    8, '12 de Octubre 9300, Yapeyú, Santa Fe',        -31.57111634, -60.74029039, 2558.15),
  ('SUB-E331',       'Escuela 331 Brown',                              'E', 'Escuelas',    9, '25 de Mayo 3762, Mariano Comas, Santa Fe',    -31.63277064, -60.70140506, 5089.19)
on conflict (uid) do nothing;

-- ============================================================
-- LOT 3 — Métriques faisabilidad (NULL respectés ; 0 réel uniquement SUB-ASV costo_otras)
-- ============================================================
insert into public.peebcoolsf_metricas
  (subproyecto_uid, escenario, demanda_kwh, demanda_despues_kwh, gei_antes_tco2, gei_despues_tco2,
   costo_ee_eur, costo_otras_eur,
   benef_personal, benef_personal_pct_muj, benef_usuarios, benef_usuarios_pct_muj, benef_indirectos, benef_indirectos_pct_muj) values
  ('SUB-AIR',        'faisabilidad', 2476830, 1724413, 739,    519,    2199774, NULL,    268,    52,   2461208, 52,   4870000, 52),
  ('SUB-ASV',        'faisabilidad', 1022879, 736942,  284,    195,    506023,  0,       824400, 27,   315556,  52,   687000,  52),
  ('SUB-CENTENARIO', 'faisabilidad', 2347919, 1532271, 567,    379,    2947437, 1188600, 1984,   64,   412018,  52,   1348452, 52),
  ('SUB-CULLEN',     'faisabilidad', 984776,  628667,  216,    143,    1018017, 388500,  2195,   62,   197224,  52,   568259,  52),
  ('SUB-E67',        'faisabilidad', 143300,  41877,   37.26,  10.89,  739880,  295952,  157,    79,   10017,   71,   30523,   52),
  ('SUB-E407',       'faisabilidad', 161981,  65231,   42.12,  16.96,  1075000, 430000,  NULL,   NULL, NULL,    NULL, NULL,    NULL),
  ('SUB-E574',       'faisabilidad', 230225,  76588,   59.86,  19.91,  1356500, 542600,  NULL,   NULL, NULL,    NULL, NULL,    NULL),
  ('SUB-E1109',      'faisabilidad', 202836,  80275,   52.74,  20.87,  1279075, 511630,  413,    NULL, 4749,    NULL, 15484,   52),
  ('SUB-E331',       'faisabilidad', 393598,  159699,  102.34, 41.52,  2544595, 1017838, NULL,   NULL, 25251,   NULL, 75754,   52)
on conflict (subproyecto_uid, escenario) do nothing;

-- Métriques proyecto : lignes créées, tous numériques NULL (vides)
insert into public.peebcoolsf_metricas (subproyecto_uid, escenario) values
  ('SUB-AIR','proyecto'), ('SUB-ASV','proyecto'), ('SUB-CENTENARIO','proyecto'),
  ('SUB-CULLEN','proyecto'), ('SUB-E67','proyecto'), ('SUB-E407','proyecto'),
  ('SUB-E574','proyecto'), ('SUB-E1109','proyecto'), ('SUB-E331','proyecto')
on conflict (subproyecto_uid, escenario) do nothing;

-- ============================================================
-- LOT 4 — Documentación GP (6 lignes par défaut)
-- ============================================================
insert into public.peebcoolsf_documentacion_gp (uid, nombre_documento, orden) values
  ('GP-DOC-MANUAL', 'Manual Operativo',      1),
  ('GP-DOC-PAC',    'Plan de adquisiciones', 2),
  ('GP-DOC-MV',     'Plan de M&V',           3),
  ('GP-DOC-PRESUP', 'Presupuesto',           4),
  ('GP-DOC-INI',    'Informe de inicio',     5),
  ('GP-DOC-PER1',   'Informe periódico 1',   6)
on conflict (uid) do nothing;

-- ============================================================
-- LOT 5 — Capacitaciones documentos (Formación 1/2/3 par sous-section EE/AyS/G)
-- ============================================================
insert into public.peebcoolsf_capacitaciones_documentos (uid, subseccion, componente, titulo, orden) values
  ('CAP-EE-01',  'EE',  'EE',  'Formación 1', 1),
  ('CAP-EE-02',  'EE',  'EE',  'Formación 2', 2),
  ('CAP-EE-03',  'EE',  'EE',  'Formación 3', 3),
  ('CAP-AYS-01', 'AyS', 'AyS', 'Formación 1', 1),
  ('CAP-AYS-02', 'AyS', 'AyS', 'Formación 2', 2),
  ('CAP-AYS-03', 'AyS', 'AyS', 'Formación 3', 3),
  ('CAP-G-01',   'G',   'G',   'Formación 1', 1),
  ('CAP-G-02',   'G',   'G',   'Formación 2', 2),
  ('CAP-G-03',   'G',   'G',   'Formación 3', 3)
on conflict (uid) do nothing;

-- ============================================================
-- LOT 6 — Gestion_lineas (4 lignes × 9 sous-projets = 36), généré par cross join
-- UID : GEST-<CODE>-<NNNN>
-- ============================================================
insert into public.peebcoolsf_gestion_lineas (uid, subproyecto_uid, titulo, orden)
select format('GEST-%s-%s', s.code, lpad(t.n::text, 4, '0')), s.sub_uid, t.titulo, t.n
from (values
  ('SUB-AIR','AIR'), ('SUB-ASV','ASV'), ('SUB-CENTENARIO','CENTENARIO'),
  ('SUB-CULLEN','CULLEN'), ('SUB-E67','E67'), ('SUB-E407','E407'),
  ('SUB-E574','E574'), ('SUB-E1109','E1109'), ('SUB-E331','E331')
) as s(sub_uid, code)
cross join (values
  (1,'Auditoria'), (2,'Planos pdf'), (3,'Proyecto ejecutivo'), (4,'Pliego')
) as t(n, titulo)
on conflict (uid) do nothing;
