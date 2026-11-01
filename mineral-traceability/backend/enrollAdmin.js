'use strict';

const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');

async function main() {
	const walletPath = path.join(__dirname, 'wallet');
	const wallet = await Wallets.newFileSystemWallet(walletPath);

	const certPath = path.resolve(
		__dirname,
		'../..',
		'test-network',
		'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem'
);

const keyDir = path.resolve(
	__dirname,
	'../..',
	'test-network',
	'organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore'
);

if (!fs.existsSync(certPath)) {
	throw new Error(`Certificat introuvable : ${certPath}`);
}

const keyFiles = fs.readdirSync(keyDir)
	.filter(file => file.endsWith('_sk') || file == 'priv_sk');

if (keyFiles.length !== 1) {
	throw new Error(
		`Une seule clé privée attendue dans ${keyDir}, trouvées : ${keyFiles.length}`
	);
}

const certificate = fs.readFileSync(certPath, 'utf8');
const privateKey = fs.readFileSync(
	path.join(keyDir, keyFiles[0]),
	'utf8'
);

const identity = {
	credentials: {
		certificate,
		privateKey
	},
	mspId: 'Org1MSP',
	type: 'X.509'
};

await wallet.put('admin', identity);
console.log('Identité Admin Org1 importée dans le portefeuille local.');
}

main().catch(error => {
	console.error('Échec de préparation du portefeuille :', error.message);
	process.exit(1);
});
