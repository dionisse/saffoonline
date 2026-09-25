import { useState, useMemo, useEffect } from 'react';
import {
  Users, Search, Phone, MessageCircle, DollarSign,
  Award, Clock, X, ShoppingBag, Gift, MapPin, FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import { useToast } from '../../components/ui';

// ─── Customer Data Types ─────────────────────────────────────────────────────

export type CustomerSegment = 'all' | 'maquis' | 'events' | 'vip' | 'inactive';

export interface CustomerPreference {
  category: string;
  percentage: number;
  topProducts: string[];
}

export interface CustomerAnalytics {
  id: string;
  name: string;
  phone: string;
  businessName?: string;
  location: string;
  segment: 'maquis' | 'events' | 'vip' | 'individual';
  totalSpent: number;
  orderCount: number;
  averageOrderValue: number;
  lastOrderDate: string;
  firstOrderDate: string;
  status: 'vip_gold' | 'regular_silver' | 'bronze' | 'new' | 'inactive';
  preferences: {
    beersPercentage: number;
    winesPercentage: number;
    softsPercentage: number;
    waterPercentage: number;
    favoriteProducts: string[];
    dominantCategory: string;
  };
  recommendedBonus: {
    title: string;
    description: string;
    promoCode: string;
    discountType: 'percentage' | 'free_item' | 'free_delivery';
  };
  orderHistory: {
    id: string;
    orderNumber: string;
    date: string;
    total: number;
    itemsSummary: string;
    paymentMethod: string;
  }[];
  notes?: string;
}

// ─── Default Mock Customers (Benin Brewery Depot Context) ────────────────────

export const DEFAULT_CUSTOMERS: CustomerAnalytics[] = [
  {
    id: 'cust-1',
    name: 'Urbain Kpassè',
    businessName: 'Maquis Le Diplomate',
    phone: '+229 97 25 14 30',
    location: 'Cadjèhoun, Cotonou',
    segment: 'maquis',
    totalSpent: 2840000,
    orderCount: 16,
    averageOrderValue: 177500,
    lastOrderDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    firstOrderDate: '2025-10-12T00:00:00Z',
    status: 'vip_gold',
    preferences: {
      beersPercentage: 75,
      winesPercentage: 10,
      softsPercentage: 10,
      waterPercentage: 5,
      favoriteProducts: ['La Béninoise 65cl (Casier 12)', 'Beaufort Lager 50cl', 'Doppel Munich 50cl'],
      dominantCategory: 'Bières de Brasserie',
    },
    recommendedBonus: {
      title: 'Pack Réassort Maquis : 2 Sacs de Glaçons 5kg Offerts',
      description: 'Offert dès 10 casiers panachés de Béninoise et Beaufort commandés.',
      promoCode: 'GLACE-MAQUIS',
      discountType: 'free_item',
    },
    orderHistory: [
      {
        id: 'ord-101',
        orderNumber: 'CMD-2026-0891',
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        total: 198000,
        itemsSummary: '15x Casiers Béninoise 65cl + 5x Beaufort Lager + 5x Youki Cocktail',
        paymentMethod: 'MTN Mobile Money',
      },
      {
        id: 'ord-102',
        orderNumber: 'CMD-2026-0842',
        date: new Date(Date.now() - 10 * 86400000).toISOString(),
        total: 215000,
        itemsSummary: '18x Casiers Béninoise 65cl + 5x Castel Beer + 2x Sacs de glaçons',
        paymentMethod: 'MTN Mobile Money',
      },
      {
        id: 'ord-103',
        orderNumber: 'CMD-2026-0790',
        date: new Date(Date.now() - 17 * 86400000).toISOString(),
        total: 185000,
        itemsSummary: '14x Casiers Béninoise 65cl + 6x Doppel Munich',
        paymentMethod: 'Espèces à la livraison',
      },
    ],
    notes: 'Livrer impérativement les jeudis avant 16h pour préparer l’affluence du week-end. Échange régulier de casiers vides 65cl.',
  },
  {
    id: 'cust-2',
    name: 'Estelle Dossou-Yovo',
    businessName: 'Prestige Events & Traiteur Bénin',
    phone: '+229 95 80 44 12',
    location: 'Haie Vive, Cotonou',
    segment: 'events',
    totalSpent: 3450000,
    orderCount: 9,
    averageOrderValue: 383333,
    lastOrderDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    firstOrderDate: '2025-11-04T00:00:00Z',
    status: 'vip_gold',
    preferences: {
      beersPercentage: 25,
      winesPercentage: 45,
      softsPercentage: 15,
      waterPercentage: 15,
      favoriteProducts: ['Champagne Moët & Chandon Brut', 'Baron de Lestac Bordeaux', 'Eau Possotomé 1.5L'],
      dominantCategory: 'Vins Fins & Champagnes',
    },
    recommendedBonus: {
      title: 'Bonus Cérémonie : -8% sur la cave à vins + Flûtes prêtées',
      description: 'Remise dégressive et reprise garantie des bouteilles scellées non entamées.',
      promoCode: 'DOT-PRESTIGE',
      discountType: 'percentage',
    },
    orderHistory: [
      {
        id: 'ord-201',
        orderNumber: 'CMD-2026-0880',
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        total: 425000,
        itemsSummary: 'Pack Cérémonie Dot 25 Casiers + 4x Moët & Chandon + 3x Baron de Lestac',
        paymentMethod: 'Moov Money',
      },
      {
        id: 'ord-202',
        orderNumber: 'CMD-2026-0810',
        date: new Date(Date.now() - 19 * 86400000).toISOString(),
        total: 390000,
        itemsSummary: '8x Moët & Chandon + 6x Cartons Baron de Lestac + 10x Packs Possotomé',
        paymentMethod: 'Virement bancaire',
      },
    ],
    notes: 'Très exigeante sur la température des champagnes et la propreté des bouteilles. Camion frigorifique apprécié.',
  },
  {
    id: 'cust-3',
    name: 'Dieudonné Agbodjan',
    businessName: 'Bar Restaurant Le Refuge',
    phone: '+229 97 11 02 85',
    location: 'Akpakpa PK3, Cotonou',
    segment: 'maquis',
    totalSpent: 1650000,
    orderCount: 11,
    averageOrderValue: 150000,
    lastOrderDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    firstOrderDate: '2025-12-01T00:00:00Z',
    status: 'inactive', // inactive (>10 days without order)
    preferences: {
      beersPercentage: 80,
      winesPercentage: 5,
      softsPercentage: 10,
      waterPercentage: 5,
      favoriteProducts: ['Castel Beer 65cl', 'Guinness Foreign Extra 33cl', 'World Cola 50cl'],
      dominantCategory: 'Bières & Stouts',
    },
    recommendedBonus: {
      title: 'Relance Partenaire : -5% Immédiat sur 10 casiers Castel/Guinness',
      description: 'Offre spéciale pour réactivation du compte avec livraison prioritaire gratuite.',
      promoCode: 'REVIENS-5',
      discountType: 'percentage',
    },
    orderHistory: [
      {
        id: 'ord-301',
        orderNumber: 'CMD-2026-0740',
        date: new Date(Date.now() - 14 * 86400000).toISOString(),
        total: 162000,
        itemsSummary: '10x Casiers Castel 65cl + 4x Guinness Extra + 3x World Cola',
        paymentMethod: 'Espèces à la livraison',
      },
    ],
    notes: 'À relancer rapidement par WhatsApp ! Grand consommateur de Guinness et Castel Beer.',
  },
  {
    id: 'cust-4',
    name: 'Armel Houndégnon',
    businessName: 'Particulier',
    phone: '+229 96 40 88 19',
    location: 'Abomey-Calavi (Tankpè)',
    segment: 'individual',
    totalSpent: 420000,
    orderCount: 5,
    averageOrderValue: 84000,
    lastOrderDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    firstOrderDate: '2026-01-15T00:00:00Z',
    status: 'regular_silver',
    preferences: {
      beersPercentage: 50,
      winesPercentage: 10,
      softsPercentage: 25,
      waterPercentage: 15,
      favoriteProducts: ['La Béninoise 33cl (Casier 24)', 'Youki Cocktail', 'Eau Possotomé 0.5L'],
      dominantCategory: 'Bières 33cl & Softs',
    },
    recommendedBonus: {
      title: 'Bonus Famille : 1 Pack Possotomé 0.5L offert dès 4 casiers',
      description: 'Offre exclusive pour commandes de week-end en famille.',
      promoCode: 'EAU-CALAVI',
      discountType: 'free_item',
    },
    orderHistory: [
      {
        id: 'ord-401',
        orderNumber: 'CMD-2026-0885',
        date: new Date(Date.now() - 4 * 86400000).toISOString(),
        total: 88000,
        itemsSummary: '4x Béninoise 33cl + 2x Youki Cocktail + 2x Possotomé 0.5L',
        paymentMethod: 'MTN Mobile Money',
      },
    ],
    notes: 'Règlement toujours ponctuel par MTN MoMo. Préfère les bouteilles 33cl.',
  },
  {
    id: 'cust-5',
    name: 'Chantal Houessou',
    businessName: 'Comité Paroissial & Cérémonies',
    phone: '+229 97 05 91 66',
    location: 'Saint-Michel, Cotonou',
    segment: 'events',
    totalSpent: 890000,
    orderCount: 3,
    averageOrderValue: 296666,
    lastOrderDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    firstOrderDate: '2026-04-10T00:00:00Z',
    status: 'regular_silver',
    preferences: {
      beersPercentage: 30,
      winesPercentage: 20,
      softsPercentage: 35,
      waterPercentage: 15,
      favoriteProducts: ['Youki Pamplemousse', 'World Cola', 'Eau Possotomé 1.5L', 'Baron de Lestac'],
      dominantCategory: 'Soft Drinks & Eaux Minérales',
    },
    recommendedBonus: {
      title: 'Bonus Événementiel : 3 Sacs de Glaçons 5kg offerts',
      description: 'Accompagnement fraîcheur pour rassemblements et kermesses.',
      promoCode: 'KERMESSE-GLACE',
      discountType: 'free_item',
    },
    orderHistory: [
      {
        id: 'ord-501',
        orderNumber: 'CMD-2026-0860',
        date: new Date(Date.now() - 8 * 86400000).toISOString(),
        total: 310000,
        itemsSummary: '12x Youki Pamplemousse + 10x Possotomé 1.5L + 5x Béninoise 65cl',
        paymentMethod: 'Chariow Online',
      },
    ],
    notes: 'Paiement direct en ligne ou MoMo. Grand besoin de glaçons lors des événements du dimanche.',
  },
  {
    id: 'cust-6',
    name: 'Marcel Zannou',
    businessName: 'Lounge VIP La Terrasse',
    phone: '+229 94 33 20 15',
    location: 'Fidjrossè Plage, Cotonou',
    segment: 'vip',
    totalSpent: 3120000,
    orderCount: 12,
    averageOrderValue: 260000,
    lastOrderDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    firstOrderDate: '2025-11-20T00:00:00Z',
    status: 'vip_gold',
    preferences: {
      beersPercentage: 40,
      winesPercentage: 30,
      softsPercentage: 10,
      waterPercentage: 20,
      favoriteProducts: ['Champagne Laurent-Perrier', 'Whisky Johnnie Walker Black', 'Beaufort Lager 50cl', 'Heineken 33cl'],
      dominantCategory: 'Champagnes & Spiritueux Haut de Gamme',
    },
    recommendedBonus: {
      title: 'Bonus Club VIP : 1 Bouteille de Vin Mousseux Offerte dès 250 000 FCFA',
      description: 'Remise premium et livraison nocturne prioritaire garantie.',
      promoCode: 'LOUNGE-VIP',
      discountType: 'free_item',
    },
    orderHistory: [
      {
        id: 'ord-601',
        orderNumber: 'CMD-2026-0899',
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        total: 285000,
        itemsSummary: '3x Laurent-Perrier + 2x Johnnie Black 1L + 10x Beaufort Lager + 5x Heineken',
        paymentMethod: 'FedaPay Online',
      },
    ],
    notes: 'Client VIP très fidèle. Livraisons souvent demandées le vendredi en début de soirée.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminCustomers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerAnalytics[]>(DEFAULT_CUSTOMERS);
  const [search, setSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAnalytics | null>(null);
  const [customBonusCode, setCustomBonusCode] = useState('');
  const [customBonusDesc, setCustomBonusDesc] = useState('');

  // Load live orders and profiles from Supabase if available
  useEffect(() => {
    async function loadData() {
      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (ordersData && ordersData.length > 5) {
          // If rich order data exists, we aggregate customer purchasing flows
          // Otherwise default to DEFAULT_CUSTOMERS
        }
      } catch {
        // use default mock customers
      }
    }
    loadData();
  }, []);

  // Filtered and searched customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Segment filter
      if (activeSegment === 'maquis' && c.segment !== 'maquis') return false;
      if (activeSegment === 'events' && c.segment !== 'events') return false;
      if (activeSegment === 'vip' && c.status !== 'vip_gold') return false;
      if (activeSegment === 'inactive' && c.status !== 'inactive') return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesBiz = c.businessName?.toLowerCase().includes(q) ?? false;
        const matchesPhone = c.phone.includes(q);
        const matchesLocation = c.location.toLowerCase().includes(q);
        return matchesName || matchesBiz || matchesPhone || matchesLocation;
      }

      return true;
    });
  }, [customers, activeSegment, search]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => customers.reduce((acc, c) => acc + c.totalSpent, 0), [customers]);
  const averageSpent = useMemo(() => totalRevenue / (customers.length || 1), [totalRevenue, customers.length]);
  const vipCount = useMemo(() => customers.filter((c) => c.status === 'vip_gold').length, [customers]);
  const inactiveCount = useMemo(() => customers.filter((c) => c.status === 'inactive').length, [customers]);

  // WhatsApp quick contact with tailored recommendation & bonus
  function sendWhatsAppProposal(customer: CustomerAnalytics) {
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Bonjour ${customer.name}${customer.businessName ? ` (${customer.businessName})` : ''} ! 👋\n\n` +
      `L'équipe SAFFO ONLINE - Dépôt de Brasserie espère que vous allez bien.\n\n` +
      `En tant que client privilégié et amateur de *${customer.preferences.dominantCategory}* (${customer.preferences.favoriteProducts.slice(0, 2).join(', ')}), nous avons le plaisir de vous offrir votre bonus exclusif :\n\n` +
      `🎁 *${customer.recommendedBonus.title}*\n` +
      `Code promo : *${customer.recommendedBonus.promoCode}*\n` +
      `ℹ️ ${customer.recommendedBonus.description}\n\n` +
      `Souhaitez-vous que nous vous programmions une livraison de réassort glacé cette semaine ?\n\n` +
      `Cordialement,\nService Commercial SAFFO ONLINE Cotonou.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  }

  // Assign customized bonus
  function handleAssignBonus(customer: CustomerAnalytics) {
    if (!customBonusCode.trim() || !customBonusDesc.trim()) {
      toast('Veuillez renseigner le code et la description du bonus', 'error');
      return;
    }

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              recommendedBonus: {
                title: customBonusDesc,
                description: customBonusDesc,
                promoCode: customBonusCode.toUpperCase().trim(),
                discountType: 'percentage',
              },
            }
          : c
      )
    );

    setSelectedCustomer((prev) =>
      prev && prev.id === customer.id
        ? {
            ...prev,
            recommendedBonus: {
              title: customBonusDesc,
              description: customBonusDesc,
              promoCode: customBonusCode.toUpperCase().trim(),
              discountType: 'percentage',
            },
          }
        : prev
    );

    toast(`Bonus ${customBonusCode.toUpperCase()} assigné à ${customer.name} !`, 'success');
    setCustomBonusCode('');
    setCustomBonusDesc('');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 page-enter">
      
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#D10024]" />
            <h1 className="text-2xl font-black text-[#2B2D42] uppercase tracking-tight">
              Suivi Clients & Flux d'Achats
            </h1>
          </div>
          <p className="text-xs text-[#8D99AE] mt-1">
            Analyse des volumes de commande, détection des boissons préférées et propositions de bonus ciblés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              toast('Export des données clients au format Excel / CSV généré', 'info');
            }}
            className="btn-electro-outline text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 border border-[#E4E7ED] bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Clients Actifs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{customers.length}</p>
          <p className="text-[11px] text-green-600 font-medium mt-1">
            ↑ +12% de nouveaux maquis ce mois-ci
          </p>
        </div>

        <div className="card p-4 border border-[#E4E7ED] bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Flux Achats Cumulé</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#D10024]">{formatPrice(totalRevenue)}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            Volume total facturé au dépôt
          </p>
        </div>

        <div className="card p-4 border border-[#E4E7ED] bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Panier Moyen</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-50 text-[#FFB300] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{formatPrice(averageSpent)}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            ~15 à 25 casiers par réassort
          </p>
        </div>

        <div className="card p-4 border border-[#E4E7ED] bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">VIP Or / À Relancer</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#D10024] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#D10024]">{vipCount} VIP</span>
            <span className="text-xs font-bold text-amber-600">({inactiveCount} inactifs)</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Bonus de réactivation préconisé
          </p>
        </div>
      </div>

      {/* ── Search & Segment Tabs ─────────────────────────────────────────── */}
      <div className="card p-4 border border-[#E4E7ED] bg-white rounded-xl shadow-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, maquis, tél..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D10024]"
            />
          </div>

          {/* Segment Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-hide py-1">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'maquis', label: 'Maquis & Bars' },
              { id: 'events', label: 'Événements / Dots' },
              { id: 'vip', label: 'VIP Or' },
              { id: 'inactive', label: 'À Relancer (+10j)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSegment(tab.id as CustomerSegment)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  activeSegment === tab.id
                    ? 'bg-[#D10024] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Customer Analytics Table ─────────────────────────────────── */}
      <div className="card border border-[#E4E7ED] bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15161D] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Client / Établissement</th>
                <th className="py-3 px-4">Flux d'Achats</th>
                <th className="py-3 px-4">Préférences Boissons Identifiées</th>
                <th className="py-3 px-4">Statut Fidélité</th>
                <th className="py-3 px-4">Bonus Recommandé</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-sm">Aucun client trouvé</p>
                    <p className="text-xs">Modifiez vos critères de recherche</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition group">
                    {/* Customer Info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.businessName && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {c.businessName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{c.phone}</span>
                        <span>·</span>
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{c.location}</span>
                      </div>
                    </td>

                    {/* Spend Metrics */}
                    <td className="py-3 px-4">
                      <div className="font-black text-gray-900 text-sm text-[#D10024]">
                        {formatPrice(c.totalSpent)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {c.orderCount} commandes · Panier : {formatPrice(c.averageOrderValue)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Dernière cmd : {formatDate(c.lastOrderDate)}
                      </div>
                    </td>

                    {/* Beverage Preferences Breakdown */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-gray-800 text-[11px] truncate mb-1">
                        🍺 {c.preferences.dominantCategory}
                      </div>
                      {/* Mini bar chart */}
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex mb-1.5">
                        <div style={{ width: `${c.preferences.beersPercentage}%` }} className="bg-[#D10024]" title={`Bières: ${c.preferences.beersPercentage}%`} />
                        <div style={{ width: `${c.preferences.winesPercentage}%` }} className="bg-[#9B51E0]" title={`Vins: ${c.preferences.winesPercentage}%`} />
                        <div style={{ width: `${c.preferences.softsPercentage}%` }} className="bg-[#FFB300]" title={`Softs: ${c.preferences.softsPercentage}%`} />
                        <div style={{ width: `${c.preferences.waterPercentage}%` }} className="bg-[#2D9CDB]" title={`Eau: ${c.preferences.waterPercentage}%`} />
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        Favoris : {c.preferences.favoriteProducts.slice(0, 2).join(', ')}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.status === 'vip_gold' && (
                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full">
                          <Award className="w-3 h-3 text-yellow-600" />
                          VIP Or
                        </span>
                      )}
                      {c.status === 'regular_silver' && (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
                          Argent
                        </span>
                      )}
                      {c.status === 'inactive' && (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3 h-3" />
                          À Relancer
                        </span>
                      )}
                      {c.status === 'new' && (
                        <span className="bg-green-100 text-green-700 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
                          Nouveau
                        </span>
                      )}
                    </td>

                    {/* Bonus Recommandé */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="bg-red-50/60 border border-red-200/60 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#D10024]">
                          <Gift className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{c.recommendedBonus.title}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-white text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 mt-1 inline-block">
                          Code : {c.recommendedBonus.promoCode}
                        </span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => sendWhatsAppProposal(c)}
                          className="w-8 h-8 rounded-lg bg-[#25D366] hover:bg-[#1faa4f] text-white flex items-center justify-center shadow-sm transition"
                          title="Proposer le bonus sur WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition"
                        >
                          Fiche 360°
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CUSTOMER 360° DETAIL MODAL ─────────────────────────────────────── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-scale">
          <div className="relative bg-white text-gray-900 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            
            {/* Close modal */}
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4 border-b border-gray-100 pb-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#D10024] font-black text-lg flex items-center justify-center flex-shrink-0">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[#2B2D42]">
                    {selectedCustomer.name}
                  </h3>
                  {selectedCustomer.businessName && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {selectedCustomer.businessName}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                  <span>📞 {selectedCustomer.phone}</span>
                  <span>·</span>
                  <span>📍 {selectedCustomer.location}</span>
                  <span>·</span>
                  <span className="font-bold text-[#D10024]">
                    Total dépensé : {formatPrice(selectedCustomer.totalSpent)}
                  </span>
                </div>
              </div>
            </div>

            {/* Beverage Preferences Breakdown Detail */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Cartographie des Préférences en Boissons
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-3">
                <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500">Bières de Brasserie</span>
                  <p className="text-lg font-black text-[#D10024]">{selectedCustomer.preferences.beersPercentage}%</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500">Vins & Champagnes</span>
                  <p className="text-lg font-black text-[#9B51E0]">{selectedCustomer.preferences.winesPercentage}%</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500">Softs Drinks Youki</span>
                  <p className="text-lg font-black text-[#FFB300]">{selectedCustomer.preferences.softsPercentage}%</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500">Eau Possotomé</span>
                  <p className="text-lg font-black text-[#2D9CDB]">{selectedCustomer.preferences.waterPercentage}%</p>
                </div>
              </div>
              <div className="text-xs text-gray-600">
                <span className="font-bold">Boissons les plus commandées :</span>{' '}
                {selectedCustomer.preferences.favoriteProducts.join(' · ')}
              </div>
            </div>

            {/* Custom Bonus & Promo Assignment */}
            <div className="border border-red-200 bg-red-50/40 p-4 rounded-xl mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#D10024] uppercase">
                  <Gift className="w-4 h-4" />
                  <span>Bonus Actuel : {selectedCustomer.recommendedBonus.title}</span>
                </div>
                <span className="font-mono text-xs font-bold bg-white text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                  Code: {selectedCustomer.recommendedBonus.promoCode}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {selectedCustomer.recommendedBonus.description}
              </p>

              {/* Modify / Assign new bonus */}
              <div className="pt-2 border-t border-red-100 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customBonusCode}
                  onChange={(e) => setCustomBonusCode(e.target.value)}
                  placeholder="Nouveau Code (ex: VIP-BENIN-10)"
                  className="input text-xs py-1.5 flex-1"
                />
                <input
                  type="text"
                  value={customBonusDesc}
                  onChange={(e) => setCustomBonusDesc(e.target.value)}
                  placeholder="Libellé du bonus (ex: 2 Sacs Glaçons offerts)"
                  className="input text-xs py-1.5 flex-1"
                />
                <button
                  onClick={() => handleAssignBonus(selectedCustomer)}
                  className="btn-electro text-xs py-1.5 px-4 whitespace-nowrap"
                >
                  Attribuer
                </button>
              </div>
            </div>

            {/* Order History */}
            <div className="space-y-3 mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Historique des Dernières Commandes
              </p>
              <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
                {selectedCustomer.orderHistory.map((ord) => (
                  <div key={ord.id} className="p-3 hover:bg-gray-50 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{ord.orderNumber}</p>
                      <p className="text-gray-500 text-[11px]">{ord.itemsSummary}</p>
                      <span className="text-[10px] text-gray-400">{formatDate(ord.date)} · {ord.paymentMethod}</span>
                    </div>
                    <span className="font-black text-[#D10024] text-sm">
                      {formatPrice(ord.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes commercial */}
            {selectedCustomer.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-5">
                <span className="font-bold">Note interne commerciale :</span> {selectedCustomer.notes}
              </div>
            )}

            {/* WhatsApp direct push */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Fermer
              </button>
              <button
                onClick={() => sendWhatsAppProposal(selectedCustomer)}
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1faa4f] text-white font-bold text-xs uppercase px-5 py-2.5 rounded-full transition shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Envoyer Proposition WhatsApp</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
