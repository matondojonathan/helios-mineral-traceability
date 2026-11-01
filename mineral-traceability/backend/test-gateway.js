const { Gateway, Wallets } = require('fabric-network');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

async function main() {
  const wallet = await Wallets.newFileSystemWallet(
    path.join(__dirname, 'wallet')
  );

  const profilePath = path.resolve(
    __dirname,
    '../../test-network/organizations/peerOrganizations/org1.example.com/connection-org1.yaml'
  );

  const profile = yaml.load(fs.readFileSync(profilePath, 'utf8'));
  const gateway = new Gateway();

  try {
    console.log('1. Connexion au Gateway...');

    await gateway.connect(profile, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true,
                    asLocalhost: true 
                }
    });

    console.log('2. Gateway connecté');

    const network = await gateway.getNetwork('mychannel');
    console.log('3. Channel mychannel accessible');

    const contract = network.getContract('mineral');

    const result = await contract.evaluateTransaction(
      'ReadLot',
      'LOTTEST01'
    );

    console.log('4. Résultat blockchain :');
    console.log(result.toString());

  } catch (error) {
    console.error('ÉCHEC DU TEST GATEWAY :');
    console.error(error);
  } finally {
    gateway.disconnect();
  }
}

main();