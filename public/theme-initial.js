/*
 * Applique le thème et l'ambiance enregistrés AVANT le premier rendu.
 *
 * Sans ce script, le site s'affiche une fraction de seconde dans le thème
 * du système avant que React ne rétablisse le choix : un clignotement blanc
 * désagréable en mode sombre.
 *
 * Il est chargé de façon bloquante depuis le <head> — c'est voulu : il doit
 * s'exécuter avant la première peinture. Il fait dix lignes et ne dépend de
 * rien.
 */
try {
  var t = localStorage.getItem('todo-theme')
  if (t === 'sombre') document.documentElement.setAttribute('data-theme', 'dark')
  else if (t === 'clair') document.documentElement.setAttribute('data-theme', 'light')

  // L'ambiance ne vaut qu'en thème sombre — même règle que dans le site.
  var a = localStorage.getItem('todo-ambiance')
  var sombre = t === 'sombre' ||
    (t !== 'clair' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (a && sombre && ['nebuleuse', 'minuit', 'aurore'].indexOf(a) !== -1) {
    document.documentElement.setAttribute('data-ambiance', a)
  }
} catch (e) { /* stockage refusé : on garde le thème du système */ }
