// js/mockData.js
import { db } from './db.js';

const MOCK_SOURCES = [
  {
    id: 'src-orange',
    name: 'Ventes Orange CI - Hebdo',
    description: 'Fichiers hebdomadaires des ventes de cartes de recharge et abonnements via le réseau de distributeurs Orange Côte d\'Ivoire.',
    version: 1,
    columns: [
      { name: 'date', type: 'date', required: true, pattern: '', values: '' },
      { name: 'region', type: 'text', required: true, pattern: '', values: 'Abidjan,Bouaké,Daloa,Yamoussoukro,Korhogo,San-Pedro' },
      { name: 'montant_fcfa', type: 'number', required: true, pattern: '', values: '' },
      { name: 'client_id', type: 'text', required: true, pattern: '^CLI-\\d{6}$', values: '' }
    ]
  },
  {
    id: 'src-atlantique',
    name: 'Transaction Banque Atlantique',
    description: 'Transactions quotidiennes issues des guichets automatiques et virements interbancaires en Côte d\'Ivoire.',
    version: 2,
    columns: [
      { name: 'transaction_id', type: 'text', required: true, pattern: '^TX-\\d{8}$', values: '' },
      { name: 'date', type: 'date', required: true, pattern: '', values: '' },
      { name: 'compte_source', type: 'text', required: true, pattern: '', values: '' },
      { name: 'montant', type: 'number', required: true, pattern: '', values: '' },
      { name: 'type', type: 'text', required: true, pattern: '', values: 'credit,debit' }
    ]
  },
  {
    id: 'src-mtn',
    name: 'Stocks MTN - Distributeurs',
    description: 'Niveau des stocks de cartes SIM et téléphones chez les distributeurs agréés MTN CI.',
    version: 1,
    columns: [
      { name: 'produit_id', type: 'text', required: true, pattern: '^MTN-[A-Z0-9]{5}$', values: '' },
      { name: 'quantite', type: 'number', required: true, pattern: '', values: '' },
      { name: 'distributeur', type: 'text', required: true, pattern: '', values: '' },
      { name: 'date_stock', type: 'date', required: true, pattern: '', values: '' }
    ]
  }
];

const MOCK_REPORTS = [
  {
    id: 'rep-001',
    fileName: 'ventes_orange_hebdo_2026_w25.csv',
    fileSize: 450000,
    sourceId: 'src-orange',
    sourceName: 'Ventes Orange CI - Hebdo',
    status: 'success',
    totalLines: 1500,
    validLines: 1500,
    invalidLines: 0,
    progress: 100,
    errors: [],
    validData: JSON.stringify([]), // mock empty content for memory efficiency
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() // 6 days ago
  },
  {
    id: 'rep-002',
    fileName: 'transactions_bac_20260710.xlsx',
    fileSize: 1200000,
    sourceId: 'src-atlantique',
    sourceName: 'Transaction Banque Atlantique',
    status: 'partial',
    totalLines: 3200,
    validLines: 3180,
    invalidLines: 20,
    progress: 100,
    errors: Array.from({ length: 20 }, (_, idx) => ({
      row: idx + 42,
      column: 'montant',
      reason: 'Le montant doit être un nombre positif'
    })),
    validData: JSON.stringify([]),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
  },
  {
    id: 'rep-003',
    fileName: 'stock_mtn_nord_v1.csv',
    fileSize: 220000,
    sourceId: 'src-mtn',
    sourceName: 'Stocks MTN - Distributeurs',
    status: 'failed',
    totalLines: 500,
    validLines: 0,
    invalidLines: 500,
    progress: 100,
    errors: [
      { row: 1, column: 'Toutes', reason: 'En-tête de colonnes manquants ou invalides' }
    ],
    validData: JSON.stringify([]),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: 'rep-004',
    fileName: 'ventes_orange_hebdo_2026_w26.csv',
    fileSize: 480000,
    sourceId: 'src-orange',
    sourceName: 'Ventes Orange CI - Hebdo',
    status: 'success',
    totalLines: 1850,
    validLines: 1850,
    invalidLines: 0,
    progress: 100,
    errors: [],
    validData: JSON.stringify([]),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    id: 'rep-005',
    fileName: 'transactions_bac_20260714_rejet.csv',
    fileSize: 15000,
    sourceId: 'src-atlantique',
    sourceName: 'Transaction Banque Atlantique',
    status: 'partial',
    totalLines: 50,
    validLines: 47,
    invalidLines: 3,
    progress: 100,
    errors: [
      { row: 12, column: 'transaction_id', reason: 'Ne respecte pas le format TX-\\d{8} (Reçu: TX-12345)' },
      { row: 24, column: 'type', reason: 'La valeur doit faire partie de: credit, debit' },
      { row: 41, column: 'compte_source', reason: 'Cette colonne est obligatoire' }
    ],
    validData: JSON.stringify([
      { transaction_id: 'TX-98765432', date: '2026-07-14', compte_source: '012938475', montant: '150000', type: 'credit' }
    ]),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
  }
];

export function seedDatabase() {
  const currentSources = db.getSources();
  if (currentSources.length === 0) {
    MOCK_SOURCES.forEach(s => db.saveSource(s));
    console.log('Mock sources seeded successfully.');
  }

  const currentReports = db.getReports();
  if (currentReports.length === 0) {
    MOCK_REPORTS.forEach(r => db.saveReport(r));
    console.log('Mock reports seeded successfully.');
  }
}
