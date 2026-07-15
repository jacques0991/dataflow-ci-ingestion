// js/ui.js
import { db } from './db.js';
import { queueManager } from './queue.js';

let activeCharts = {};

export const ui = {
  // Affiche un message Toast temporaire à l'écran
  showToast(title, desc, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Déterminer l'icône Lucide
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';
    if (type === 'warning') icon = 'alert-circle';
    
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-title">${title}</span>
        <span class="toast-desc">${desc}</span>
      </div>
      <button class="toast-close"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Fermeture manuelle
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    });
    
    // Auto-fermeture
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4500);
  },

  // Détruire les instances de graphiques existantes pour éviter les superpositions au rerender
  destroyCharts() {
    Object.values(activeCharts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    activeCharts = {};
  },

  // RENDER : TABLEAU DE BORD (DASHBOARD)
  renderDashboard(container) {
    this.destroyCharts();
    const reports = db.getReports();
    const sources = db.getSources();
    
    // Calculs des KPIs
    const totalFiles = reports.length;
    const successFiles = reports.filter(r => r.status === 'success').length;
    const partialFiles = reports.filter(r => r.status === 'partial').length;
    const failedFiles = reports.filter(r => r.status === 'failed').length;
    
    const successRate = totalFiles > 0 
      ? Math.round(((successFiles + partialFiles * 0.5) / totalFiles) * 100) 
      : 0;
      
    const totalLines = reports.reduce((acc, r) => acc + (r.totalLines || 0), 0);
    
    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="kpi-card primary">
          <div class="kpi-details">
            <span class="kpi-title">Fichiers Traités</span>
            <span class="kpi-value">${totalFiles}</span>
          </div>
          <div class="kpi-icon-wrapper">
            <i data-lucide="file-text"></i>
          </div>
        </div>
        
        <div class="kpi-card success">
          <div class="kpi-details">
            <span class="kpi-title">Taux de Conformité</span>
            <span class="kpi-value">${successRate}%</span>
          </div>
          <div class="kpi-icon-wrapper">
            <i data-lucide="shield-check"></i>
          </div>
        </div>
        
        <div class="kpi-card primary">
          <div class="kpi-details">
            <span class="kpi-title">Lignes Ingérées</span>
            <span class="kpi-value">${totalLines.toLocaleString()}</span>
          </div>
          <div class="kpi-icon-wrapper">
            <i data-lucide="rows"></i>
          </div>
        </div>
        
        <div class="kpi-card error">
          <div class="kpi-details">
            <span class="kpi-title">Fichiers Rejetés</span>
            <span class="kpi-value">${failedFiles}</span>
          </div>
          <div class="kpi-icon-wrapper">
            <i data-lucide="alert-octagon"></i>
          </div>
        </div>
      </div>
      
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Volume d'ingestion</h3>
            <p>Historique des lignes validées par jour</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="volumeChart"></canvas>
          </div>
        </div>
        
        <div class="chart-card">
          <div class="chart-header">
            <h3>Statuts des fichiers</h3>
            <p>Répartition globale de conformité</p>
          </div>
          <div class="chart-wrapper">
            <canvas id="statusChart"></canvas>
          </div>
        </div>
      </div>

      <div class="chart-card" style="margin-bottom:32px;">
        <div class="chart-header">
          <h3>Activité par source de données</h3>
          <p>Nombre de fichiers ingérés et volume par source</p>
        </div>
        <div class="chart-wrapper">
          <canvas id="sourcesChart"></canvas>
        </div>
      </div>
      
      <!-- Fichiers Récents -->
      <div class="table-card">
        <div class="table-controls">
          <h3 style="font-size:16px;font-family:var(--font-display);color:white;">Ingestions récentes</h3>
          <a href="#reports" class="btn btn-secondary btn-sm" id="btn-goto-reports" style="padding:6px 12px;font-size:12px;">Voir tout</a>
        </div>
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Nom du fichier</th>
                <th>Source</th>
                <th>Total Lignes</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${reports.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">Aucun fichier ingéré pour le moment.</td>
                </tr>
              ` : reports.slice(-5).reverse().map(r => `
                <tr>
                  <td>${new Date(r.createdAt).toLocaleDateString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                  <td style="font-weight:600;color:white;">${r.fileName}</td>
                  <td>${r.sourceName}</td>
                  <td>${r.totalLines}</td>
                  <td><span class="status-badge ${r.status}">${r.status}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-view-report" data-id="${r.id}" style="padding:4px 8px;font-size:11px;">
                      Détails
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    lucide.createIcons();
    
    // Liaison d'événements pour les boutons détails
    container.querySelectorAll('.btn-view-report').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        window.location.hash = `#reports/${id}`;
      });
    });

    const linkBtn = container.querySelector('#btn-goto-reports');
    if (linkBtn) {
      linkBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#reports';
      });
    }

    // Initialisation des graphiques si données existantes
    if (totalFiles > 0) {
      this.initDashboardCharts(reports, sources);
    }
  },

  initDashboardCharts(reports, sources) {
    // 1. Graphe Volume d'ingestion (Volume par jour)
    const dates = {};
    reports.forEach(r => {
      const d = new Date(r.createdAt).toLocaleDateString('fr-FR');
      dates[d] = (dates[d] || 0) + (r.validLines || 0);
    });
    const sortedDates = Object.keys(dates).sort((a,b) => {
      return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
    });
    
    const ctxVolume = document.getElementById('volumeChart');
    if (ctxVolume) {
      activeCharts.volume = new Chart(ctxVolume, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            label: 'Lignes valides ingérées',
            data: sortedDates.map(d => dates[d]),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }

    // 2. Graphe Statuts des fichiers (Doughnut)
    const successFiles = reports.filter(r => r.status === 'success').length;
    const partialFiles = reports.filter(r => r.status === 'partial').length;
    const failedFiles = reports.filter(r => r.status === 'failed').length;
    const processingFiles = reports.filter(r => r.status === 'processing' || r.status === 'pending').length;

    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus) {
      activeCharts.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Conformes', 'Partiels', 'Rejetés', 'En cours'],
          datasets: [{
            data: [successFiles, partialFiles, failedFiles, processingFiles],
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6366f1'],
            borderColor: '#0f111a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#9ca3af', font: { family: 'Inter' } }
            }
          }
        }
      });
    }

    // 3. Graphe Activité par source (Barres horizontales ou verticales)
    const sourceStats = {};
    sources.forEach(s => {
      sourceStats[s.name] = { count: 0, rows: 0 };
    });
    reports.forEach(r => {
      if (sourceStats[r.sourceName]) {
        sourceStats[r.sourceName].count += 1;
        sourceStats[r.sourceName].rows += r.totalLines;
      }
    });

    const ctxSources = document.getElementById('sourcesChart');
    if (ctxSources) {
      activeCharts.sources = new Chart(ctxSources, {
        type: 'bar',
        data: {
          labels: Object.keys(sourceStats),
          datasets: [
            {
              label: 'Fichiers ingérés',
              data: Object.values(sourceStats).map(s => s.count),
              backgroundColor: '#a855f7',
              yAxisID: 'y'
            },
            {
              label: 'Volume lignes',
              data: Object.values(sourceStats).map(s => s.rows),
              backgroundColor: 'rgba(99, 102, 241, 0.4)',
              borderColor: '#6366f1',
              borderWidth: 1,
              yAxisID: 'yVolume'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#9ca3af' }
            }
          },
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#9ca3af' }
            },
            yVolume: {
              type: 'linear',
              position: 'right',
              grid: { display: false },
              ticks: { color: '#9ca3af' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#9ca3af' }
            }
          }
        }
      });
    }
  },

  // RENDER : SOURCES DE DONNÉES (SOURCES)
  renderSources(container) {
    const sources = db.getSources();
    
    container.innerHTML = `
      <div class="sources-header">
        <div>
          <h3 style="font-size:18px;color:white;font-family:var(--font-display);">Schémas & Configurations</h3>
          <p style="font-size:12px;color:var(--text-muted);">Configurez et gérez les formats attendus pour chaque type de flux de données.</p>
        </div>
        <button class="btn btn-primary" id="btn-create-source">
          <i data-lucide="plus" style="width:16px;height:16px;margin-right:6px;"></i>
          Créer une source
        </button>
      </div>
      
      <div class="sources-grid">
        ${sources.length === 0 ? `
          <div style="grid-column: 1/-1; text-align:center; padding:50px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--border-radius-md);">
            <p style="color:var(--text-secondary); margin-bottom:15px;">Aucune source configurée.</p>
            <button class="btn btn-primary btn-sm" id="btn-create-source-empty">Créer la première source</button>
          </div>
        ` : sources.map(s => `
          <div class="source-card">
            <div class="source-meta">
              <h3>${s.name}</h3>
              <span class="schema-version-badge">v${s.version}</span>
            </div>
            <p class="source-desc">${s.description || 'Aucune description fournie.'}</p>
            <div class="source-details">
              <span><i data-lucide="columns" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i> ${s.columns.length} colonnes</span>
              <span>Modifié le ${new Date(s.updatedAt || s.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="source-actions">
              <button class="btn btn-secondary btn-block btn-edit-source" data-id="${s.id}" style="font-size:12px;padding:8px 12px;">
                <i data-lucide="edit-3" style="width:12px;height:12px;margin-right:6px;"></i> Éditer schéma
              </button>
              <button class="btn btn-danger btn-remove-source" data-id="${s.id}" style="padding:8px;aspect-ratio:1;">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    lucide.createIcons();
    
    // Liaison d'événements
    const handleCreateClick = () => this.showSourceModal();
    const btnCreate = container.querySelector('#btn-create-source');
    if (btnCreate) btnCreate.addEventListener('click', handleCreateClick);
    
    const btnCreateEmpty = container.querySelector('#btn-create-source-empty');
    if (btnCreateEmpty) btnCreateEmpty.addEventListener('click', handleCreateClick);
    
    container.querySelectorAll('.btn-edit-source').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.showSourceModal(id);
      });
    });
    
    container.querySelectorAll('.btn-remove-source').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm("Êtes-vous sûr de vouloir supprimer cette source ? Ses schémas seront archivés.")) {
          db.deleteSource(id);
          this.showToast("Source supprimée", "La source de données a été retirée avec succès.", "success");
          this.renderSources(container);
        }
      });
    });
  },

  // Modal d'ajout/édition de Source
  showSourceModal(sourceId = null) {
    const isEdit = !!sourceId;
    const source = isEdit ? db.getSource(sourceId) : {
      id: 'src-' + Date.now(),
      name: '',
      description: '',
      columns: []
    };
    
    // Créer la structure modale
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isEdit ? 'Modifier la Source' : 'Nouvelle Source de données'}</h3>
          <button class="close-modal-btn"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body">
          <form id="source-form">
            <div class="form-group">
              <label for="src-name">Nom de la source</label>
              <input type="text" id="src-name" required value="${source.name}" placeholder="Ex: Ventes Orange CI - Hebdo">
            </div>
            
            <div class="form-group">
              <label for="src-desc">Description</label>
              <textarea id="src-desc" rows="3" placeholder="Description du flux de données...">${source.description}</textarea>
            </div>
            
            <div class="schema-columns-section">
              <div class="schema-section-header">
                <h4 style="font-size:14px;color:white;text-transform:uppercase;letter-spacing:0.05em;">Colonnes du schéma</h4>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-column" style="padding:6px 12px;font-size:12px;">
                  <i data-lucide="plus" style="width:12px;height:12px;margin-right:4px;"></i> Ajouter colonne
                </button>
              </div>
              
              <div class="schema-columns-list" id="columns-list-container">
                <!-- Les lignes de colonnes seront insérées ici -->
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-close-modal">Annuler</button>
          <button class="btn btn-primary" id="btn-save-source">Enregistrer la source</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
    
    const containerCols = modal.querySelector('#columns-list-container');
    
    // Remplir avec les colonnes existantes
    if (source.columns.length > 0) {
      source.columns.forEach(col => this.addColumnRow(containerCols, col));
    } else {
      // Ajouter une colonne par défaut pour démarrer
      this.addColumnRow(containerCols);
    }
    
    // Événements
    modal.querySelector('#btn-add-column').addEventListener('click', () => this.addColumnRow(containerCols));
    
    const closeModal = () => {
      modal.style.animation = 'fadeOut 0.2s forwards';
      setTimeout(() => modal.remove(), 200);
    };
    
    modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('#btn-close-modal').addEventListener('click', closeModal);
    
    modal.querySelector('#btn-save-source').addEventListener('click', () => {
      const nameInput = modal.querySelector('#src-name');
      const descInput = modal.querySelector('#src-desc');
      
      if (!nameInput.value.trim()) {
        nameInput.focus();
        return;
      }
      
      // Récupérer les colonnes configurées
      const rows = containerCols.querySelectorAll('.column-row');
      const columns = [];
      let colNameError = false;
      
      rows.forEach(row => {
        const nameVal = row.querySelector('.col-name-input').value.trim();
        const typeVal = row.querySelector('.col-type-select').value;
        const reqVal = row.querySelector('.col-req-checkbox').checked;
        const patVal = row.querySelector('.col-pattern-input').value.trim();
        const valsVal = row.querySelector('.col-values-input').value.trim();
        
        if (!nameVal) {
          colNameError = true;
          row.querySelector('.col-name-input').focus();
          return;
        }
        
        columns.push({
          name: nameVal,
          type: typeVal,
          required: reqVal,
          pattern: patVal,
          values: valsVal
        });
      });
      
      if (colNameError) {
        this.showToast("Erreur de validation", "Toutes les colonnes du schéma doivent avoir un nom.", "error");
        return;
      }
      
      if (columns.length === 0) {
        this.showToast("Erreur de validation", "Le schéma doit contenir au moins une colonne.", "error");
        return;
      }
      
      // Enregistrer dans la DB
      const updatedSource = {
        ...source,
        name: nameInput.value.trim(),
        description: descInput.value.trim(),
        columns
      };
      
      db.saveSource(updatedSource);
      
      this.showToast("Source enregistrée", `La source '${updatedSource.name}' a été sauvegardée.`, "success");
      closeModal();
      
      // Re-render la page sources principale
      const contentDiv = document.getElementById('view-content');
      this.renderSources(contentDiv);
    });
  },
  
  // Ligne de colonne dynamique dans le formulaire modale
  addColumnRow(container, col = { name: '', type: 'text', required: true, pattern: '', values: '' }) {
    const row = document.createElement('div');
    row.className = 'column-row';
    row.innerHTML = `
      <input type="text" class="col-name-input" placeholder="Nom col (ex: montant)" value="${col.name}" required>
      <select class="col-type-select">
        <option value="text" ${col.type === 'text' ? 'selected' : ''}>Texte</option>
        <option value="number" ${col.type === 'number' ? 'selected' : ''}>Nombre</option>
        <option value="date" ${col.type === 'date' ? 'selected' : ''}>Date</option>
      </select>
      <label class="checkbox-container">
        <input type="checkbox" class="col-req-checkbox" ${col.required ? 'checked' : ''}>
        Requis
      </label>
      <input type="text" class="col-pattern-input" placeholder="Regex (ex: ^CLI-\\d{6}$)" value="${col.pattern || ''}">
      <input type="text" class="col-values-input" placeholder="Enum (ex: Abidjan, Bouaké)" value="${col.values || ''}">
      <button type="button" class="btn-remove-col"><i data-lucide="x" style="width:14px;height:14px;"></i></button>
    `;
    
    container.appendChild(row);
    lucide.createIcons();
    
    // Suppression de la ligne
    row.querySelector('.btn-remove-col').addEventListener('click', () => {
      row.style.animation = 'fadeOut 0.2s forwards';
      setTimeout(() => row.remove(), 200);
    });
  },

  // RENDER : IMPORTATION DE FICHIER (UPLOAD)
  renderUpload(container) {
    const sources = db.getSources();
    
    container.innerHTML = `
      <div class="upload-container">
        <div class="upload-card">
          <h3 style="font-size:18px;color:white;font-family:var(--font-display);margin-bottom:10px;">Importer et Valider des fichiers</h3>
          <p style="font-size:12px;color:var(--text-secondary);margin-bottom:30px;">
            Choisissez une source de données et déposez votre fichier (CSV ou Excel). Notre validateur analysera le contenu conformément au schéma défini.
          </p>
          
          <div class="form-group">
            <label for="upload-source-select">Source de données de destination</label>
            <select id="upload-source-select" style="padding:12px 16px;font-size:14px;">
              <option value="">-- Sélectionnez la source correspondante --</option>
              ${sources.map(s => `<option value="${s.id}">${s.name} (v${s.version})</option>`).join('')}
            </select>
          </div>
          
          <!-- Zone Drag & Drop -->
          <div class="dropzone" id="upload-dropzone">
            <div class="dropzone-icon-wrapper">
              <i data-lucide="upload-cloud"></i>
            </div>
            <h3>Glissez-déposez le fichier ici</h3>
            <p>ou cliquez pour parcourir les dossiers</p>
            <input type="file" id="file-input-hidden" class="hidden" accept=".csv, .xlsx, .xls">
          </div>
          
          <!-- Aperçu du fichier choisi -->
          <div class="file-info-bar hidden" id="file-info-preview">
            <div class="file-meta-details">
              <i data-lucide="file-spreadsheet"></i>
              <div class="file-name-size">
                <span class="fname" id="preview-fname">NomFichier.csv</span>
                <span class="fsize" id="preview-fsize">1.2 MB</span>
              </div>
            </div>
            <button class="btn-remove-file" id="btn-clear-file"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
          </div>
          
          <div id="upload-error" class="error-message hidden"></div>
          
          <button class="btn btn-primary btn-block" id="btn-start-ingest" disabled style="padding:14px 20px;font-size:15px;">
            <i data-lucide="play" style="width:16px;height:16px;margin-right:8px;"></i>
            Lancer la validation asynchrone
          </button>
        </div>
      </div>
    `;
    
    lucide.createIcons();
    
    // Interactions UI
    const dropzone = container.querySelector('#upload-dropzone');
    const fileInput = container.querySelector('#file-input-hidden');
    const previewBar = container.querySelector('#file-info-preview');
    const sourceSelect = container.querySelector('#upload-source-select');
    const btnIngest = container.querySelector('#btn-start-ingest');
    const errorDiv = container.querySelector('#upload-error');
    
    let selectedFile = null;
    
    const updateUIState = () => {
      const hasFile = !!selectedFile;
      const hasSource = !!sourceSelect.value;
      
      btnIngest.disabled = !(hasFile && hasSource);
    };
    
    // Gérer la sélection de fichier
    const handleFile = (file) => {
      errorDiv.classList.add('hidden');
      const ext = file.name.split('.').pop().toLowerCase();
      
      if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        errorDiv.textContent = "Format de fichier invalide. Veuillez importer du CSV (.csv) ou de l'Excel (.xlsx, .xls).";
        errorDiv.classList.remove('hidden');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10 MB limit
        errorDiv.textContent = "Le fichier dépasse la taille maximale autorisée de 10 MB.";
        errorDiv.classList.remove('hidden');
        return;
      }
      
      selectedFile = file;
      container.querySelector('#preview-fname').textContent = file.name;
      
      // Formatage taille
      const sizeStr = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' 
        : (file.size / 1024).toFixed(1) + ' KB';
      container.querySelector('#preview-fsize').textContent = sizeStr;
      
      previewBar.classList.remove('hidden');
      dropzone.classList.add('hidden');
      updateUIState();
    };
    
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });
    
    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
    
    // Nettoyer fichier sélectionné
    container.querySelector('#btn-clear-file').addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      previewBar.classList.add('hidden');
      dropzone.classList.remove('hidden');
      updateUIState();
    });
    
    sourceSelect.addEventListener('change', updateUIState);
    
    // Lancer l'ingestion
    btnIngest.addEventListener('click', () => {
      if (!selectedFile || !sourceSelect.value) return;
      
      try {
        const jobId = queueManager.enqueue(selectedFile, sourceSelect.value);
        this.showToast(
          "Fichier mis en file", 
          `'${selectedFile.name}' est en attente de traitement.`, 
          "info"
        );
        // Redirection vers les rapports pour suivre l'état
        window.location.hash = '#reports';
      } catch (err) {
        this.showToast("Erreur d'import", err.message, "error");
      }
    });
  },

  // RENDER : LISTE DES RAPPORTS (REPORTS)
  renderReports(container) {
    const reports = db.getReports();
    
    container.innerHTML = `
      <div class="table-card">
        <div class="table-controls">
          <div>
            <h3 style="font-size:16px;color:white;font-family:var(--font-display);">Rapports d'ingestion</h3>
            <p style="font-size:11px;color:var(--text-muted);">Suivez et téléchargez les statistiques d'intégration de vos fichiers sources.</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-clear-history" style="padding:6px 12px;font-size:12px;">
            Effacer l'historique
          </button>
        </div>
        
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date d'import</th>
                <th>Nom du fichier</th>
                <th>Source cible</th>
                <th>Lignes (valides/totales)</th>
                <th>Progression</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="reports-table-body">
              ${reports.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;">Aucun historique de validation disponible.</td>
                </tr>
              ` : reports.slice().reverse().map(r => `
                <tr id="row-report-${r.id}">
                  <td>${new Date(r.createdAt).toLocaleString('fr-FR')}</td>
                  <td style="font-weight:600;color:white;">${r.fileName}</td>
                  <td>${r.sourceName}</td>
                  <td>${r.status === 'failed' && r.errors.length > 0 && r.totalLines === 0 ? '-' : `${r.validLines}/${r.totalLines}`}</td>
                  <td>
                    <div class="progress-container">
                      <div class="progress-fill" id="progress-fill-${r.id}" style="width: ${r.progress}%;"></div>
                    </div>
                  </td>
                  <td><span class="status-badge ${r.status}" id="status-badge-${r.id}">${r.status}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-view-report-detail" data-id="${r.id}" style="padding:4px 8px;font-size:11px;">
                      Détails
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    lucide.createIcons();
    
    // Liaison d'événements
    container.querySelectorAll('.btn-view-report-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        window.location.hash = `#reports/${id}`;
      });
    });
    
    const clearBtn = container.querySelector('#btn-clear-history');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm("Voulez-vous vraiment effacer tous les rapports d'ingestion ? Cela réinitialisera le Dashboard.")) {
          db.clearReports();
          this.showToast("Historique vidé", "Tous les rapports d'ingestion ont été supprimés.", "success");
          this.renderReports(container);
        }
      });
    }
  },

  // RENDER : DETAIL D'UN RAPPORT (REPORT DETAIL)
  renderReportDetail(container, reportId) {
    const report = db.getReport(reportId);
    
    if (!report) {
      container.innerHTML = `
        <div style="text-align:center;padding:50px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--border-radius-md);">
          <h3 style="color:var(--error-color);margin-bottom:10px;">Rapport introuvable</h3>
          <p style="color:var(--text-secondary);margin-bottom:20px;">Le rapport demandé n'existe pas ou a été supprimé.</p>
          <a href="#reports" class="btn btn-primary">Retour aux rapports</a>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <a href="#reports" class="btn btn-secondary btn-sm" style="padding:6px 12px;font-size:12px;margin-bottom:15px;display:inline-flex;align-items:center;gap:6px;">
          <i data-lucide="arrow-left" style="width:12px;height:12px;"></i> Retour aux rapports
        </a>
      </div>
      
      <div class="report-header-info">
        <div class="report-details-grid" style="width:100%;">
          <div class="report-detail-item">
            <span class="lbl">Fichier</span>
            <span class="val" style="font-size:15px;word-break:break-all;">${report.fileName}</span>
          </div>
          <div class="report-detail-item">
            <span class="lbl">Source cible</span>
            <span class="val">${report.sourceName}</span>
          </div>
          <div class="report-detail-item">
            <span class="lbl">Statut global</span>
            <div><span class="status-badge ${report.status}">${report.status}</span></div>
          </div>
          <div class="report-detail-item">
            <span class="lbl">Date de traitement</span>
            <span class="val" style="font-size:14px;">${new Date(report.createdAt).toLocaleString('fr-FR')}</span>
          </div>
        </div>
      </div>
      
      <!-- Cartes statistiques des lignes -->
      <div class="dashboard-grid" style="margin-bottom:30px;">
        <div class="kpi-card primary" style="padding:18px 24px;">
          <div class="kpi-details">
            <span class="kpi-title" style="font-size:11px;">Lignes totales</span>
            <span class="kpi-value" style="font-size:24px;">${report.totalLines}</span>
          </div>
        </div>
        <div class="kpi-card success" style="padding:18px 24px;">
          <div class="kpi-details">
            <span class="kpi-title" style="font-size:11px;">Lignes valides</span>
            <span class="kpi-value" style="font-size:24px;">${report.validLines}</span>
          </div>
        </div>
        <div class="kpi-card error" style="padding:18px 24px;">
          <div class="kpi-details">
            <span class="kpi-title" style="font-size:11px;">Lignes rejetées</span>
            <span class="kpi-value" style="font-size:24px;">${report.invalidLines}</span>
          </div>
        </div>
        
        <!-- Action Téléchargement des lignes conformes -->
        <div style="display:flex;align-items:center;">
          <button class="btn btn-primary btn-block" id="btn-export-valid" ${report.validLines === 0 ? 'disabled' : ''} style="padding:14px;">
            <i data-lucide="download" style="width:16px;height:16px;margin-right:8px;"></i>
            Exporter lignes valides (CSV)
          </button>
        </div>
      </div>

      <!-- Section Erreurs de validation -->
      <div class="report-errors-section">
        <h4 style="font-size:15px;color:white;font-family:var(--font-display);margin-bottom:15px;text-transform:uppercase;letter-spacing:0.05em;">
          Anomalies détectées (${report.errors.length})
        </h4>
        
        <div class="table-card">
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:100px;">Ligne</th>
                  <th style="width:200px;">Colonne</th>
                  <th>Description de l'anomalie</th>
                </tr>
              </thead>
              <tbody>
                ${report.errors.length === 0 ? `
                  <tr>
                    <td colspan="3" style="text-align:center;color:var(--success-color);padding:24px;font-weight:500;">
                      <i data-lucide="check-circle" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i>
                      Aucune erreur détectée. Le fichier est 100% conforme.
                    </td>
                  </tr>
                ` : report.errors.map(err => `
                  <tr>
                    <td><span class="error-row-number">L. ${err.row}</span></td>
                    <td style="font-weight:600;color:white;">${err.column}</td>
                    <td style="color:var(--text-secondary);">${err.reason}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    lucide.createIcons();
    
    // Téléchargement des lignes valides
    const exportBtn = container.querySelector('#btn-export-valid');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        try {
          const validRows = JSON.parse(report.validData);
          if (validRows.length === 0) return;
          
          // Conversion JSON vers CSV
          const csvText = Papa.unparse(validRows);
          
          // Téléchargement dans le navigateur
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `valides_${report.fileName}`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          this.showToast("Export réussi", "Les lignes valides ont été téléchargées.", "success");
        } catch (e) {
          console.error(e);
          this.showToast("Erreur d'export", "Une erreur est survenue lors de l'export des données.", "error");
        }
      });
    }
  }
};
