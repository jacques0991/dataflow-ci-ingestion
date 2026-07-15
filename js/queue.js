// js/queue.js
import { db } from './db.js';
import { validateDataset, validateRow } from './validator.js';

class QueueManager {
  constructor() {
    this.queue = [];
    this.currentJob = null;
    this.listeners = {
      progress: [],
      completed: [],
      statusChange: []
    };
  }

  // S'abonner aux événements de la file
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  // Déclencher un événement
  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }

  // Ajouter un fichier à traiter dans la file
  enqueue(file, sourceId) {
    const source = db.getSource(sourceId);
    if (!source) {
      throw new Error(`Source avec l'ID ${sourceId} introuvable.`);
    }

    const jobId = 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Créer un rapport initial en attente (pending)
    const initialReport = {
      id: jobId,
      fileName: file.name,
      fileSize: file.size,
      sourceId: source.id,
      sourceName: source.name,
      status: 'pending',
      totalLines: 0,
      validLines: 0,
      invalidLines: 0,
      progress: 0,
      errors: [],
      validData: JSON.stringify([]),
      createdAt: new Date().toISOString()
    };
    
    db.saveReport(initialReport);
    
    const job = {
      id: jobId,
      file,
      source,
      report: initialReport
    };
    
    this.queue.push(job);
    this.trigger('statusChange', { active: true, queueLength: this.queue.length });
    
    // Démarrer le traitement si aucun job n'est actif
    if (!this.currentJob) {
      this.processNext();
    }
    
    return jobId;
  }

  // Traiter le prochain job
  async processNext() {
    if (this.queue.length === 0) {
      this.currentJob = null;
      this.trigger('statusChange', { active: false, queueLength: 0 });
      return;
    }
    
    this.currentJob = this.queue.shift();
    this.trigger('statusChange', { active: true, queueLength: this.queue.length + 1 });
    
    const job = this.currentJob;
    job.report.status = 'processing';
    db.saveReport(job.report);
    
    this.trigger('progress', { jobId: job.id, progress: 5, status: 'processing', message: 'Lecture du fichier...' });
    
    try {
      const parsedData = await this.readFileData(job.file);
      this.trigger('progress', { jobId: job.id, progress: 20, status: 'processing', message: 'Analyse des données...' });
      
      // Lancer la validation par morceaux (chunks) pour simuler un traitement lourd et asynchrone
      this.processValidationInChunks(parsedData, job);
      
    } catch (error) {
      console.error("Erreur de traitement de fichier : ", error);
      job.report.status = 'failed';
      job.report.progress = 100;
      job.report.errors = [{ row: 0, column: 'Système', reason: `Erreur d'importation : ${error.message}` }];
      db.saveReport(job.report);
      
      this.trigger('completed', job.report);
      this.processNext();
    }
  }

  // Lit les données du fichier en fonction de son extension (CSV / Excel)
  readFileData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (extension === 'csv') {
        reader.onload = (e) => {
          const csvText = e.target.result;
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: 'greedy',
            complete: (results) => {
              resolve(results.data);
            },
            error: (err) => {
              reject(new Error(`Erreur lors du parsing CSV : ${err.message}`));
            }
          });
        };
        reader.readAsText(file);
      } 
      else if (['xlsx', 'xls'].includes(extension)) {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            resolve(jsonData);
          } catch (err) {
            reject(new Error(`Erreur lors de la lecture du fichier Excel : ${err.message}`));
          }
        };
        reader.readAsArrayBuffer(file);
      } 
      else {
        reject(new Error("Format de fichier non pris en charge. Veuillez importer un fichier CSV ou Excel."));
      }
    });
  }

  // Valide le jeu de données par morceaux pour maintenir l'interface réactive et animer la progression
  processValidationInChunks(data, job) {
    const totalRows = data.length;
    
    if (totalRows === 0) {
      job.report.status = 'failed';
      job.report.progress = 100;
      job.report.errors = [{ row: 0, column: 'Fichier', reason: 'Le fichier importé ne contient aucune ligne de données.' }];
      db.saveReport(job.report);
      this.trigger('completed', job.report);
      this.processNext();
      return;
    }
    
    // Vérification initiale des colonnes
    const fileColumns = Object.keys(data[0]);
    const missingColumns = job.source.columns
      .filter(col => col.required && !fileColumns.includes(col.name))
      .map(col => col.name);
      
    if (missingColumns.length > 0) {
      job.report.status = 'failed';
      job.report.progress = 100;
      job.report.errors = [{
        row: 1,
        column: 'Toutes',
        reason: `Fichier non conforme : Colonnes obligatoires manquantes dans l'en-tête [${missingColumns.join(', ')}].`
      }];
      db.saveReport(job.report);
      this.trigger('completed', job.report);
      this.processNext();
      return;
    }

    const chunkSize = 200; // Valider par paquets de 200 lignes
    let currentIndex = 0;
    const errors = [];
    const validData = [];

    const validateNextChunk = () => {
      const end = Math.min(currentIndex + chunkSize, totalRows);
      
      // Traitement du chunk courant
      const segment = data.slice(currentIndex, end);
      segment.forEach((row, i) => {
        const rowIndex = currentIndex + i + 2; // ligne 1 = header, index 0 = ligne 2
        
        const result = validateRow(row, rowIndex, job.source);
        if (result.valid) {
          validData.push(row);
        } else {
          errors.push(...result.errors);
        }
      });

      currentIndex = end;
      
      // Mise à jour de la progression
      const progressPercent = Math.min(20 + Math.round((currentIndex / totalRows) * 80), 99);
      job.report.progress = progressPercent;
      job.report.totalLines = totalRows;
      job.report.validLines = validData.length;
      job.report.invalidLines = errors.length;
      db.saveReport(job.report);
      
      this.trigger('progress', { 
        jobId: job.id, 
        progress: progressPercent, 
        status: 'processing', 
        message: `Validation en cours... ${currentIndex}/${totalRows} lignes traitées.` 
      });

      if (currentIndex < totalRows) {
        // Yield execution to make the UI fluid
        setTimeout(validateNextChunk, 50);
      } else {
        // Validation terminée !
        let status = 'success';
        if (errors.length > 0) {
          status = validData.length === 0 ? 'failed' : 'partial';
        }
        
        job.report.status = status;
        job.report.progress = 100;
        job.report.errors = errors;
        job.report.validData = JSON.stringify(validData);
        db.saveReport(job.report);
        
        this.trigger('completed', job.report);
        
        // Passer au job suivant après un court délai
        setTimeout(() => this.processNext(), 500);
      }
    };

    // Lancement de la boucle de traitement asynchrone
    setTimeout(validateNextChunk, 100);
  }
}

export const queueManager = new QueueManager();
export default queueManager;

