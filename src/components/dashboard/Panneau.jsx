/**
 * L'enveloppe visuelle commune à tous les panneaux du tableau de bord :
 * un titre, une zone d'action optionnelle à droite, et un contenu qui défile
 * pour son propre compte sans jamais faire défiler la page entière.
 */
export default function Panneau({ titre, sousTitre, action, accent, children, pied, className = '' }) {
  return (
    <section className={`panneau ${className}`} style={accent ? { '--teinte': accent } : undefined}>
      <header className="panneau-tete">
        <div className="panneau-titres">
          <h2>{titre}</h2>
          {sousTitre && (
            typeof sousTitre === 'string'
              ? <p className="panneau-sous-titre">{sousTitre}</p>
              : sousTitre
          )}
        </div>
        {action}
      </header>
      <div className="panneau-corps">{children}</div>
      {pied && <footer className="panneau-pied">{pied}</footer>}
    </section>
  )
}
