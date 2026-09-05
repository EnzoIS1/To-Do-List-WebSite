/**
 * Vérification du service worker.   node tests/sw.test.mjs
 *
 * Un service worker ne s'exécute pas dans Node : on charge donc le fichier
 * dans un contexte où `self` est un faux objet qui enregistre ce que le code
 * lui demande. On peut alors déclencher un faux « push » et regarder ce qui
 * aurait été affiché.
 *
 * Ce que ce test garantit — et qui compte plus que le reste :
 * un message reçu affiche TOUJOURS une notification, même illisible. Les
 * navigateurs révoquent l'abonnement d'un site qui reçoit sans rien montrer ;
 * un `return` silencieux dans le gestionnaire suffirait à tuer les rappels
 * au bout de quelques jours, sans erreur nulle part.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

let echecs = 0
const ok = (nom, condition, detail = '') => {
  console.log(`  ${condition ? 'ok   ' : 'ÉCHEC'} ${nom}${condition ? '' : '  ' + detail}`)
  if (!condition) echecs++
}

/** Charge sw.js avec un faux `self`, et renvoie de quoi le piloter. */
function chargerServiceWorker({ fenetresOuvertes = [] } = {}) {
  const gestionnaires = {}
  const affichees = []
  const ouvertes = []
  const attentes = []

  const self = {
    addEventListener: (nom, fn) => { gestionnaires[nom] = fn },
    registration: {
      showNotification: (titre, options) => {
        affichees.push({ titre, ...options })
        return Promise.resolve()
      },
    },
    clients: {
      matchAll: async () => fenetresOuvertes,
      openWindow: async (url) => { ouvertes.push(url); return {} },
      claim: async () => {},
    },
    skipWaiting: () => {},
  }

  const contexte = vm.createContext({ self, console })
  vm.runInContext(readFileSync(join(racine, 'public', 'sw.js'), 'utf8'), contexte, { filename: 'sw.js' })

  const evenementPush = (data) => ({
    data,
    waitUntil: (p) => attentes.push(p),
  })

  return { gestionnaires, affichees, ouvertes, attentes, evenementPush }
}

console.log('\n1. Un message normal donne UNE notification groupée')
{
  const sw = chargerServiceWorker()
  const charge = {
    titre: '3 rappels aujourd\'hui',
    corps: 'Rendre le TP de SVT · Réviser le chapitre 3 · Contrôle d\'anglais',
    tag: 'resume-du-jour',
    url: 'https://enzois1.github.io/To-Do-List-WebSite/',
  }
  sw.gestionnaires.push(sw.evenementPush({ json: () => charge }))
  await Promise.all(sw.attentes)

  ok('exactement une notification', sw.affichees.length === 1, String(sw.affichees.length))
  const n = sw.affichees[0]
  ok('le titre vient du serveur', n.titre === charge.titre)
  ok('le corps aussi', n.body === charge.corps)
  ok('l\'étiquette est posée — c\'est elle qui empêche l\'empilement',
    n.tag === 'resume-du-jour', String(n.tag))
  ok('renotify est demandé, pour que le remplacement se signale', n.renotify === true)
  ok('l\'icône est relative au service worker', n.icon === './icone-192.png')
  ok('l\'adresse du clic est transmise', n.data?.url === charge.url)
}

console.log('\n2. Deux messages de suite portent la MÊME étiquette')
{
  const sw = chargerServiceWorker()
  sw.gestionnaires.push(sw.evenementPush({ json: () => ({ titre: 'A', corps: 'a' }) }))
  sw.gestionnaires.push(sw.evenementPush({ json: () => ({ titre: 'B', corps: 'b' }) }))
  await Promise.all(sw.attentes)
  ok('les deux ont la même étiquette, donc la seconde remplace la première',
    sw.affichees.length === 2 && sw.affichees[0].tag === sw.affichees[1].tag,
    JSON.stringify(sw.affichees.map((n) => n.tag)))
}

console.log('\n3. Un message illisible affiche quand même quelque chose')
{
  for (const [cas, data] of [
    ['JSON invalide', { json: () => { throw new SyntaxError('inattendu') } }],
    ['message vide', null],
    ['objet sans titre', { json: () => ({}) }],
  ]) {
    const sw = chargerServiceWorker()
    sw.gestionnaires.push(sw.evenementPush(data))
    await Promise.all(sw.attentes)
    ok(`${cas} → une notification malgré tout`, sw.affichees.length === 1)
    ok(`${cas} → avec un texte de repli non vide`,
      typeof sw.affichees[0]?.titre === 'string' && sw.affichees[0].titre.length > 0 &&
      typeof sw.affichees[0]?.body === 'string' && sw.affichees[0].body.length > 0,
      JSON.stringify(sw.affichees[0]))
    ok(`${cas} → l'affichage est bien attendu (waitUntil)`, sw.attentes.length === 1)
  }
}

console.log('\n4. Le clic')
{
  // Site déjà ouvert : on ramène la fenêtre au premier plan.
  let focalisee = false
  const sw = chargerServiceWorker({
    fenetresOuvertes: [{ focus: () => { focalisee = true } }],
  })
  const attentes = []
  let fermee = false
  sw.gestionnaires.notificationclick({
    notification: { close: () => { fermee = true }, data: { url: './' } },
    waitUntil: (p) => attentes.push(p),
  })
  await Promise.all(attentes)
  ok('la notification est refermée', fermee)
  ok('la fenêtre existante reprend le focus', focalisee)
  ok('aucune nouvelle fenêtre n\'est ouverte', sw.ouvertes.length === 0)
}
{
  // Aucun onglet ouvert : on en ouvre un, sur l'adresse transmise.
  const sw = chargerServiceWorker({ fenetresOuvertes: [] })
  const attentes = []
  sw.gestionnaires.notificationclick({
    notification: { close: () => {}, data: { url: 'https://exemple.fr/liste' } },
    waitUntil: (p) => attentes.push(p),
  })
  await Promise.all(attentes)
  ok('une fenêtre est ouverte sur la bonne adresse',
    sw.ouvertes.length === 1 && sw.ouvertes[0] === 'https://exemple.fr/liste',
    JSON.stringify(sw.ouvertes))
}
{
  // Notification sans données : on ne doit pas planter.
  const sw = chargerServiceWorker({ fenetresOuvertes: [] })
  const attentes = []
  sw.gestionnaires.notificationclick({
    notification: { close: () => {} },
    waitUntil: (p) => attentes.push(p),
  })
  await Promise.all(attentes)
  ok('sans données, on ouvre la racine du site', sw.ouvertes[0] === './', JSON.stringify(sw.ouvertes))
}

console.log(echecs === 0 ? '\n✓ Tout est vert.\n' : `\n✗ ${echecs} échec(s).\n`)
process.exit(echecs === 0 ? 0 : 1)
