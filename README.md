HELIOS — Plateforme de traçabilité minière
Prototype académique de traçabilité de lots de minerais (cobalt et coltan) fondé sur Hyperledger Fabric, Node.js/Express et React/Vite.

1. Présentation
HELIOS permet d'enregistrer des lots, de consulter leurs informations, de transférer leur propriété, de consulter les valeurs successives de leur historique et d'enregistrer une certification par une identité Fabric autorisée. Le chaincode est exécuté sur un réseau privé Hyperledger Fabric et ses fonctions sont exposées par une API REST consommée par l'interface web.

État réel du prototype : la configuration actuellement utilisée comprend deux organisations (Org1MSP et Org2MSP). Elle ne comprend pas encore le consortium complet de trois organisations demandé dans le cahier des charges, ni un canal privé, ni un mécanisme probant de vérification « hors zone de conflit ». Ces éléments sont identifiés comme travaux futurs.
2. Démonstration et dépôt
- Application web : https://helios-mineral-traceability-rho.vercel.app
- Dépôt : https://github.com/matondojonathan/helios-mineral-traceability
- Branche : main
- Frontend : Vercel
- API de démonstration : tunnel Cloudflare Quick Tunnel temporaire configuré dans frontend/src/App.jsx.
Le frontend est hébergé sur Vercel, mais le réseau Fabric et le backend de démonstration restent exécutés dans l'environnement local WSL de l'équipe. Le domaine trycloudflare.com est temporaire : il peut changer ou devenir indisponible lorsque cloudflared s'arrête.
3. Architecture
Navigateur
   │
   ▼
React + Vite + Tailwind CSS (Vercel)
   │ HTTPS / JSON
   ▼
API REST Node.js + Express
   │ Fabric Gateway SDK
   ▼
Hyperledger Fabric — canal mychannel
   ├── Org1MSP / peer0.org1.example.com
   └── Org2MSP / peer0.org2.example.com
          └── identité autorisée à appeler CertifyLot
Élément	Configuration actuelle
Blockchain	Hyperledger Fabric 2.5, réseau de développement test-network
Canal	mychannel
Chaincode	JavaScript, nom mineral
Organisations	Org1MSP et Org2MSP
Politique d'endossement	AND('Org1MSP.peer','Org2MSP.peer') (configuration du chaincode déployé)
Backend	Node.js, Express, fabric-network
Frontend	React 19, Vite, Tailwind CSS
Hébergement frontend	Vercel


Le dépôt contient le frontend, le backend et le code source du chaincode. Il ne contient pas le dossier complet test-network, les certificats, les identités, le wallet ou les clés privées. Ces éléments doivent être créés localement et ne doivent jamais être publiés.
4. Organisations et autorisations
- Org1MSP : identité utilisée par défaut par le backend pour les opérations ordinaires.
- Org2MSP : identité utilisée par le backend pour appeler CertifyLot.
- Le chaincode vérifie le MSP du client et refuse CertifyLot si le MSP n'est pas Org2MSP.
Le cahier des charges cible au moins trois organisations (opérateur/cooperative minière, négociant et autorité de contrôle). La troisième organisation et ses règles de gouvernance restent à intégrer.
5. Modèle de données
Le lot contient actuellement :
Champ	Rôle
id	Identifiant unique et clé d'état
type	Type de minerai (ex. Cobalt, Coltan)
origin	Origine déclarée
weight	Poids numérique
owner	Propriétaire actuel
certified	Indicateur booléen de certification
certifiedBy	MSP certificateur, après certification


Les analyses, justificatifs documentaires et preuves géographiques ne sont pas encore présents dans le modèle. Le champ origin est une déclaration enregistrée, pas une preuve autonome de provenance physique.
6. Chaincode
Fichier : mineral-traceability/chaincode-javascript/lib/mineral.js.
Fonction	Description
CreateLot(ctx, id, type, origin, weight, owner)	Crée un lot si l'identifiant n'existe pas.
ReadLot(ctx, id)	Lit un lot par identifiant.
GetAllLots(ctx)	Retourne les lots de l'état courant.
TransferLot(ctx, id, newOwner)	Modifie le propriétaire du lot.
CertifyLot(ctx, id)	Certifie un lot uniquement si le client appartient à Org2MSP et si le lot n'est pas déjà certifié.
GetLotHistory(ctx, id)	Retourne les valeurs successives de l'historique de la clé.


La certification actuelle est un contrôle d'autorisation MSP ; elle ne vérifie pas automatiquement qu'un lot provient d'une zone non conflictuelle. L'historique renvoie les valeurs successives, mais les champs txId et timestamp sont actuellement renseignés à null par l'implémentation.
7. API REST
Fichier : mineral-traceability/backend/server.js
Base locale : http://localhost:3000/api
Méthode	Route	Fonction
GET	/health	État de l'API
GET	/lots	Liste des lots
GET	/lots/:id	Consultation d'un lot
POST	/lots	Création d'un lot
POST	/lots/:id/transfer	Transfert d'un lot
POST	/lots/:id/certify	Certification via Org2
GET	/lots/:id/history	Historique d'un lot


Exemples :
curl http://localhost:3000/api/health
curl http://localhost:3000/api/lots

curl -X POST http://localhost:3000/api/lots \
  -H 'Content-Type: application/json' \
  -d '{"id":"LOT003","type":"Cobalt","origin":"Lualaba-RDC","weight":800,"owner":"EntrepriseA"}'

curl -X POST http://localhost:3000/api/lots/LOT003/transfer \
  -H 'Content-Type: application/json' \
  -d '{"newOwner":"EntrepriseB"}'

curl http://localhost:3000/api/lots/LOT003/history
curl -X POST http://localhost:3000/api/lots/LOT003/certify
8. Structure du dépôt
helios-mineral-traceability/
├── frontend/
│   ├── public/
│   └── src/ (App.jsx, App.css, index.css)
├── mineral-traceability/
│   ├── backend/ (server.js, scripts d'inscription, profils et package.json)
│   └── chaincode-javascript/ (lib/mineral.js, package.json)
└── .gitignore
9. Prérequis
- Linux ou WSL2 (Ubuntu recommandé).
- Docker et Docker Compose.
- Git, Node.js et npm.
- Hyperledger Fabric 2.5 et les binaires/exemples nécessaires.
- Réseau Fabric préparé avec Org1, Org2, le canal mychannel et le chaincode mineral déployé.
- Identités administrateur Org1 et Org2 inscrites dans le wallet local du backend.
10. Installation et exécution locale
10.1 Cloner le dépôt
git clone https://github.com/matondojonathan/helios-mineral-traceability.git
cd helios-mineral-traceability
10.2 Préparer Fabric
Le dépôt ne fournit pas le réseau Fabric complet. Préparer séparément Fabric 2.5 et placer le dossier test-network de façon à obtenir la structure attendue par le backend :
helios-mineral-traceability/
├── test-network/
└── mineral-traceability/
    └── backend/
Démarrer le réseau, créer/utiliser mychannel, déployer le chaincode mineral et inscrire les identités admin et adminOrg2 dans mineral-traceability/backend/wallet.
10.3 Configurer et démarrer le backend
Créer localement mineral-traceability/backend/.env :
PORT=3000
CHANNEL_NAME=mychannel
CHAINCODE_NAME=mineral
FABRIC_IDENTITY_LABEL=admin
Vérifier et adapter les chemins des profils de connexion et certificats à l'installation Fabric locale. Le fichier connection-org1.yaml versionné contient un chemin absolu propre à l'environnement de développement initial. Ne jamais publier le wallet, les clés privées ou les certificats sensibles.
cd mineral-traceability/backend
npm install
npm start
L'API écoute par défaut sur http://localhost:3000.
10.4 Démarrer le frontend
Dans un autre terminal :
cd frontend
npm install
npm run dev
Vite affiche l'URL locale, généralement http://localhost:5173.

Build de production :
npm run build
npm run preview
11. Déploiement de démonstration
Le frontend est déployé sur Vercel. L'URL de l'API est actuellement définie directement dans frontend/src/App.jsx via API_URL et pointe vers un Cloudflare Quick Tunnel temporaire.

Pour une mise en production, il faudra héberger durablement le backend et Fabric, utiliser une URL d'API stable (idéalement via une variable d'environnement Vite), restreindre CORS, ajouter authentification et autorisation applicatives, protéger les identités Fabric et assurer HTTPS, journalisation et supervision.

Avertissement : le backend actuel utilise cors() sans restriction d'origine et les routes d'écriture ne disposent pas d'authentification applicative. Cette configuration est réservée à une démonstration contrôlée, pas à un service public de production.
12. Tests et validation
Les vérifications manuelles effectuées pendant le développement ont porté sur :
- la disponibilité de l'API via GET /api/health ;
- la récupération des lots via GET /api/lots ;
- la création et le transfert de lots ;
- la certification par l'identité Org2 ;
- la consultation de l'historique ;
- la compilation du frontend avec npm run build.
Le script test du backend affiche actuellement « Aucun test automatisé configuré » : il ne constitue pas une suite de tests. Des tests unitaires du chaincode, des tests d'intégration Gateway/API et des tests négatifs d'autorisation restent à ajouter.
13. Sécurité, limites et travaux futurs
1. Consortium : intégrer une troisième organisation et formaliser les rôles opérateur minier, négociant et autorité de contrôle.
2. Confidentialité : mettre en place un canal privé ou des collections de données privées pour les informations commerciales.
3. Analyses et preuves : étendre le modèle avec résultats d'analyses, justificatifs et preuves de provenance.
4. Certification responsable : définir une procédure vérifiable fondée sur des justificatifs et des règles documentées ; le booléen actuel ne prouve pas l'absence de conflit.
5. Contrôle d'accès : renforcer les règles métier, l'authentification API et les autorisations par rôle.
6. API et secrets : restreindre CORS, protéger les identités et clés privées et supprimer les chemins absolus spécifiques à une machine.
7. Historique : exploiter les métadonnées Fabric (transaction ID, horodatage et indicateur de suppression).
8. Qualité : ajouter des tests automatisés et une intégration continue.
9. Déploiement : héberger durablement Fabric et le backend dans un environnement sécurisé.
14. Équipe — Groupe 10
- BISALA LUAMBA ALBERT
- KAZADI NGUDIA GRACIA
- KITOMBOLE KONGOLO RAYANE
- MATONDO YUNGI JONATHAN
Projet réalisé dans le cadre du cours Blockchain et Cryptomonnaie. Ce document décrit l'état du code présent dans le dépôt et distingue explicitement les fonctions réalisées des limites et perspectives.
