## Emails d'authentification — pourquoi le SMTP Brevo est partagé (et non recréé)

**Principe.** Dans Supabase, le relais d'envoi d'emails (« Custom SMTP », onglet
*Authentication → Emails → SMTP Settings*) se configure **une seule fois par projet** —
ce n'est **pas** un réglage par application. Comme **peeb-santafe** et **peeb-jordan**
partagent le même projet Supabase **EXTERNAL** (`grnkbnldfzdzrgleorra`), les deux
applications utilisent **automatiquement le même SMTP**. Il n'est pas possible d'avoir
deux configurations SMTP dans un même projet.

**Ce SMTP n'est pas « celui de peeb-jordan » : c'est celui du projet partagé.** Il pointe
vers le **compte Brevo d'Assemblage** et le domaine **`assemblage.net`** (expéditeur
`malo@assemblage.net`), dont les enregistrements **SPF/DKIM sont déjà authentifiés** (via
IONOS). C'est une ressource commune d'Assemblage, adaptée à toutes les applications du
bureau d'études.

**Pourquoi ne pas recréer un SMTP dédié à peeb-santafe :**
1. **Techniquement impossible** — un seul SMTP par projet, et les deux apps sont sur le
   même projet.
2. **Inutile** — le domaine `assemblage.net` est déjà authentifié sur ce Brevo, ce qui
   garantit la délivrabilité (pas de mise en spam). En recréer un obligerait à
   ré-authentifier un domaine sans bénéfice.
3. **Cohérent** — un expéditeur Assemblage pour un outil Assemblage.

**La personnalisation par application se fait au bon niveau : le contenu, pas le transport.**
Le SMTP ne fait que *livrer* l'email ; le *branding* (ex. « PEEB Cool — Santa Fe ») est
géré dans le **template** via une condition sur une métadonnée d'inscription
(`{{ if eq .Data.app "peeb-santafe" }} … {{ else }} … {{ end }}`). Chaque utilisateur
reçoit donc un email aux couleurs de son application, tout en passant par le même relais.

**Limite à connaître.** L'**adresse et le nom d'expéditeur** (`malo@assemblage.net`) étant
définis au niveau du projet, ils sont **communs aux deux applications** — seul le corps de
l'email diffère. Pour obtenir un expéditeur distinct par application (ex.
`santafe@assemblage.net`), il faudrait soit un **projet Supabase séparé** (le plan gratuit
n'en autorise que deux, déjà utilisés : EXTERNAL et INTERNAL), soit **envoyer les emails
via l'API Brevo** en contournant le SMTP de Supabase (solution plus lourde, par
edge function / trigger `pg_net`). Pour l'usage actuel, le SMTP partagé reste le choix le
plus simple, fiable et gratuit.
