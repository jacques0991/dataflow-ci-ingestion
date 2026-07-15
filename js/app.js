// js/app.js
import { db } from './db.js';
import { seedDatabase } from './mockData.js';
import { queueManager } from './queue.js';
import { ui } from './ui.js';

// Seeding initial de la base si vide
seedDatabase();

// --- ROUTAGE INTERNE (SPA) ---
function handleRouting() {
  const session = db.getSession();
  
  // Si pas authentifié, afficher l'écran d'auth
  if (!session || !session.loggedIn) {
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    return;
  }
  
  // Afficher l'application principale
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  
  // Mettre à jour l'identité de l'utilisateur
  document.getElementById('user-display-name').textContent = session.name;
  document.getElementById('user-avatar-initials').textContent = session.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const hash = window.location.hash || '#dashboard';
  const contentDiv = document.getElementById('view-content');
  const pageTitle = document.getElementById('page-title');
  
  // Gestion de la classe active sur les liens sidebar
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
    const targetHash = item.getAttribute('href');
    if (hash.startsWith(targetHash)) {
      item.classList.add('active');
    }
  });

  // Switch de vue
  if (hash === '#dashboard') {
    pageTitle.textContent = "Tableau de bord";
    ui.renderDashboard(contentDiv);
  } 
  else if (hash === '#sources') {
    pageTitle.textContent = "Sources de données";
    ui.renderSources(contentDiv);
  } 
  else if (hash === '#upload') {
    pageTitle.textContent = "Importer un fichier";
    ui.renderUpload(contentDiv);
  } 
  else if (hash === '#reports') {
    pageTitle.textContent = "Rapports d'ingestion";
    ui.renderReports(contentDiv);
  } 
  else if (hash.startsWith('#reports/')) {
    const reportId = hash.split('/')[1];
    pageTitle.textContent = `Rapport d'ingestion`;
    ui.renderReportDetail(contentDiv, reportId);
  } 
  else {
    window.location.hash = '#dashboard';
  }
}

// --- ÉCOUTE DE LA FILE D'ATTENTE ASYNCHRONE ---
function initQueueListeners() {
  const badge = document.getElementById('global-queue-badge');
  const badgeText = document.getElementById('queue-badge-text');

  queueManager.on('statusChange', (status) => {
    if (status.active) {
      badge.className = 'queue-status-badge processing';
      badgeText.textContent = `${status.queueLength} fichier(s) en traitement`;
    } else {
      badge.className = 'queue-status-badge idle';
      badgeText.textContent = `File d'attente inactive`;
    }
  });

  queueManager.on('progress', (data) => {
    // Si l'utilisateur est sur la page des rapports, on met à jour la ligne en direct
    if (window.location.hash === '#reports') {
      const fill = document.getElementById(`progress-fill-${data.jobId}`);
      const badgeElem = document.getElementById(`status-badge-${data.jobId}`);
      if (fill) fill.style.width = `${data.progress}%`;
      if (badgeElem) {
        badgeElem.textContent = data.status;
        badgeElem.className = `status-badge ${data.status}`;
      }
    }
  });

  queueManager.on('completed', (report) => {
    // Notification Toast
    let toastType = 'success';
    let message = `Le fichier a été validé à 100% sans erreur.`;
    
    if (report.status === 'partial') {
      toastType = 'warning';
      message = `Validation terminée. ${report.validLines} lignes valides et ${report.invalidLines} erreurs détectées.`;
    } else if (report.status === 'failed') {
      toastType = 'error';
      message = `Le fichier a été rejeté. Erreur critique : ${report.errors[0]?.reason || 'Erreur inconnue'}`;
    }

    ui.showToast(
      `Ingestion terminée : ${report.fileName}`, 
      message, 
      toastType
    );

    // Si l'utilisateur regarde la page rapports, ou la page détails de ce rapport précis, on rafraîchit
    if (window.location.hash === '#reports' || window.location.hash === `#reports/${report.id}` || window.location.hash === '#dashboard') {
      handleRouting();
    }
  });
}

// --- INITIALISATION AU CHARGEMENT DU DOM ---
document.addEventListener('DOMContentLoaded', () => {
  // Initialisation des icônes Lucide
  lucide.createIcons();
  
  // Configuration des listeners
  window.addEventListener('hashchange', handleRouting);
  initQueueListeners();

  // 1. Formulaire de Connexion
  const loginForm = document.getElementById('login-form');
  const authError = document.getElementById('auth-error');
  
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      
      // Auth fictive simple requise par le MVP
      if (email === 'savin@dataflow.ci' && password === 'admin123') {
        db.setSession({
          email,
          name: 'Loukou Savin',
          role: 'Ingénieur Données',
          loggedIn: true
        });
        authError.classList.add('hidden');
        loginForm.reset();
        window.location.hash = '#dashboard';
        handleRouting();
        ui.showToast("Connexion réussie", "Bienvenue sur le portail d'ingestion DataFlow CI.", "success");
      } else {
        authError.classList.remove('hidden');
      }
    });
  }

  // 2. Bouton de Déconnexion
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm("Voulez-vous vraiment vous déconnecter du portail ?")) {
        db.clearSession();
        window.location.hash = '#dashboard';
        handleRouting();
        ui.showToast("Déconnexion", "Vous avez été déconnecté avec succès.", "info");
      }
    });
  }

  // Lancement du routage initial
  handleRouting();
});
