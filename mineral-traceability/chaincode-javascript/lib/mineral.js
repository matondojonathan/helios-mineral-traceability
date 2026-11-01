'use strict';

const { Contract } = require('fabric-contract-api');

class MineralContract extends Contract {

    // Créer un lot
    async CreateLot(ctx, id, type, origin, weight, owner) {
        const old = await ctx.stub.getState(id);

        if (old.length > 0) {
            throw new Error('Ce lot existe deja');
        }

        const lot = {
            id,
            type,
            origin,
            weight: Number(weight),
            owner,
            certified: false
        };

        await ctx.stub.putState(
            id,
            Buffer.from(JSON.stringify(lot))
        );

        return JSON.stringify(lot);
    }

    // Lire un lot par son identifiant
    async ReadLot(ctx, id) {
        const data = await ctx.stub.getState(id);

        if (!data.length) {
            throw new Error('Lot introuvable');
        }

        return data.toString();
    }

    // Récupérer tous les lots
    async GetAllLots(ctx) {
        const iterator = await ctx.stub.getStateByRange('', '');
        const lots = [];

        try {
            let result = await iterator.next();

            while (!result.done) {
                const entry = result.value;

                if (entry.value && entry.value.length > 0) {
                    lots.push(JSON.parse(entry.value.toString('utf8')));
                }

                result = await iterator.next();
            }
        } finally {
            await iterator.close();
        }

        return JSON.stringify(lots);
    }

    // Transférer la propriété d'un lot
    async TransferLot(ctx, id, newOwner) {
        const data = await ctx.stub.getState(id);

        if (!data.length) {
            throw new Error('Lot introuvable');
        }

        const lot = JSON.parse(data.toString());

        lot.owner = newOwner;

        await ctx.stub.putState(
            id,
            Buffer.from(JSON.stringify(lot))
        );

        return JSON.stringify(lot);
    }

    // Certifier un lot
    async CertifyLot(ctx, id) {
        const mspId = ctx.clientIdentity.getMSPID();

        if (mspId !== 'Org2MSP') {
            throw new Error(
                'Seule l autorite de certification Org2MSP peut certifier un lot'
            );
        }

        const data = await ctx.stub.getState(id);

        if (!data.length) {
            throw new Error('Lot introuvable');
        }

        const lot = JSON.parse(data.toString());

        if (lot.certified) {
            throw new Error('Lot deja certifie');
        }

        lot.certified = true;
        lot.certifiedBy = mspId;

        await ctx.stub.putState(
            id,
            Buffer.from(JSON.stringify(lot))
        );

        return JSON.stringify(lot);
    }

    // Consulter l'historique d'un lot
    async GetLotHistory(ctx, id) {
        const iterator = await ctx.stub.getHistoryForKey(id);
        const history = [];

        try {
            let item = await iterator.next();

            while (!item.done) {
                const modification = item.value;

                const rawValue = modification.value;

                let value = null;

                if (rawValue && rawValue.length > 0) {
                    value = JSON.parse(
                        Buffer.from(rawValue).toString('utf8')
                    );
                }

                history.push({
                    txId: null,
                    timestamp: null,
                    isDelete: false,
                    value
                });

                item = await iterator.next();
            }
        } finally {
            await iterator.close();
        }

        return JSON.stringify(history);
    }
}

module.exports = MineralContract;