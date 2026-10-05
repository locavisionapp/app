import { Link } from 'react-router-dom'
import { LEGAL_LINKS } from './legal/Legal'
import { ScanLine, ShieldCheck, Clock, Code2, CheckCircle2, ArrowRight, Car, Truck, Bike } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-brand-700">
            <ScanLine size={22} />
            <span className="text-lg font-bold">LocaVision</span>
          </div>
          <Button as={Link} to="/login" size="sm" variant="secondary">Connexion</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 px-4 py-16 text-center md:py-24">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sunset-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-teal-400/30 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            <ScanLine size={14} /> Scan &amp; inspection IA
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
            Scannez un véhicule. L'IA vous dit ce qui va, et ce qui ne va pas.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-brand-50 md:text-lg">
            Plaque d'immatriculation, inspection guidée, historique complet — en quelques minutes,
            sur téléphone ou tablette. Une API ouverte pour brancher LocaVision à votre outil existant.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button as={Link} to="/login" size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
              Accéder à mon espace <ArrowRight size={18} />
            </Button>
            <Button as="a" href="#comment-ca-marche" size="lg" variant="secondary" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
              Voir comment ça marche
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="border-t border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Trois étapes, un seul geste terrain</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: ScanLine, title: '1. Scanner la plaque', text: "Une photo suffit : la plaque est lue et le véhicule identifié automatiquement (marque, modèle, année, catégorie).", bg: 'bg-brand-100', fg: 'text-brand-700' },
              { icon: CheckCircle2, title: '2. Inspection IA guidée', text: "L'app indique où se placer selon le type de véhicule, valide chaque photo, puis analyse l'ensemble et donne un verdict clair : vert, orange ou rouge.", bg: 'bg-accent-100', fg: 'text-accent-700' },
              { icon: Clock, title: '3. Historique complet', text: "Chaque inspection est archivée. En un coup d'œil, comparez l'état du véhicule dans le temps.", bg: 'bg-teal-100', fg: 'text-teal-600' },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.icon className={s.fg} size={22} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Une IA transparente, pas une boîte noire</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: "Ce que l'IA regarde", text: 'Rayures, chocs, bris de vitre, usure des pneus — chaque point relevé est expliqué et localisé, jamais un simple score opaque.', bg: 'bg-status-goodBg', fg: 'text-status-good' },
              { title: 'Vos données restent les vôtres', text: 'Chaque entreprise a son propre espace cloisonné. Aucune clé, aucun secret technique n\'est jamais exposé côté navigateur.', bg: 'bg-brand-100', fg: 'text-brand-700' },
              { title: 'Tarifs clairs', text: 'Pas de fonctionnalités cachées derrière un module payant surprise : ce que vous voyez dans l\'app, c\'est ce qui est facturé.', bg: 'bg-sunset-100', fg: 'text-sunset-600' },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 p-6">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                  <ShieldCheck className={s.fg} size={22} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-t border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Conçu pour la location, utile bien au-delà</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-500">
            LocaVision fait gagner du temps et de l'argent d'abord aux agences de location — mais aussi aux garages,
            aux flottes d'entreprise et à toute activité qui doit constater l'état d'un véhicule avant/après.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {[
              { icon: Car, label: 'Agences de location', bg: 'bg-brand-100', fg: 'text-brand-700' },
              { icon: Truck, label: 'Flottes utilitaires', bg: 'bg-teal-100', fg: 'text-teal-600' },
              { icon: Bike, label: 'Deux-roues & scooters', bg: 'bg-accent-100', fg: 'text-accent-700' },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-2 rounded-full ${s.bg} px-4 py-2 text-sm font-medium ${s.fg}`}>
                <s.icon size={18} /> {s.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API */}
      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:items-center">
          <div>
            <div className="flex items-center gap-2 text-brand-600">
              <Code2 size={22} />
              <span className="text-sm font-semibold uppercase tracking-wide">API-first</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Branchez LocaVision à votre CRM</h2>
            <p className="mt-3 text-sm text-slate-500">
              L'application web que vous utilisez consomme la même API publique que celle mise à disposition
              de votre entreprise. Une clé API par compte, un compteur d'appels visible côté administration.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border-l-4 border-teal-500 bg-slate-900 p-5 font-mono text-xs text-slate-200">
            <pre>{`curl -X POST https://api.locavision.app/v1/vehicles/VEHICLE_ID/inspections \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "photos": [...] }'

# → { "status": "green", "health_score": 9, "damages": [] }`}</pre>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-100 bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 py-14 text-center text-white">
        <h2 className="text-2xl font-bold">Envie d'ouvrir un compte entreprise ?</h2>
        <p className="mt-2 text-brand-100">L'équipe LocaVision crée votre accès et génère votre clé API.</p>
        <Button as="a" href="mailto:contact@locavision.app" size="lg" className="mt-6 bg-white text-brand-700 hover:bg-brand-50">
          Nous contacter
        </Button>
      </section>

      <footer className="space-y-2 py-8 text-center text-xs text-slate-400">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {LEGAL_LINKS.map(([id, label]) => (
            <Link key={id} to={`/legal/${id}`} className="hover:text-slate-600">{label}</Link>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} LocaVision</p>
      </footer>
    </div>
  )
}
