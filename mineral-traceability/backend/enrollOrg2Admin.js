'use strict';

const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');

async function main() {
    const walletPath = path.join(__dirname, 'wallet');

    const mspPath = path.resolve(
        __dirname,
        '../../test-network/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp'
    );

    const certificatePath = path.join(
        mspPath,
        'signcerts',
        'Admin@org2.example.com-cert.pem'
    );

    const privateKeyDirectory = path.join(mspPath, 'keystore');

    const privateKeyFile = fs.readdirSync(privateKeyDirectory)[0];

    if (!privateKeyFile) {
        throw new Error('Clé privée Org2 introuvable.');
    }

    const certificate = fs.readFileSync(certificatePath, 'utf8');

    const privateKey = fs.readFileSync(
        path.join(privateKeyDirectory, privateKeyFile),
        'utf8'
    );

    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const existingIdentity = await wallet.get('adminOrg2');

    if (existingIdentity) {
        console.log('L’identité adminOrg2 existe déjà.');
        return;
    }

    const identity = {
        credentials: {
            certificate,
            privateKey
        },
        mspId: 'Org2MSP',
        type: 'X.509'
    };

    await wallet.put('adminOrg2', identity);

    console.log('Identité adminOrg2 importée avec succès.');
    console.log('Organisation : Org2MSP');
}

main().catch(error => {
    console.error('Erreur lors de l’importation :', error.message);
    process.exit(1);
});