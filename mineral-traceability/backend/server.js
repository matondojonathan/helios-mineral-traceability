'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'mychannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'mineral';

const WALLET_PATH = path.join(__dirname, 'wallet');

const PROFILES = {
    org1: path.resolve(
        __dirname,
        '../../test-network/organizations/peerOrganizations/org1.example.com/connection-org1.yaml'
    ),

    org2: path.resolve(
        __dirname,
        '../../test-network/organizations/peerOrganizations/org2.example.com/connection-org2.yaml'
    )
};

// Connexion à Hyperledger Fabric
async function callFabric(
    readOnly,
    method,
    args = [],
    organization = 'org1'
) {
    const gateway = new Gateway();

    try {
        const profilePath = PROFILES[organization];

        if (!profilePath || !fs.existsSync(profilePath)) {
            throw new Error(`Profil Fabric introuvable : ${organization}`);
        }

        const identityLabel = organization === 'org2'
            ? 'adminOrg2'
            : (process.env.FABRIC_IDENTITY_LABEL || 'admin');

        const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

        const identity = await wallet.get(identityLabel);

        if (!identity) {
            throw new Error(
                `Identité ${identityLabel} introuvable dans le wallet.`
            );
        }

        const expectedMsp = organization === 'org2'
            ? 'Org2MSP'
            : 'Org1MSP';

        if (identity.mspId !== expectedMsp) {
            throw new Error(
                `Identité incorrecte : ${identityLabel} appartient à ${identity.mspId}, attendu ${expectedMsp}.`
            );
        }

        const connectionProfile = yaml.load(
            fs.readFileSync(profilePath, 'utf8')
        );

        await gateway.connect(connectionProfile, {
            wallet,
            identity: identityLabel,
            discovery: {
                enabled: true,
                asLocalhost: true
            }
        });

        const network = await gateway.getNetwork(CHANNEL_NAME);
        const contract = network.getContract(CHAINCODE_NAME);

        const result = readOnly
            ? await contract.evaluateTransaction(method, ...args)
            : await contract.submitTransaction(method, ...args);

        const output = result.toString();

        return output ? JSON.parse(output) : null;

    } finally {
        gateway.disconnect();
    }
}

// Vérifier l'état de l'API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'mineral-traceability-api'
    });
});

// Récupérer tous les lots
app.get('/api/lots', async (req, res, next) => {
    try {
        const lots = await callFabric(
            true,
            'GetAllLots'
        );

        res.json(lots);
    } catch (error) {
        next(error);
    }
});

// Consulter un lot
app.get('/api/lots/:id', async (req, res, next) => {
    try {
        const lot = await callFabric(
            true,
            'ReadLot',
            [req.params.id]
        );

        res.json(lot);
    } catch (error) {
        next(error);
    }
});

// Créer un lot
app.post('/api/lots', async (req, res, next) => {
    try {
        const { id, type, origin, weight, owner } = req.body;

        if (
            !id ||
            !type ||
            !origin ||
            !owner ||
            !Number.isFinite(Number(weight)) ||
            Number(weight) <= 0
        ) {
            return res.status(400).json({
                error: 'Données du lot invalides'
            });
        }

        const lot = await callFabric(false, 'CreateLot', [
            id,
            type,
            origin,
            String(weight),
            owner
        ]);

        res.status(201).json(lot);

    } catch (error) {
        next(error);
    }
});

// Transférer un lot
app.post('/api/lots/:id/transfer', async (req, res, next) => {
    try {
        const { newOwner } = req.body;

        if (!newOwner || !newOwner.trim()) {
            return res.status(400).json({
                error: 'newOwner est obligatoire'
            });
        }

        const result = await callFabric(false, 'TransferLot', [
            req.params.id,
            newOwner.trim()
        ]);

        res.json(result);

    } catch (error) {
        next(error);
    }
});

// Consulter l'historique
app.get('/api/lots/:id/history', async (req, res, next) => {
    try {
        const history = await callFabric(
            true,
            'GetLotHistory',
            [req.params.id]
        );

        res.json(history);

    } catch (error) {
        next(error);
    }
});

// Certifier un lot avec l'identité Org2MSP
app.post('/api/lots/:id/certify', async (req, res, next) => {
    try {
        const result = await callFabric(
            false,
            'CertifyLot',
            [req.params.id],
            'org2'
        );

        res.json(result);

    } catch (error) {
        next(error);
    }
});

// Gestion centralisée des erreurs
app.use((error, req, res, next) => {
    console.error('Erreur API :', error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        error: 'Erreur lors de la communication avec Hyperledger Fabric.',
        details: error.message
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`API disponible sur http://localhost:${PORT}`);
});