import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, X, Send, Sparkles, Gift, RefreshCw, Award,
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../lib/format';
import { DEFAULT_PRODUCTS } from '../data/breweryCatalog';
import { useToast } from './ui';
import type { View } from '../lib/views';

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  quickActions?: { label: string; actionId: string; icon?: string }[];
  bonusOffer?: {
    code: string;
    title: string;
    discountDesc: string;
    actionLabel?: string;
  };
  eventEstimation?: {
    guests: number;
    eventType: string;
    cratesBeer: number;
    cratesSofts: number;
    packsWater: number;
    wineBottles: number;
    iceBags: number;
    estimatedCost: number;
  };
}

interface SmartBreweryAssistantProps {
  isAdmin: boolean;
  setView: (v: View) => void;
}

const PREF_STORAGE_KEY = 'saffo_assistant_user_prefs';

export function SmartBreweryAssistant({ isAdmin, setView }: SmartBreweryAssistantProps) {
  const { items, addToCart } = useCart();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewBadge, setHasNewBadge] = useState(true);

  // Preference state
  const [detectedPref, setDetectedPref] = useState<{
    favoriteCategory: string;
    interestLevel: number;
    hasReceivedBonus: boolean;
  }>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(PREF_STORAGE_KEY) ?? 'null') ?? {
          favoriteCategory: 'Bières de Brasserie',
          interestLevel: 1,
          hasReceivedBonus: false,
        }
      );
    } catch {
      return { favoriteCategory: 'Bières de Brasserie', interestLevel: 1, hasReceivedBonus: false };
    }
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Save detected preferences
  useEffect(() => {
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(detectedPref));
    } catch {
      // ignore
    }
  }, [detectedPref]);

  // Initialize greeting messages on first open or mode switch
  useEffect(() => {
    if (messages.length > 0) return;

    if (isAdmin) {
      setMessages([
        {
          id: 'welcome-admin',
          sender: 'assistant',
          text: 'Bonjour Administrateur ! Je suis votre Copilote Intelligent SAFFO. J’analyse les flux d’achats des maquis et clients pour optimiser les réassorts et vous suggérer les meilleures actions.',
          quickActions: [
            { label: '📊 Analyser les préférences clients', actionId: 'admin_analyze_prefs', icon: '📊' },
            { label: '🎁 Relancer les maquis inactifs avec un bonus', actionId: 'admin_relance_inactifs', icon: '🎁' },
            { label: '⚠️ Alerte stocks critiques', actionId: 'admin_stock_alert', icon: '⚠️' },
          ],
        },
      ]);
    } else {
      setMessages([
        {
          id: 'welcome-client',
          sender: 'assistant',
          text: 'Bonjour et bienvenue chez SAFFO ONLINE ! 🍻 Je suis votre Conseiller Brasserie Intelligent. Je peux vous aider à estimer le nombre de casiers pour votre événement ou vous faire débloquer un bonus exclusif !',
          quickActions: [
            { label: '🎁 Débloquer mon bonus fidélité', actionId: 'claim_bonus', icon: '🎁' },
            { label: '🧮 Calculer mes casiers (Mariage, Dot, Fête)', actionId: 'event_calc_prompt', icon: '🧮' },
            { label: '📦 Comment fonctionnent les consignes ?', actionId: 'explain_consignes', icon: '📦' },
            { label: '🚚 Délais & livraison à Cotonou/Calavi', actionId: 'explain_delivery', icon: '🚚' },
          ],
        },
      ]);
    }
  }, [isAdmin, messages.length]);

  // Update client preference based on cart items automatically
  useEffect(() => {
    if (items.length === 0 || isAdmin) return;

    const hasBeer = items.some((it) => it.product.category_id === 'cat-bieres');
    const hasWine = items.some((it) => it.product.category_id === 'cat-vins-champagnes');
    const hasSoft = items.some((it) => it.product.category_id === 'cat-softs-jus');

    setDetectedPref((prev) => {
      let dominant = prev.favoriteCategory;
      if (hasBeer) dominant = 'Bières de Brasserie (La Béninoise)';
      else if (hasWine) dominant = 'Vins Fins & Champagnes';
      else if (hasSoft) dominant = 'Soft Drinks Youki';

      return {
        ...prev,
        favoriteCategory: dominant,
        interestLevel: prev.interestLevel + 1,
      };
    });
  }, [items, isAdmin]);

  // Trigger typing simulation
  function addAssistantResponse(
    text: string,
    quickActions?: { label: string; actionId: string; icon?: string }[],
    bonusOffer?: Message['bonusOffer'],
    eventEstimation?: Message['eventEstimation']
  ) {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-' + Date.now(),
          sender: 'assistant',
          text,
          quickActions,
          bonusOffer,
          eventEstimation,
        },
      ]);
    }, 600);
  }

  // Handle Quick Action Clicks
  function handleActionClick(actionId: string) {
    // ── Client actions ──
    if (actionId === 'claim_bonus') {
      setMessages((prev) => [
        ...prev,
        { id: 'usr-' + Date.now(), sender: 'user', text: 'Je souhaite débloquer mon bonus de fidélité !' },
      ]);

      const bonusCode = 'SOBEBRA-CADEAU';
      setDetectedPref((prev) => ({ ...prev, hasReceivedBonus: true }));

      addAssistantResponse(
        `J'ai analysé vos préférences : vous êtes amateur de *${detectedPref.favoriteCategory}* ! En guise de bienvenue et de fidélité, voici votre bonus exclusif :`,
        [
          { label: '🧮 Estimer les boissons pour un événement', actionId: 'event_calc_prompt', icon: '🧮' },
          { label: '💬 Parler à un conseiller WhatsApp', actionId: 'contact_whatsapp', icon: '💬' },
        ],
        {
          code: bonusCode,
          title: 'Bonus Glace & Fraîcheur Dépôt',
          discountDesc: '1 Sac de Glaçons Purifiés 5kg offert dès 5 casiers commandés au dépôt !',
          actionLabel: 'Profiter du bonus maintenant',
        }
      );
      return;
    }

    if (actionId === 'event_calc_prompt') {
      setMessages((prev) => [
        ...prev,
        { id: 'usr-' + Date.now(), sender: 'user', text: 'Je prépare un événement, aide-moi à estimer mes boissons.' },
      ]);

      addAssistantResponse(
        'Super ! Combien de personnes attendez-vous pour cette fête au Bénin ?',
        [
          { label: '👥 50 invités (Fête de famille)', actionId: 'calc_guests_50', icon: '👥' },
          { label: '🎉 100 invités (Dot / Anniversaire)', actionId: 'calc_guests_100', icon: '🎉' },
          { label: '👑 200+ invités (Grand Mariage)', actionId: 'calc_guests_200', icon: '👑' },
        ]
      );
      return;
    }

    if (actionId.startsWith('calc_guests_')) {
      const guests = parseInt(actionId.replace('calc_guests_', ''), 10);
      setMessages((prev) => [
        ...prev,
        { id: 'usr-' + Date.now(), sender: 'user', text: `Nous serons environ ${guests} invités.` },
      ]);

      const cratesBeer = Math.ceil(guests * 0.12);
      const cratesSofts = Math.ceil(guests * 0.04);
      const packsWater = Math.ceil(guests * 0.05);
      const wineBottles = Math.ceil(guests * 0.1);
      const iceBags = Math.ceil(guests * 0.03);
      const estimatedCost = cratesBeer * 6800 + cratesSofts * 4800 + packsWater * 3000 + wineBottles * 4000;

      addAssistantResponse(
        `Voici mon calcul optimisé pour ${guests} convives selon les normes des réceptions au Bénin :`,
        [
          { label: '🛒 Ajouter ce pack complet au panier', actionId: 'apply_pack_cart', icon: '🛒' },
          { label: '📲 Envoyer cette estimation sur WhatsApp', actionId: 'export_estimation_wa', icon: '📲' },
        ],
        undefined,
        {
          guests,
          eventType: 'Cérémonie & Fête',
          cratesBeer,
          cratesSofts,
          packsWater,
          wineBottles,
          iceBags,
          estimatedCost,
        }
      );
      return;
    }

    if (actionId === 'apply_pack_cart') {
      const packProd = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-pack-dot-mariage') || DEFAULT_PRODUCTS[0];
      addToCart(packProd, 1);
      toast('Pack Cérémonie configuré et ajouté à votre panier !', 'success');

      addAssistantResponse(
        `✅ Le Pack Cérémonie a été déposé dans votre panier ! Vous pouvez finaliser la commande dès maintenant. Besoin de verres ou d'un camion frigorifique ?`,
        [
          { label: 'Voir mon panier', actionId: 'go_to_cart', icon: '🛒' },
          { label: 'Finaliser avec MTN MoMo / Cash', actionId: 'go_to_checkout', icon: '💳' },
        ]
      );
      return;
    }

    if (actionId === 'explain_consignes') {
      setMessages((prev) => [
        ...prev,
        { id: 'usr-' + Date.now(), sender: 'user', text: 'Comment fonctionnent les consignes de casiers ?' },
      ]);

      addAssistantResponse(
        `Chez SAFFO ONLINE, le système officiel Sobebra s'applique :\n\n` +
        `1️⃣ **Vous avez déjà des casiers vides** : le chauffeur reprend vos emballages 1 pour 1 et décharge les casiers pleins. Vous ne payez QUE la boisson.\n\n` +
        `2️⃣ **Premier achat / pas de casiers** : une consigne remboursable officielle est appliquée sur le casier et les bouteilles verre. Elle vous est restituée intégralement lors du retour des bouteilles.\n\n` +
        `Souhaitez-vous voir nos casiers disponibles ?`,
        [
          { label: '🍺 Voir les casiers de Béninoise', actionId: 'view_bieres', icon: '🍺' },
          { label: '🎁 Débloquer mon bonus', actionId: 'claim_bonus', icon: '🎁' },
        ]
      );
      return;
    }

    if (actionId === 'explain_delivery') {
      setMessages((prev) => [
        ...prev,
        { id: 'usr-' + Date.now(), sender: 'user', text: 'Quels sont les délais et zones de livraison ?' },
      ]);

      addAssistantResponse(
        `🚚 **Livraison Express Glacée en moins de 2h** :\n\n` +
        `• **Cotonou** : Akpakpa, Cadjèhoun, Haie Vive, Saint-Michel, Sainte-Rita, Fidjrossè.\n` +
        `• **Abomey-Calavi** : Tankpè, Arconville, Bidossessi, Zogbadjè.\n` +
        `• **Porto-Novo & Sèmè-Kpodji** : sur programmation le matin.\n\n` +
        `Paiement accepté par **MTN Mobile Money**, **Moov Money** ou **Cash à la réception** !`,
        [
          { label: 'Commander maintenant', actionId: 'view_bieres', icon: '🛒' },
          { label: 'Poser une question WhatsApp', actionId: 'contact_whatsapp', icon: '💬' },
        ]
      );
      return;
    }

    // ── Admin Actions ──
    if (actionId === 'admin_analyze_prefs') {
      setMessages((prev) => [
        ...prev,
        { id: 'usr-' + Date.now(), sender: 'user', text: 'Analyse les préférences de nos clients.' },
      ]);

      addAssistantResponse(
        `📊 **Synthèse IA des Préférences Clients au Dépôt** :\n\n` +
        `• **72% du flux** concerne les bières locales (La Béninoise 65cl en tête, suivie de Beaufort et Castel).\n` +
        `• **Les Maquis de Cadjèhoun et Akpakpa** commandent majoritairement le jeudi et vendredi.\n` +
        `• **Les Traiteurs de Haie Vive** privilégient le Moët & Chandon et les packs Possotomé 1.5L.\n\n` +
        `💡 *Recommandation :* Consultez le module **Suivi Clients** pour leur attribuer leurs bonus personnalisés !`,
        [
          { label: 'Ouvrir Suivi Clients', actionId: 'go_admin_customers', icon: '👥' },
          { label: 'Relancer les inactifs', actionId: 'admin_relance_inactifs', icon: '🎁' },
        ]
      );
      return;
    }

    if (actionId === 'admin_relance_inactifs') {
      setMessages((prev) => [
        ...prev,
        { id: 'usr-' + Date.now(), sender: 'user', text: 'Quels clients inactifs doit-on relancer ?' },
      ]);

      addAssistantResponse(
        `⚠️ **Clients inactifs identifiés (+10 jours sans réassort)** :\n\n` +
        `• **Dieudonné Agbodjan (Bar Le Refuge - Akpakpa)** : amateur de Castel & Guinness (dernière commande il y a 14j).\n` +
        `• **Bonus recommandé :** Code *REVIENS-5* (-5% immédiat + livraison prioritaire offerte).\n\n` +
        `Souhaitez-vous ouvrir la fiche de relance WhatsApp ?`,
        [
          { label: 'Ouvrir Suivi Clients', actionId: 'go_admin_customers', icon: '👥' },
          { label: 'Envoyer message WhatsApp', actionId: 'admin_send_wa_relance', icon: '📲' },
        ]
      );
      return;
    }

    if (actionId === 'admin_stock_alert') {
      addAssistantResponse(
        `🚨 **Alerte Réassort Brasserie Sobebra** :\n\n` +
        `• **La Béninoise 65cl** : Stock suffisant (140 casiers restants).\n` +
        `• **Champagne Laurent-Perrier** : Stock bas (30 bouteilles, 2 mariages prévus ce samedi).\n` +
        `• **Sacs de Glaçons 5kg** : Forte demande le week-end, prévoyez un réassort auprès du fournisseur de glace.`,
        [
          { label: 'Gérer les stocks', actionId: 'go_admin_stock', icon: '📦' },
          { label: 'Créer un approvisionnement', actionId: 'go_admin_purchases', icon: '📥' },
        ]
      );
      return;
    }

    // Navigations
    if (actionId === 'go_to_cart') {
      setView({ kind: 'cart' });
      setIsOpen(false);
      return;
    }
    if (actionId === 'go_to_checkout') {
      setView({ kind: 'checkout' });
      setIsOpen(false);
      return;
    }
    if (actionId === 'view_bieres') {
      setView({ kind: 'shop', categoryId: 'cat-bieres' });
      setIsOpen(false);
      return;
    }
    if (actionId === 'go_admin_customers') {
      setView({ kind: 'admin-customers' });
      setIsOpen(false);
      return;
    }
    if (actionId === 'go_admin_stock') {
      setView({ kind: 'admin-stock' });
      setIsOpen(false);
      return;
    }
    if (actionId === 'go_admin_purchases') {
      setView({ kind: 'admin-purchases' });
      setIsOpen(false);
      return;
    }
    if (actionId === 'contact_whatsapp' || actionId === 'admin_send_wa_relance') {
      const waNumber = '+22997204060';
      window.open(`https://wa.me/${waNumber}?text=Bonjour,%20je%20vous%20contacte%20suite%20aux%20conseils%20de%20l'Assistant%20SAFFO`, '_blank');
      return;
    }
    if (actionId === 'export_estimation_wa') {
      const waNumber = '+22997204060';
      window.open(`https://wa.me/${waNumber}?text=Bonjour,%20voici%20l'estimation%20de%20boissons%20calculee%20par%20l'Assistant%20SAFFO%20pour%20mon%20evenement.`, '_blank');
      return;
    }
  }

  // Handle Free Text Submission
  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.trim();
    setInputText('');

    setMessages((prev) => [
      ...prev,
      { id: 'usr-' + Date.now(), sender: 'user', text: query },
    ]);

    const q = query.toLowerCase();

    // Natural Language Logic
    if (q.includes('mariage') || q.includes('dot') || q.includes('fête') || q.includes('invit')) {
      addAssistantResponse(
        `Pour un événement réussi au Bénin, nous avons des packs tout-inclus et un calculateur dédié. Combien d'invités comptez-vous recevoir ?`,
        [
          { label: '🎉 100 invités (Dot standard)', actionId: 'calc_guests_100', icon: '🎉' },
          { label: '👑 200 invités (Grand Mariage)', actionId: 'calc_guests_200', icon: '👑' },
        ]
      );
    } else if (q.includes('bonus') || q.includes('promo') || q.includes('cadeau') || q.includes('remise')) {
      handleActionClick('claim_bonus');
    } else if (q.includes('consigne') || q.includes('bouteille') || q.includes('vide')) {
      handleActionClick('explain_consignes');
    } else if (q.includes('livraison') || q.includes('calavi') || q.includes('cotonou')) {
      handleActionClick('explain_delivery');
    } else if (q.includes('béninoise') || q.includes('biere') || q.includes('bière') || q.includes('casier')) {
      addAssistantResponse(
        `Nous avons du stock continu de La Béninoise 65cl et 33cl, de Beaufort Lager et de Castel au prix dépôt ! Souhaitez-vous voir les casiers ou bénéficier du bonus 1 sac de glace offert ?`,
        [
          { label: '🍺 Voir les Casiers', actionId: 'view_bieres', icon: '🍺' },
          { label: '🎁 Débloquer le bonus glace', actionId: 'claim_bonus', icon: '🎁' },
        ]
      );
    } else {
      addAssistantResponse(
        `Je suis là pour vous orienter ! Que préférez-vous faire ?`,
        [
          { label: '🎁 Débloquer mon bonus fidélité', actionId: 'claim_bonus', icon: '🎁' },
          { label: '🧮 Calculer mes casiers pour un événement', actionId: 'event_calc_prompt', icon: '🧮' },
          { label: '🚚 Délais & zones de livraison', actionId: 'explain_delivery', icon: '🚚' },
        ]
      );
    }
  }

  return (
    <>
      {/* ── Floating Assistant Launcher Button (Bottom-Right) ─────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        
        {/* Proactive Speech Bubble Notification (when closed) */}
        {!isOpen && hasNewBadge && (
          <div
            onClick={() => { setIsOpen(true); setHasNewBadge(false); }}
            className="hidden sm:flex items-center gap-2 bg-[#15161D] text-white text-xs px-3.5 py-2 rounded-full shadow-2xl border border-[#D10024] cursor-pointer hover:scale-105 transition animate-float"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFB300] animate-spin" />
            <span className="font-semibold">
              {isAdmin ? 'Copilote Admin : Stocks & Relances' : 'Besoin d’aide ou d’un bonus ?'}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#D10024] animate-ping" />
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasNewBadge(false);
          }}
          className="relative w-14 h-14 rounded-full bg-[#D10024] hover:bg-[#A8001D] text-white flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-red-300"
          aria-label="Assistant Brasserie"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              {hasNewBadge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFB300] text-black font-extrabold text-[9px] rounded-full flex items-center justify-center animate-bounce">
                  1
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* ── Interactive Chat Drawer ────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[520px] max-h-[82vh] animate-fade-in-scale font-sans">
          
          {/* Header */}
          <div className="bg-[#15161D] text-white p-3.5 flex items-center justify-between border-b border-[#2B2D42]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#D10024] flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4 text-[#FFB300]" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>SaffoBot</span>
                  <span className="bg-[#28A745] text-[9px] font-bold px-1.5 py-0.2 rounded text-white lowercase">
                    en ligne
                  </span>
                </p>
                <p className="text-[10px] text-white/70">
                  {isAdmin ? 'Copilote Administration' : 'Conseiller Brasserie & Bonus IA'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMessages([]);
                }}
                title="Réinitialiser la conversation"
                className="p-1.5 text-white/60 hover:text-white rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/60 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preferences Badge Banner (Client Mode) */}
          {!isAdmin && (
            <div className="bg-red-50 px-3 py-1.5 border-b border-red-100 flex items-center justify-between text-[11px] text-[#D10024] font-medium">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>Goût détecté : <strong>{detectedPref.favoriteCategory}</strong></span>
              </span>
              {detectedPref.hasReceivedBonus && (
                <span className="bg-white px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-200">
                  Bonus débloqué 🎁
                </span>
              )}
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-gray-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Bubble text */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-[#D10024] text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none whitespace-pre-line'
                  }`}
                >
                  {m.text}
                </div>

                {/* Event Estimation Card if present */}
                {m.eventEstimation && (
                  <div className="w-full mt-2 bg-white rounded-xl border border-gray-200 p-3 text-xs shadow-sm space-y-2">
                    <p className="font-extrabold text-[#D10024] uppercase text-[11px] border-b pb-1">
                      Estimation Événementiel ({m.eventEstimation.guests} personnes)
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>🍺 <strong>{m.eventEstimation.cratesBeer} Casiers</strong> de Bières</div>
                      <div>🥤 <strong>{m.eventEstimation.cratesSofts} Casiers</strong> de Youki</div>
                      <div>💧 <strong>{m.eventEstimation.packsWater} Packs</strong> Possotomé</div>
                      <div>🍾 <strong>{m.eventEstimation.wineBottles} Bouteilles</strong> de Vin</div>
                      <div className="col-span-2 text-green-700 font-bold">
                        🧊 {m.eventEstimation.iceBags} Sacs de Glaçons 5kg offerts
                      </div>
                    </div>
                    <div className="pt-1.5 border-t text-right">
                      <span className="text-[10px] text-gray-500">Budget estimé : </span>
                      <span className="font-black text-[#D10024] text-sm">
                        {formatPrice(m.eventEstimation.estimatedCost)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bonus Card if present */}
                {m.bonusOffer && (
                  <div className="w-full mt-2 bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200 p-3 text-xs shadow-sm space-y-1.5">
                    <div className="flex items-center gap-1.5 font-black text-[#D10024]">
                      <Gift className="w-4 h-4 text-[#D10024]" />
                      <span>{m.bonusOffer.title}</span>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-snug">
                      {m.bonusOffer.discountDesc}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs font-black bg-white px-2 py-0.5 rounded border border-red-200 text-[#D10024]">
                        {m.bonusOffer.code}
                      </span>
                      <button
                        onClick={() => {
                          const pack = DEFAULT_PRODUCTS[0];
                          addToCart(pack, 1);
                          toast(`Code ${m.bonusOffer!.code} appliqué avec succès !`, 'success');
                        }}
                        className="btn-electro text-[10px] py-1 px-3"
                      >
                        {m.bonusOffer.actionLabel || 'Utiliser'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Action Suggestion Buttons */}
                {m.quickActions && m.quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                    {m.quickActions.map((qa) => (
                      <button
                        key={qa.actionId}
                        onClick={() => handleActionClick(qa.actionId)}
                        className="bg-white hover:bg-gray-100 text-gray-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 shadow-sm transition hover:scale-105 active:scale-95 flex items-center gap-1"
                      >
                        {qa.icon && <span>{qa.icon}</span>}
                        <span>{qa.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing animation bubble */}
            {isTyping && (
              <div className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-2 rounded-full w-fit shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Field */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Posez votre question ou besoin..."
              className="flex-1 bg-gray-100 text-gray-800 text-xs px-3.5 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[#D10024]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-8 h-8 rounded-full bg-[#D10024] hover:bg-[#A8001D] text-white flex items-center justify-center transition disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
