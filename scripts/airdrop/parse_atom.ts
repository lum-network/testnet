import * as fs from 'fs';
import * as csv from 'fast-csv';

// Make sure we have the required destination folder
if(!fs.existsSync('atom')){
    fs.mkdirSync('atom');
}

// Create the CSV stream
const csvStream = csv.format({ headers: true });
csvStream.pipe(fs.createWriteStream('atom/out.csv')).on('end', () => process.exit());

class Entry {
    delegator_address: string;
    shares: number;
    validator_addresses: string[];

    constructor(addr: string, shares: number, addresses: string[]) {
        this.delegator_address = addr;
        this.shares = shares;
        this.validator_addresses = addresses;
    }
}

interface Entries {
    [key: string]: Entry;
}

const main = () => {
    //@ts-ignore
    const entries: Entries = [];

    // Adresses to exclude (Binance, Coinbase, Kraken)
    const excludedValidators = ['cosmosvaloper156gqf9837u7d4c4678yt3rl4ls9c5vuursrrzf', 'cosmosvaloper1a3yjj7d3qnx4spgvjcwjq9cw9snrrrhu5h6jll', 'cosmosvaloper1nm0rrq86ucezaf8uj35pq9fpwr5r82clzyvtd8'];
    const excludedDelegators = [
        'cosmos1mfap94z3fn0c6qhsj9r2xzkpl4u32thj32yjaw',
        'cosmos19m522gc38lcjcrtryht7852zdcf02fy5dl3485',
        'cosmos18003m32kneftuxk32cwxyugdnlaak2dqak0tcu',
        'cosmos1utj9vnja2nma8mkgjmtwee0vgm6g9ejewznxrr',
        'cosmos1s08yeaa8npqzmxsxlkrkyjp0xy3l92eusrxv5g',
        'cosmos1ryfnnxsqppmqm4xyzmf8m963gg2vc5wturjueg',
        'cosmos180a0flgynja8nxhethd2qkzrcnet606jf838yx',
        'cosmos1mcl6mwgsgudjkpxaedzfhwy9pws5xv9vhq7udx',
        'cosmos1aasymukl7xe84mzs75va9ncwg8j3g2vkvrudcp',
        'cosmos108fjyav0rdxh4ufvz4ru5s98w76z4uv6rhjea9',
        'cosmos1dlg5dqcx36rfc50m5zcw7zd60jkm05npasyycs',
        'cosmos1tjmu8sd5y49k8dyk4u7zvdzg28whthc3u7002n',
        'cosmos13t76x3dmsavfsfjdd9nffuzvs3m2jnm270du0a',
        'cosmos1rqunfs4fe76r7gvpnww8e4hfafych357qgt2ch',
        'cosmos1ej98aw2wdkvknrd3hv4zmfwmxs9q423y3xqfm9',
        'cosmos1emsh5d3d0dqwusln0jguvzh0mq8jve6a00pkjz',
        'cosmos1p4z4ty9077r437jtrtfyh3r6fx7dhcw8jr0vut',
        'cosmos18zqu7jy7al3c202nnl8jstgm6sq7z6q35wv7fq',
        'cosmos1ddspvxws5dlnx93n430z0ngw3m4k508rnercyf'
    ];
    
    const rawData = fs.readFileSync('atom/export.json');
    const data = JSON.parse(rawData.toString());

    let processedUnique = 0;
    let processedDuplicate = 0;
    let unprocessedExchange = 0;
    let unprocessedDelegators = 0;

    for (const line of data['app_state']['staking']['delegations']) {
        if (excludedDelegators.includes(line['delegator_address'])){
            unprocessedDelegators++;
            continue;
        }

        if (excludedValidators.includes(line['validator_address'])) {
            unprocessedExchange++;
            continue;
        }

        if (entries[line['delegator_address']] === undefined) {
            entries[line['delegator_address']] = new Entry(
                line['delegator_address'],
                parseInt(line['shares'], 10),
                [line['validator_address']]
            );
            processedUnique++;
        } else {
            entries[line['delegator_address']].shares += parseInt(line['shares'], 10);
            entries[line['delegator_address']].validator_addresses.push(line['validator_address']);
            processedDuplicate++;
        }

        console.log(`Processed ${line['delegator_address']}`);
    }

    console.log(`Processed ${processedUnique} unique / ${processedDuplicate} duplicate / ${unprocessedExchange} unprocessed validators / ${unprocessedDelegators} unprocessed delegators`);
    for(const entry in entries){
        csvStream.write({
            delegator_address: entries[entry].delegator_address, 
            shares: entries[entry].shares, 
            validator_addresses: entries[entry].validator_addresses.join(' / ')
        });
    }
    csvStream.end();
};

main();