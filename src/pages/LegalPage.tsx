import { ArrowLeft, FileText, Scale } from 'lucide-react';
import { useStoreSettings } from '../contexts/StoreSettingsContext';
import type { View } from '../lib/views';

interface LegalPageProps {
  kind: 'legal' | 'terms';
  setView: (v: View) => void;
}

export function LegalPage({ kind, setView }: LegalPageProps) {
  const { settings } = useStoreSettings();

  const isLegal = kind === 'legal';
  const title = isLegal ? 'Mentions légales' : "Conditions d'utilisation";
  const content = isLegal ? settings.legal_mentions : settings.terms_of_use;

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
      <button onClick={() => setView({ kind: 'shop' })} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />Retour à la boutique
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          {isLegal
            ? <Scale className="w-5 h-5 text-brand-primary" />
            : <FileText className="w-5 h-5 text-brand-primary" />
          }
        </div>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{title}</h1>
          <p className="text-sm text-brand-muted">{settings.company_name || settings.store_name}</p>
        </div>
      </div>

      <div className="card p-6 lg:p-8">
        {content ? (
          <div className="prose prose-sm max-w-none text-brand-dark leading-relaxed whitespace-pre-line">
            {content}
          </div>
        ) : (
          <div className="text-center py-12 text-brand-muted">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Contenu non disponible</p>
            <p className="text-sm mt-1">Cette page sera complétée prochainement.</p>
          </div>
        )}
      </div>
    </div>
  );
}
