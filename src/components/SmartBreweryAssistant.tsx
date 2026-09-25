import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, X, Send, Sparkles, Gift, RefreshCw, Award,
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatPrice } from '../lib/format';
import { DEFAULT_PRODUCTS } from '../data/breweryCatalog';
import type { PackBreakdownItem } from '../lib/database.types';
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
    breakdown: PackBreakdownItem[];
  };
}

interface SmartBreweryAssistantProps {
  isAdmin: boolean;
  setView: (v: View) => void;
}

const PREF_STORAGE_KEY = 'saffo_assistant_user_prefs';

function computeEventBreakdown(guests: number, eventType = 'Dot & Mariage') {
  const safeGuests = Math.max(10, Math.min(2000, guests));
  const cratesBeer = Math.max(2, Math.ceil(safeGuests * 0.12));
  const cratesSofts = Math.max(1, Math.ceil(safeGuests * 0.04));
  const packsWater = Math.max(1, Math.ceil(safeGuests * 0.05));
  const wineBottles = Math.max(2, Math.ceil(safeGuests * 0.10));
  const iceBags = Math.max(1, Math.ceil(safeGuests * 0.03));
  const estimatedCost = cratesBeer * 6800 + cratesSofts * 4800 + packsWater * 3000 + wineBottles * 4500;

  const breakdown: PackBreakdownItem[] = [
    {
      icon: '🍺',
      name: 'La Béninoise 65cl (Bouteilles verre consignées)',
      quantity: cratesBeer,
      unit: `${cratesBeer} casiers (${cratesBeer * 24} bouteilles)`,
      note: 'Glacé',
    },
    {
      icon: '🥤',
      name: 'Youki Cocktail & Pamplemousse 50cl',
      quantity: cratesSofts,
      unit: `${cratesSofts} casiers (${cratesSofts * 24} bouteilles)`,
    },
    {
      icon: '💧',
      name: 'Eau Minérale Naturelle Possotomé 1.5L',
      quantity: packsWater,
      unit: `${packsWater} packs (${packsWater * 6} bouteilles)`,
    },
    {
      icon: '🍾',
      name: 'Baron de Lestac Bordeaux Supérieur 75cl',
      quantity: wineBottles,
      unit: `${wineBottles} bouteilles`,
    },
    {
      icon: '🧊',
      name: 'Sacs de Glaçons Alimentaires Purifiés 5kg',
      quantity: iceBags,
      unit: `${iceBags} sacs de 5kg`,
      note: 'OFFERT par SAFFO',
    },
  ];

  return {
    guests: safeGuests,
    eventType,
    cratesBeer,
    cratesSofts,
    packsWater,
    wineBottles,
    iceBags,
    estimatedCost,
    breakdown,
  };
}

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
        { id: 'usr-' + Date.now(), sender: 'user', text: `Nous serons environ ${guests} invités pour notre événement.` },
      ]);

      const estimation = computeEventBreakdown(guests, 'Dot & Mariage');

      addAssistantResponse(
        `Voici ma proposition détaillée de boissons pour ${guests} convives. Chaque quantité a été calculée selon les standards des réceptions au Bénin :\n\n` +
        `• 🍺 **${estimation.cratesBeer} Casiers** de La Béninoise 65cl (${estimation.cratesBeer * 24} bouteilles)\n` +
        `• 🥤 **${estimation.cratesSofts} Casiers** de Youki Cocktail & Pamplemousse (${estimation.cratesSofts * 24} bouteilles)\n` +
        `• 💧 **${estimation.packsWater} Packs** d'Eau Minérale Possotomé 1.5L (${estimation.packsWater * 6} bouteilles)\n` +
        `• 🍾 **${estimation.wineBottles} Bouteilles** de Vin Baron de Lestac Bordeaux Supérieur\n` +
        `• 🧊 **${estimation.iceBags} Sacs de Glaçons Purifiés 5kg (OFFERT par SAFFO)**\n\n` +
        `Comment souhaitez-vous ajouter cette proposition à votre commande ?`,
        [
          { label: '📦 Ajouter le Pack Dot & Mariage (liste détaillée)', actionId: `apply_pack_cart_${guests}`, icon: '📦' },
          { label: '📋 Ajouter chaque boisson en lignes séparées', actionId: `apply_individual_${guests}`, icon: '📋' },
          { label: '📲 Exporter l’estimation sur WhatsApp', actionId: `export_estimation_wa_${guests}`, icon: '📲' },
        ],
        undefined,
        estimation
      );
      return;
    }

    if (actionId.startsWith('apply_pack_cart_')) {
      const guests = parseInt(actionId.replace('apply_pack_cart_', ''), 10);
      const estimation = computeEventBreakdown(guests, 'Dot & Mariage');
      const packProd = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-pack-dot-mariage') || DEFAULT_PRODUCTS[0];

      addToCart(packProd, 1, {
        packBreakdown: estimation.breakdown,
        eventGuests: guests,
        eventType: 'Dot & Mariage',
        customTitle: `Pack Cérémonie Dot & Mariage (${guests} convives — Proposition Chatbot)`,
        priceModifier: estimation.estimatedCost - packProd.price,
      });

      toast(`Pack Dot & Mariage (${guests} convives) ajouté avec sa liste détaillée dans votre panier !`, 'success');

      addAssistantResponse(
        `✅ Le **Pack Cérémonie Dot & Mariage (${guests} convives)** est maintenant exactement listé dans votre panier avec la composition détaillée de la proposition :\n\n` +
        `• 🍺 **${estimation.cratesBeer} Casiers** La Béninoise 65cl\n` +
        `• 🥤 **${estimation.cratesSofts} Casiers** Youki Cocktail & Pamplemousse\n` +
        `• 💧 **${estimation.packsWater} Packs** Eau Minérale Possotomé 1.5L\n` +
        `• 🍾 **${estimation.wineBottles} Bouteilles** Vin Supérieur Baron de Lestac\n` +
        `• 🧊 **${estimation.iceBags} Sacs de Glaçons 5kg** (Offerts)\n\n` +
        `Consultez dès à présent votre panier pour vérifier le récapitulatif !`,
        [
          { label: '🛒 Voir mon Panier', actionId: 'go_to_cart', icon: '🛒' },
          { label: '💳 Passer au Paiement (MoMo / Cash)', actionId: 'go_to_checkout', icon: '💳' },
        ]
      );
      return;
    }

    if (actionId.startsWith('apply_individual_')) {
      const guests = parseInt(actionId.replace('apply_individual_', ''), 10);
      const estimation = computeEventBreakdown(guests, 'Dot & Mariage');

      const pBeer = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-beninoise-65') || DEFAULT_PRODUCTS[0];
      const pSoft = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-youki-cocktail') || DEFAULT_PRODUCTS[3];
      const pWater = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-eau-possotome-15') || DEFAULT_PRODUCTS[5];
      const pWine = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-baron-lestac') || DEFAULT_PRODUCTS[4];
      const pIce = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-glacons-5kg');

      addToCart(pBeer, estimation.cratesBeer, { optionLabel: `Proposition Événement (${guests} convives)` });
      addToCart(pSoft, estimation.cratesSofts, { optionLabel: `Proposition Événement (${guests} convives)` });
      addToCart(pWater, estimation.packsWater, { optionLabel: `Proposition Événement (${guests} convives)` });
      addToCart(pWine, estimation.wineBottles, { optionLabel: `Proposition Événement (${guests} convives)` });
      if (pIce) {
        addToCart(pIce, estimation.iceBags, {
          optionLabel: `Glaçons Offerts (${guests} convives)`,
          priceModifier: -pIce.price,
        });
      }

      toast(`Les boissons de la proposition (${guests} convives) ont été listées dans votre panier !`, 'success');

      addAssistantResponse(
        `✅ Toutes les boissons de la proposition ont été exactement listées en articles individuels dans votre panier :\n\n` +
        `• 🍺 **${estimation.cratesBeer} ×** Casiers de La Béninoise 65cl\n` +
        `• 🥤 **${estimation.cratesSofts} ×** Casiers de Youki Cocktail\n` +
        `• 💧 **${estimation.packsWater} ×** Packs d'Eau Minérale Possotomé 1.5L\n` +
        `• 🍾 **${estimation.wineBottles} ×** Bouteilles de Vin Baron de Lestac\n` +
        `• 🧊 **${estimation.iceBags} ×** Sacs de Glaçons Purifiés 5kg (OFFERT)\n\n` +
        `Vous pouvez modifier les quantités ou valider votre commande.`,
        [
          { label: '🛒 Voir mon Panier', actionId: 'go_to_cart', icon: '🛒' },
          { label: '💳 Passer au Paiement', actionId: 'go_to_checkout', icon: '💳' },
        ]
      );
      return;
    }

    if (actionId === 'apply_pack_cart') {
      const estimation = computeEventBreakdown(100, 'Dot & Mariage');
      const packProd = DEFAULT_PRODUCTS.find((p) => p.id === 'prod-pack-dot-mariage') || DEFAULT_PRODUCTS[0];
      addToCart(packProd, 1, {
        packBreakdown: estimation.breakdown,
        eventGuests: 100,
        eventType: 'Dot & Mariage',
        customTitle: 'Pack Cérémonie Dot & Mariage (100 convives — Proposition Chatbot)',
      });
      toast('Pack Cérémonie configuré et listé dans votre panier !', 'success');

      addAssistantResponse(
        `✅ Le Pack Cérémonie Dot & Mariage a été déposé dans votre panier avec la liste exacte des boissons !`,
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
    if (actionId.startsWith('export_estimation_wa')) {
      const waNumber = '+22997204060';
      const guests = parseInt(actionId.replace('export_estimation_wa_', ''), 10) || 100;
      const est = computeEventBreakdown(guests, 'Dot & Mariage');
      const text = `Bonjour SAFFO ONLINE ! Voici l'estimation calculée par le Chatbot pour mon événement (${guests} invités) :\n` +
        `• ${est.cratesBeer} Casiers de Béninoise 65cl\n` +
        `• ${est.cratesSofts} Casiers de Youki Cocktail\n` +
        `• ${est.packsWater} Packs d'Eau Possotomé 1.5L\n` +
        `• ${est.wineBottles} Bouteilles de Vin Baron de Lestac\n` +
        `• ${est.iceBags} Sacs de Glaçons 5kg (Offerts)\n` +
        `Budget estimé : ${formatPrice(est.estimatedCost)}. Pouvez-vous me confirmer la disponibilité ?`;
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, '_blank');
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
    const guestMatch = q.match(/(\d{2,4})\s*(personnes?|invit[ée]s?|convives?|invites?|gens)?/);
    if (guestMatch) {
      const customGuests = parseInt(guestMatch[1], 10);
      if (customGuests >= 15 && customGuests <= 3000) {
        const est = computeEventBreakdown(customGuests, q.includes('dot') ? 'Dot traditionnelle' : q.includes('mariage') ? 'Grand Mariage' : 'Cérémonie & Fête');
        addAssistantResponse(
          `Voici mon calcul optimisé et la proposition exacte de boissons pour ${customGuests} convives (${est.eventType}) :\n\n` +
          `• 🍺 **${est.cratesBeer} Casiers** de La Béninoise 65cl (${est.cratesBeer * 24} bouteilles)\n` +
          `• 🥤 **${est.cratesSofts} Casiers** de Youki Cocktail & Pamplemousse (${est.cratesSofts * 24} bouteilles)\n` +
          `• 💧 **${est.packsWater} Packs** d'Eau Minérale Possotomé 1.5L (${est.packsWater * 6} bouteilles)\n` +
          `• 🍾 **${est.wineBottles} Bouteilles** de Vin Baron de Lestac / Supérieur\n` +
          `• 🧊 **${est.iceBags} Sacs de Glaçons Purifiés 5kg (OFFERT par SAFFO)**\n\n` +
          `Comment souhaitez-vous ajouter cette proposition dans votre panier ?`,
          [
            { label: '📦 Ajouter le Pack Dot & Mariage (liste détaillée)', actionId: `apply_pack_cart_${customGuests}`, icon: '📦' },
            { label: '📋 Ajouter chaque boisson en articles séparés', actionId: `apply_individual_${customGuests}`, icon: '📋' },
            { label: '📲 Exporter l’estimation sur WhatsApp', actionId: `export_estimation_wa_${customGuests}`, icon: '📲' },
          ],
          undefined,
          est
        );
        return;
      }
    }

    if (q.includes('mariage') || q.includes('dot') || q.includes('fête') || q.includes('cérémonie') || q.includes('ceremonie')) {
      addAssistantResponse(
        `Pour un événement réussi au Bénin, nous avons des packs tout-inclus et un calculateur dédié. Combien d'invités comptez-vous recevoir ?`,
        [
          { label: '👥 50 invités (Fête de famille)', actionId: 'calc_guests_50', icon: '👥' },
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
                  <div className="w-full mt-2 bg-white rounded-xl border border-red-200 p-3 text-xs shadow-md space-y-2.5">
                    <div className="flex items-center justify-between border-b pb-1.5 border-gray-100">
                      <p className="font-extrabold text-[#D10024] uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#FFB300]" />
                        <span>Proposition {m.eventEstimation.eventType} ({m.eventEstimation.guests} convives)</span>
                      </p>
                      <span className="text-[9px] bg-red-100 text-[#D10024] font-bold px-1.5 py-0.5 rounded">
                        Brasserie SAFFO
                      </span>
                    </div>

                    <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-[11px]">
                      {m.eventEstimation.breakdown.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-1 text-gray-800">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>{item.icon}</span>
                            <span className="font-bold text-gray-900">{item.quantity} ×</span>
                            <span>{item.name}</span>
                          </span>
                          <span className="text-gray-500 text-[10px] whitespace-nowrap">
                            {item.note ? (
                              <strong className="text-green-700 bg-green-50 px-1 py-0.2 rounded border border-green-200">
                                {item.note}
                              </strong>
                            ) : (
                              item.unit
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Budget estimé boissons :</span>
                        <span className="font-black text-[#D10024] text-sm">
                          {formatPrice(m.eventEstimation.estimatedCost)}
                        </span>
                      </div>
                      <div className="text-right text-[10px] text-gray-500">
                        <span>Livraison glacée sous 2h</span>
                      </div>
                    </div>

                    {/* Quick Add Buttons on Card */}
                    <div className="pt-1 flex flex-col gap-1.5">
                      <button
                        onClick={() => handleActionClick(`apply_pack_cart_${m.eventEstimation!.guests}`)}
                        className="w-full bg-[#D10024] hover:bg-[#A8001D] text-white py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                      >
                        <span>📦 Ajouter le Pack Dot & Mariage au panier</span>
                      </button>
                      <button
                        onClick={() => handleActionClick(`apply_individual_${m.eventEstimation!.guests}`)}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-3 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 active:scale-98"
                      >
                        <span>📋 Ajouter chaque boisson en lignes séparées</span>
                      </button>
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
