import * as fs from 'fs';
import * as csv from 'fast-csv';

// Make sure we have the required destination folder
if(!fs.existsSync('osmo')){
    fs.mkdirSync('osmo');
}

// Create the CSV stream
const csvStream = csv.format({ headers: true });
csvStream.pipe(fs.createWriteStream('osmo/out.csv')).on('end', () => process.exit());

class Entry {
    address: string;
    lp: boolean;
    lockedLp: boolean;

    constructor(addr: string, shares: number, addresses: string[], lp: boolean, lockedLp: boolean) {
        this.address = addr;
        this.lp = lp;
        this.lockedLp = lockedLp;
    }
}

interface Entries {
    [key: string]: Entry;
}

const main = () => {
    //@ts-ignore
    const entries: Entries = [];

    // Adresses to exclude (Binance, Coinbase, Kraken)
    const excludedAddresses = [];
    const rawData = fs.readFileSync('osmo/export.json');
    const data = JSON.parse(rawData.toString());

    let processedLp = 0;
    let processedLockedLp = 0;

    // LP Token holders
    for (const line of data['app_state']['bank']['balances']){
        let lp = false;

        for (const coin of line['coins']){
            if(String(coin['denom']).startsWith('gamm')){
                lp = true;
            }
        }

        // If not liquidity provider, continue to the next one
        if(!lp){
            continue;
        }

        // Only make sure we have it only one time
        if (entries[line['address']] === undefined) {
            entries[line['address']] = new Entry(
                line['address'],
                0,
                null,
                true,
                false
            );
            processedLp++;
        }
    }

    // Locked LP token holders
    for (const line of data['app_state']['lockup']['locks']){
        const addr = line.owner;

        let lp = false;
        for (const coin of line['coins']){
            if(String(coin['denom']).startsWith('gamm')){
                lp = true;
            }
        }

        if(!lp){
            continue;
        }

        if (entries[addr] === undefined){
            entries[addr] = new Entry(
                addr,
                0,
                null,
                false, 
                true
            );
        } else {
            entries[addr].lockedLp = true;
        }
        processedLockedLp++;
    }

    console.log(`Processed ${processedLp} LP / ${processedLockedLp} locked LP`);
    for(const entry in entries){
        csvStream.write({
            address: entries[entry].address, 
            liquidity_provider: entries[entry].lp, 
            locked_liquidity_provider: entries[entry].lockedLp
        });
    }
    csvStream.end();
};

main();