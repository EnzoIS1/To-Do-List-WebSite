/**
 * Le service worker : ce qui reçoit la notification quand le site est fermé.
 *
 * Il vit à la racine du site publié, pas dans src/ : un service worker ne
 * peut agir que sur les pages situées sous son propre chemin. Placé ici, il
 * est servi depuis /To-Do-List-WebSite/sw.js et couvre bien tout le site.
 *
 * ⚠️ RÈGLE ABSOLUE : toute notification reçue DOIT afficher quelque chose.
 *
 * Les navigateurs — Safari en tête — révoquent l'abonnement d'un site qui
 * reçoit des messages sans rien montrer à l'utilisateur : c'est la parade
 * contre les sites qui se serviraient des notifications pour se réveiller
 * en douce. D'où le repli ci-dessous : même si le message est illisible,
 * on affiche une notification générique plutôt que rien.
 */

const PAR_DEFAUT = {
  titre: 'Rappels',
  corps: 'Ouvre ta liste pour voir ce qui t\'attend.',
  tag: 'resume-du-jour',
  url: './',
}

self.addEventListener('push', (evenement) => {
  let contenu = PAR_DEFAUT
  try {
    if (evenement.data) contenu = { ...PAR_DEFAUT, ...evenement.data.json() }
  } catch {
    // Message vide ou mal formé : on garde le texte par défaut. Surtout,
    // on ne sort pas d'ici sans afficher quelque chose.
  }

  evenement.waitUntil(
    self.registration.showNotification(contenu.titre, {
      body: contenu.corps,
      /*
       * `tag` est ce qui réalise le regroupement demandé : deux notifications
       * portant la même étiquette ne s'empilent pas, la seconde REMPLACE la
       * première. Même si deux envois partaient le même matin, il n'y aurait
       * jamais qu'une ligne sur l'écran verrouillé.
       *
       * `renotify` demande de re-signaler le remplacement (son, vibration)
       * plutôt que de le faire en silence.
       */
      tag: contenu.tag,
      renotify: true,
      icon: './icone-192.png',
      badge: './icone-192.png',
      lang: 'fr',
      data: { url: contenu.url },
    })
  )
})

self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close()
  const cible = evenement.notification.data?.url ?? './'

  evenement.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Si le site est déjà ouvert quelque part, on le ramène au premier plan
    // au lieu d'ouvrir un deuxième exemplaire.
    for (const f of fenetres) {
      if ('focus' in f) return f.focus()
    }
    if (self.clients.openWindow) return self.clients.openWindow(cible)
  })())
})

// Prendre la main sans attendre la fermeture de tous les onglets : sinon une
// version corrigée du service worker peut rester inactive plusieurs jours.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
