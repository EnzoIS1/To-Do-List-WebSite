import Panneau from './Panneau'
import TaskList from '../tasks/TaskList'
import QuickAdd from '../tasks/QuickAdd'

/**
 * Prise de note : ce qu'on écrit à la volée, sans avoir décidé du rangement.
 *
 * ─────────────────────────────────────────────────────────────────────
 * LE CHAMP D'AJOUT EST REVENU, ET CE N'EST PAS UN RETOUR EN ARRIÈRE
 *
 * Il avait été retiré pour une bonne raison : cinq champs d'ajout
 * différents obligeaient à choisir *où* écrire avant de savoir *quoi*.
 * Mais le résultat, c'est qu'on ne pouvait plus rien noter DEPUIS la prise
 * de note : il fallait remonter à la barre du haut, taper sans date ni
 * catégorie, et espérer que ça retombe ici. Pour la page dont le rôle est
 * justement d'attraper une idée au vol, c'est un détour de trop.
 *
 * Le champ ci-dessous n'a donc ni date ni catégorie — il ne pose aucune
 * question, et ce qu'il crée atterrit exactement là où on l'écrit.
 * ─────────────────────────────────────────────────────────────────────
 */
export default function InboxPanel({ taches, loading, cocher, ranger, creer }) {
  const aTrier = taches.filter((t) => !t.due_date && !t.category_id)
  const restantes = aTrier.filter((t) => !t.is_done).length

  return (
    <Panneau
      titre="Prise de note"
      sousTitre="Noté sans date ni catégorie"
      action={
        restantes > 0 && (
          <span className="compteur compteur-alerte" title="Notes à ranger">{restantes}</span>
        )
      }
      pied={creer && <QuickAdd onCreer={creer} sansDate placeholder="Noter une idée…" />}
    >
      <TaskList
        taches={aTrier}
        loading={loading}
        onCocher={cocher}
        onDater={ranger}
        vide="Tout est rangé."
      />
    </Panneau>
  )
}
