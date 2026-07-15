# Document de Design — Portail d'Ingestion & Validation DataFlow CI

Ce document décrit les choix d'architecture, de conception et les détails techniques de l'application conçue pour résoudre la problématique d'ingestion de données de **DataFlow CI** pour le recrutement de **Stagiaire Software Engineer — Artefact Côte d'Ivoire**.

---

## 🏗️ Choix d'Architecture

### 1. Single Page Application (SPA) Autonome
Pour ce prototype (MVP), nous avons opté pour une architecture **SPA (Single Page Application)** construite en HTML5/CSS3/ES6 standard. 
* **Pourquoi ce choix ?** L'application est 100% autonome, ne nécessite aucune installation de serveur backend complexe ni de base de données lourde, et s'exécute directement dans le navigateur du client.
* **Persistance** : Les configurations (sources, schémas de validation) et les rapports d'ingestion historiques sont persistés localement via `localStorage`.

### 2. Moteur de Validation Modulaire (`validator.js`)
La validation des données est séparée de la logique d'affichage. Elle vérifie séquentiellement pour chaque ligne :
* La présence des colonnes obligatoires (Headers).
* Le respect des types attendus (dates, nombres, chaînes de caractères).
* Le format via des expressions régulières (Regex) dynamiques (ex: ID client type `^CLI-\d{6}$`).
* Le respect des énumérations de valeurs permises (ex: régions autorisées).
* Des règles métiers de cohérence financière (ex: interdiction de montants négatifs).

### 3. Traitement Asynchrone & Non-Bloquant (`queue.js`)
L'une des contraintes majeures est d'empêcher le blocage de l'interface utilisateur pendant la validation d'un gros fichier.
* **Solution** : Une file d'attente (Queue) traite le fichier par paquets de **200 lignes**. Après chaque paquet, un court délai (`setTimeout`) est programmé. Cela redonne le contrôle au navigateur (event loop) pour mettre à jour la barre de progression, afficher les notifications de progression en temps réel, et maintenir une réactivité à 60 FPS pour l'utilisateur.

---

## 📊 Choix des Visualisations du Tableau de Bord

Pour aider DataFlow CI à superviser ses flux de données, nous avons intégré trois graphiques interactifs (via `Chart.js`) :

1. **Évolution Chronologique du Volume Ingéré (Line Chart)**
   * *Objectif* : Permet de repérer les tendances de trafic de données au fil des jours et de dimensionner l'infrastructure lors des pics d'envoi.
2. **Répartition de Conformité (Doughnut Chart)**
   * *Objectif* : Donne en un coup d'œil l'état de santé de l'intégration globale. Une proportion élevée de fichiers "rejetés" ou "partiels" signale un problème de qualité de données récurrent chez les clients.
3. **Activité Comparée par Source (Double-Y Bar Chart)**
   * *Objectif* : Compare le nombre de fichiers reçus (axe gauche) par rapport au volume total de lignes ingérées (axe droit) pour chaque source. Cela permet d'identifier les clients les plus actifs et ceux qui s'écartent du format standard (générant beaucoup d'erreurs).

---

## 🔒 Authentification & Sécurité

L'accès est restreint par un écran de connexion. Bien que le MVP utilise une vérification simple en local (Identifiant par défaut : `admin@dataflow.ci` / `admin123`), l'architecture modulaire permet une transition transparente vers un service d'authentification centralisé (comme OAuth 2.0 ou Firebase Auth).

---

## 🚀 Évolutivité vers la Production (Scale-Up)

Pour déployer cette solution à grande échelle chez DataFlow CI (gestion de volumes de données massifs > 1 GB) :
1. **Migration Backend** : Transposer le moteur `validator.js` dans un service Node.js (Express/Fastify) ou Go.
2. **File d'Attente Distribuée** : Remplacer la file d'attente en mémoire par un courtier de messages comme **RabbitMQ** ou **AWS SQS** pour distribuer le travail de validation à des workers conteneurisés.
3. **Base de Données** : Remplacer `localStorage` par une base relationnelle comme **PostgreSQL** pour stocker les configurations de schémas (avec audit de versioning) et les logs d'ingestion.
