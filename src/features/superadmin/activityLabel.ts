/** Audits retain their raw action for diagnostics; headings use business language. */
export function activityLabel(action: string): string {
  if (/\blogin\b/i.test(action)) return 'Connexion à l’application';
  if (/\blogout\b/i.test(action)) return 'Déconnexion';
  const known: [RegExp, string][] = [
    [/impersonate|support_access/i, 'Accès assistance au magasin'],
    [/inventory\/actions|inventory\/adjust/i, 'Modification de l’inventaire d’un produit'],
    [/mobile-stock\/sessions/i, 'Session d’inventaire'],
    [/mobile-stock\/locations/i, 'Gestion des emplacements'],
    [/plan_version.*publish/i, 'Publication d’une version de plan'],
    [/plan_version.*migrate/i, 'Migration d’abonnements'],
    [/plan_version/i, 'Modification des conditions d’un plan'],
    [/subscription.*activate/i, 'Activation d’un abonnement'],
    [/subscription.*cancel/i, 'Annulation d’un abonnement'],
    [/subscription-billings.*validate/i, 'Validation d’une facture d’abonnement'],
    [/access\.role|roles.*permissions/i, 'Modification des permissions d’un rôle'],
    [/access\.menu|menu-role/i, 'Modification des menus'],
    [/access\.override/i, 'Gestion d’une exception d’accès'],
    [/access\.simulate/i, 'Simulation des accès'],
    [/platform\.user\.create/i, 'Création d’un utilisateur'],
    [/platform\.user\.update/i, 'Modification d’un utilisateur'],
    [/platform\.user\.unlink_store/i, 'Retrait d’un rattachement à un magasin'],
    [/platform\.user\.link_store/i, 'Rattachement à un magasin'],
    [/ServiceAppointment|service-appointments/i, 'Rendez-vous de soins'],
    [/ServiceSession|service-sessions/i, 'Séance de soins'],
  ];
  return (
    known.find(([pattern]) => pattern.test(action))?.[1] ??
    action
      .replace(/^(GET|POST|PUT|PATCH|DELETE)\s+(api\/)?/i, 'Opération · ')
      .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '')
      .replace(/\/(\d+)(?=\/|$)/g, '')
      .replace(/[._/-]+/g, ' ')
      .trim()
  );
}
