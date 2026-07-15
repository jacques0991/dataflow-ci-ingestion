// js/validator.js

/**
 * Valide une ligne de données par rapport au schéma d'une source
 * @param {Object} row Objet clé/valeur représentant une ligne
 * @param {number} rowIndex Index de la ligne (1-based)
 * @param {Object} schema Schéma de validation de la source
 * @returns {Object} { valid: boolean, errors: Array }
 */
export function validateRow(row, rowIndex, schema) {
  const errors = [];
  
  for (const colDef of schema.columns) {
    const colName = colDef.name;
    const val = row[colName] !== undefined ? String(row[colName]).trim() : '';
    
    // 1. Validation Obligatoire
    if (colDef.required && !val) {
      errors.push({
        row: rowIndex,
        column: colName,
        reason: `La colonne '${colName}' est obligatoire mais la cellule est vide.`
      });
      continue; // Si vide et requis, on ne fait pas les autres validations
    }
    
    // Si la cellule est vide et facultative, c'est valide
    if (!colDef.required && !val) {
      continue;
    }
    
    // 2. Validation du Type
    if (colDef.type === 'number') {
      const num = Number(val);
      if (isNaN(num)) {
        errors.push({
          row: rowIndex,
          column: colName,
          reason: `Valeur '${val}' invalide pour un type numérique.`
        });
      } else {
        // Règle métier DataFlow : Les montants et quantités doivent être positifs
        if ((colName.toLowerCase().includes('montant') || colName.toLowerCase().includes('quantite') || colName.toLowerCase().includes('quantité')) && num < 0) {
          errors.push({
            row: rowIndex,
            column: colName,
            reason: `La valeur doit être un nombre positif (Reçu: ${val}).`
          });
        }
      }
    } else if (colDef.type === 'date') {
      // Vérification basique du format de date (YYYY-MM-DD ou DD/MM/YYYY ou ISO)
      const timestamp = Date.parse(val);
      const isFormatValid = !isNaN(timestamp);
      
      // On teste aussi avec un regex simple si le parse échoue (ex: format fr DD/MM/YYYY)
      const frDateRegex = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/;
      
      if (!isFormatValid && !frDateRegex.test(val)) {
        errors.push({
          row: rowIndex,
          column: colName,
          reason: `Format de date '${val}' invalide. Formats acceptés: YYYY-MM-DD ou DD/MM/YYYY.`
        });
      }
    }
    
    // 3. Validation de l'expression régulière (Pattern)
    if (colDef.pattern && val) {
      try {
        const regex = new RegExp(colDef.pattern);
        if (!regex.test(val)) {
          errors.push({
            row: rowIndex,
            column: colName,
            reason: `La valeur '${val}' ne correspond pas au format attendu (Ex: ${colDef.pattern}).`
          });
        }
      } catch (e) {
        console.error(`Expression régulière invalide dans le schéma: ${colDef.pattern}`, e);
      }
    }
    
    // 4. Validation des valeurs autorisées (Enum)
    if (colDef.values && val) {
      const allowedValues = colDef.values.split(',').map(v => v.trim().toLowerCase());
      if (!allowedValues.includes(val.toLowerCase())) {
        errors.push({
          row: rowIndex,
          column: colName,
          reason: `La valeur '${val}' n'est pas autorisée. Valeurs permises: [${colDef.values}].`
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valide un tableau complet de données par rapport à un schéma
 * @param {Array} data Tableau d'objets lignes
 * @param {Object} schema Schéma de validation
 * @returns {Object} Résultats de validation
 */
export function validateDataset(data, schema) {
  const errors = [];
  const validData = [];
  
  // Vérification de la présence des colonnes du schéma dans l'en-tête
  if (data.length > 0) {
    const fileColumns = Object.keys(data[0]);
    const missingColumns = schema.columns
      .filter(col => col.required && !fileColumns.includes(col.name))
      .map(col => col.name);
      
    if (missingColumns.length > 0) {
      return {
        status: 'failed',
        totalLines: data.length,
        validLines: 0,
        invalidLines: data.length,
        errors: [{
          row: 1,
          column: 'Toutes',
          reason: `Fichier non conforme : Colonnes obligatoires manquantes dans l'en-tête [${missingColumns.join(', ')}].`
        }],
        validData: []
      };
    }
  } else {
    return {
      status: 'failed',
      totalLines: 0,
      validLines: 0,
      invalidLines: 0,
      errors: [{
        row: 0,
        column: 'Toutes',
        reason: 'Le fichier importé est vide.'
      }],
      validData: []
    };
  }

  // Validation ligne par ligne
  data.forEach((row, index) => {
    const rowIndex = index + 2; // +2 car index 0 est la ligne 2 (la ligne 1 étant l'en-tête)
    const result = validateRow(row, rowIndex, schema);
    
    if (result.valid) {
      validData.push(row);
    } else {
      errors.push(...result.errors);
    }
  });
  
  // Détermination du statut global
  let status = 'success';
  if (errors.length > 0) {
    status = validData.length === 0 ? 'failed' : 'partial';
  }
  
  return {
    status,
    totalLines: data.length,
    validLines: validData.length,
    invalidLines: data.length - validData.length,
    errors,
    validData
  };
}
