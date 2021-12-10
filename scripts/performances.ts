import * as fs from 'fs';
import { sleep } from '@cosmjs/utils';
import {
    LumClient,
    LumConstants,
    LumMessages,
    LumUtils,
    LumWallet,
    LumWalletFactory,
} from '@lum-network/sdk-javascript';

// Make sure we have the required destination folder
if (!fs.existsSync('tmp')) {
    fs.mkdirSync('tmp');
}

const RPC_URL = 'https://node0.testnet.lum.network:443/rpc';
const CHAIN_ID = 'lum-network-testnet-1';

// == IMPORTANT ==
// This test assume the seed sender address is in your lumd keys and is not an offline signer
// The seed sender must contain at least VUS * SEED_ULUM amount
const SEED_OUTPUT = 'tmp/perfs-seed-tx.json';
const SEED_SENDER = 'lum1uqdfkvpjmcq69tnt2d0gkta5pqw9m3g8ggajhu';
const VUS = 100; // number of virtual users
const DURATION = 30_000; // duration in milliseconds

const SEED_ULUM = 1_000;

interface Results {
    tx_count: number;
    success_count: number;
    error_count: number;
    broadcast_errors: unknown[];
    errors: unknown[];
}

const randomWallet = async (): Promise<LumWallet> => {
    return await LumWalletFactory.fromPrivateKey(LumUtils.generatePrivateKey());
};

const initVus = async (): Promise<LumWallet[]> => {
    console.log(`[init] Seed stage started...`);

    const wallets: LumWallet[] = [];
    const tx = {
        body: {
            messages: [],
            memo: '',
            timeout_height: '0',
        },
        auth_info: { signer_infos: [], fee: { amount: [], gas_limit: `${50_000 * VUS}`, payer: '', granter: '' } },
        signatures: [],
    };

    for (let i = 0; i < VUS; i++) {
        const w = await randomWallet();
        wallets.push(w);
        tx.body.messages.push({
            '@type': '/cosmos.bank.v1beta1.MsgSend',
            from_address: SEED_SENDER,
            to_address: w.getAddress(),
            amount: [{ denom: 'ulum', amount: SEED_ULUM.toString() }],
        });
    }

    fs.writeFile(SEED_OUTPUT, JSON.stringify(tx, undefined, 4), function (err) {
        if (err) {
            console.error('[init] critical error: ', err);
        }
    });

    console.log(
        `[init] ${wallets.length} virtual users initialized, please seed those wallets with LUM using the following commands:`
    );
    console.log('[init] 1. Sign transaction');
    console.log(
        `[init]   $> lumd tx sign ${SEED_OUTPUT} --chain-id ${CHAIN_ID} --node ${RPC_URL} --from ${SEED_SENDER} --output-document ${SEED_OUTPUT.replace(
            '.json',
            '.signed.json'
        )}`
    );
    console.log('[init] 2. Broadcast transaction');
    console.log(`[init]   $> lumd tx broadcast tmp/perfs-seed-tx.signed.json --node ${RPC_URL}`);

    console.log(`[init] Waiting for tx broadcast (do not exit script)...`);
    const clt = await LumClient.connect(RPC_URL);
    while (true) {
        await sleep(1000);
        const b = await clt.getBalance(wallets[0].getAddress(), LumConstants.MicroLumDenom);
        if (parseInt(b.amount) >= SEED_ULUM) {
            break;
        }
    }
    console.log(`[init] Seed stage done`);
    return wallets;
};

const runVu = async (w: LumWallet, results: Results): Promise<void> => {
    const clt = await LumClient.connect(RPC_URL);
    const startsAt = new Date();

    while (new Date().getTime() - startsAt.getTime() < DURATION) {
        // Sleep first to create anthropy
        await sleep(Math.random() * 1000);
        // Send ulum to random account
        const acc = await clt.getAccount(w.getAddress());
        const doc = {
            chainId: CHAIN_ID,
            fee: { amount: [{ denom: LumConstants.MicroLumDenom, amount: '0' }], gas: '100000' },
            memo: '',
            messages: [
                LumMessages.BuildMsgSend(w.getAddress(), (await randomWallet()).getAddress(), [
                    { denom: LumConstants.MicroLumDenom, amount: '1' },
                ]),
            ],
            signers: [
                {
                    accountNumber: acc.accountNumber,
                    sequence: acc.sequence,
                    publicKey: w.getPublicKey(),
                },
            ],
        };
        try {
            results.tx_count++;
            const broadcastResult = await clt.signAndBroadcastTx(w, doc);
            if (LumUtils.broadcastTxCommitSuccess(broadcastResult)) {
                results.success_count++;
            } else {
                results.error_count++;
                results.broadcast_errors.push(broadcastResult);
            }
        } catch (err) {
            results.error_count++;
            results.errors.push(err);
        }
    }
};

const runVus = async (wallets: LumWallet[], results: Results): Promise<void> => {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < wallets.length; i++) {
        promises.push(runVu(wallets[i], results));
    }

    await Promise.all(promises);
};

const runLogging = (results: Results): (() => void) => {
    let isRunning = true;
    new Promise(async (resolve) => {
        while (true) {
            if (!isRunning) {
                break;
            } else {
                console.log(
                    `[logging] ${results.tx_count} txs, ${results.success_count} successes, ${results.error_count} errors (${results.broadcast_errors.length} broadcast)`
                );
                await sleep(1000);
            }
        }
        resolve(undefined);
    });
    return () => {
        isRunning = false;
    };
};

const main = async () => {
    const wallets = await initVus();
    const results: Results = {
        tx_count: 0,
        success_count: 0,
        error_count: 0,
        broadcast_errors: [],
        errors: [],
    };
    const stopLogging = runLogging(results);
    await runVus(wallets, results);
    stopLogging();
    console.log(
        `[results] ${results.tx_count} txs, ${results.success_count} successes, ${results.error_count} errors (${results.broadcast_errors.length} broadcast)`
    );
    console.log(`[results] dumping errors`, results.errors);
    console.log(`[results] dumping broadcast errors`, results.broadcast_errors);
};

main();
