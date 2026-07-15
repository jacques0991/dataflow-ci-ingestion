// js/db.js

const KEYS = {
  SOURCES: 'dataflow_sources',
  REPORTS: 'dataflow_reports',
  SESSION: 'dataflow_session'
};

// Initialise le stockage local s'il est vide
function initStorage() {
  if (!localStorage.getItem(KEYS.SOURCES)) {
    localStorage.setItem(KEYS.SOURCES, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.REPORTS)) {
    localStorage.setItem(KEYS.REPORTS, JSON.stringify([]));
  }
}

initStorage();

export const db = {
  // --- GESTION DES SOURCES ---
  getSources() {
    return JSON.parse(localStorage.getItem(KEYS.SOURCES)) || [];
  },
  
  getSource(id) {
    return this.getSources().find(s => s.id === id);
  },
  
  saveSource(source) {
    const sources = this.getSources();
    const index = sources.findIndex(s => s.id === source.id);
    
    if (index !== -1) {
      // Versioning du schéma si les colonnes ont changé
      const oldSource = sources[index];
      const columnsChanged = JSON.stringify(oldSource.columns) !== JSON.stringify(source.columns);
      
      if (columnsChanged) {
        source.version = (oldSource.version || 1) + 1;
      } else {
        source.version = oldSource.version || 1;
      }
      
      sources[index] = { ...oldSource, ...source, updatedAt: new Date().toISOString() };
    } else {
      source.version = 1;
      source.createdAt = new Date().toISOString();
      source.updatedAt = source.createdAt;
      sources.push(source);
    }
    
    localStorage.setItem(KEYS.SOURCES, JSON.stringify(sources));
    return source;
  },
  
  deleteSource(id) {
    const sources = this.getSources().filter(s => s.id !== id);
    localStorage.setItem(KEYS.SOURCES, JSON.stringify(sources));
    
    // On garde l'historique des rapports mais on met à jour la référence
    const reports = this.getReports().map(r => {
      if (r.sourceId === id) {
        return { ...r, sourceDeleted: true };
      }
      return r;
    });
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
  },
  
  // --- GESTION DES RAPPORTS D'INGESTION ---
  getReports() {
    return JSON.parse(localStorage.getItem(KEYS.REPORTS)) || [];
  },
  
  getReport(id) {
    return this.getReports().find(r => r.id === id);
  },
  
  saveReport(report) {
    const reports = this.getReports();
    const index = reports.findIndex(r => r.id === report.id);
    
    if (index !== -1) {
      reports[index] = { ...reports[index], ...report };
    } else {
      if (!report.createdAt) {
        report.createdAt = new Date().toISOString();
      }
      reports.push(report);
    }
    
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
    return report;
  },
  
  clearReports() {
    localStorage.setItem(KEYS.REPORTS, JSON.stringify([]));
  },
  
  // --- SESSION D'AUTHENTIFICATION ---
  getSession() {
    return JSON.parse(localStorage.getItem(KEYS.SESSION)) || null;
  },
  
  setSession(user) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
  },
  
  clearSession() {
    localStorage.removeItem(KEYS.SESSION);
  }
};
