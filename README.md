# Lum Network - Private testnet

You already know the drill, but you'll find all the informations here!

## Private testnet program
- The main communication channel is [Discord](https://discord.gg/KwyVvnBcXF)
- If you have been invited to join this testnet then you should have access to the `internal validators` channels
- The Lum Foundation will grant 1,000,000 LUM to all the validators succesfully passing the testnet phases
    - 6 months cliff; 24 months linear continous vesting; staking capability over vested assets
    - receiving the testnet grant does not mean you will receive the mainnet grant
    - validators must have a production like setup in order to pass the testnet phase completely
- 20 experienced validators have been invited, we definitely expect to have every single one of you pass this phase easily

## Timeline
### Phase 1: Gentx submission deadline
November 21st, 1:00PM UTC

You must submit your gentx (see instructions below) by this time to be included in the genesis.

[./config-genesis.json](./config-genesis.json) contains the genesis configuration (without any account yet). Feel free to comment on that over Discord.

### Phase 2: Testnet Genesis Launch
November 22nd, 5:00PM UTC

You must have your validator up and running by this time and be available for further instructions if necessary.

### Phase 3: Tests period
*From November 22nd, 5:00PM UTC - Until December 6th, 1:00PM UTC*

During this phase everyone's invited to test the network.

We will run a variety of tests to ensure the final validator set selected for the mainnet launch is strong and stable.

Do not hesitate to report any kind of issues on Discord as it is one of the goals of this phase.

### Phase 4: Results
*December 6th, 1:00PM UTC*

Announcement of the validators that passed the testnet phase with success. We definitely expect all validators invited to the private testnet to easily pass the test phase since only experienced validators have been invited.

## Key informations

### Chain ID
```bash
lum-network-testnet-1
```

### Genesis file
Available in this repository: [./config-genesis.json](./genesis.json)

```sh
curl -s  https://raw.githubusercontent.com/lum-network/testnet/master/config-genesis.json > ~/.lumd/config/genesis.json

sha256sum ~/.lumd/config/genesis.json
[TODO/UPCOMING]
```

### Seed nodes
Available here: [./seeds.txt](./seeds.txt)

```
[TODO/UPCOMING]
```

### lumd version

```sh
$ lumd version --long
name: lum
server_name: lumd
version: 1.0.2
commit: e7e834f7459808f8a00973b1913c2a7df851caf3
```

## Installation

**Prerequisites:** Make sure to have [Golang >=1.17](https://golang.org/).

### Make sure your Go configuration looks like that one (especially the GO111Module):

```sh
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export GO111MODULE=on
export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin
```

### Clone the repository

```sh
git clone https://github.com/lum-network/chain.git
cd chain
git checkout v1.0.2
make install
```

### Check that you have the right lumd version installed:

```sh
lumd version --long
```
```
name: lum
server_name: lumd
version: 1.0.2
commit: e7e834f7459808f8a00973b1913c2a7df851caf3
```

### Minimum hardware requirements

- 4 CPU ores
- 16 GB RAM
- 200 GB of disk space
- 100 mbps bandwidth

## Setup validator node

### Generate genesis transaction (gentx)

1. Initialize the Lum Network directories and create the local genesis file with the correct chain-id:

   ```sh
   lumd init <moniker-name> --chain-id=lum-network-testnet-1
   ```

2. Create a local key pair:

   ```sh
   lumd keys add <key-name>
   ```

3. Add your account to your local genesis file with the following amount (1Mi LUM + 1 LUM) and the key you just created.

   ```sh
   lumd add-genesis-account $(lumd keys show <key-name> -a) 1000001000000ulum
   ```

4. Create the gentx, use `1000000000000ulum` (1Mi LUM):

   ```sh
   lumd gentx <key-name> 1000000000000ulum \
       --chain-id=lum-network-testnet-1 \
       --moniker="<moniker>" \
       --commission-rate="0.01" \
       --[other custom params]
   ```

   If all goes well, you will see a message similar to the following:

   ```sh
   Genesis transaction written to "/home/user/.lumd/config/gentx/gentx-******.json"
   ```

### Submit genesis transaction

- Fork [the testnet repo](https://github.com/lum-network/testnet) into your Github account

- Clone your repo using

  ```bash
  git clone https://github.com/<your-github-username>/testnet
  ```

- Copy the generated gentx json file to `<repo_path>/gentxs/`

  ```sh
  > cd testnet
  > cp ~/.lumd/config/gentx/gentx-*****.json ./gentxs/gentx-<moniker-name>.json
  ```

- Commit and push to your repo
- Create a PR onto https://github.com/lum-network/testnet
- Only PRs from invited validators will be accepted. This is to ensure the network successfully starts on time.

## Running in production

Download Genesis file when the time is right.
```sh
curl -s  https://raw.githubusercontent.com/lum-network/testnet/master/genesis.json > ~/.lumd/config/genesis.json

sha256sum ~/.lumd/config/genesis.json
[TODO/UPCOMING]
```

Create a systemd file for your Lum Network service:

```sh
sudo nano /etc/systemd/system/lumd.service
```

Copy and paste the following and update `<YOUR_HOME_PATH>`:

```sh
[Unit]
Description=Lum Network daemon
After=network-online.target

[Service]
User=lum
ExecStart=/<YOUR_HOME_PATH>/go/bin/lumd start --p2p.laddr tcp://0.0.0.0:26656 --home /<YOUR_HOME_PATH>/.lumd
Restart=on-failure
RestartSec=3
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
```

2
**This assumes `$HOME/go` to be your Go workspace, and `$HOME/.lumd` to be your directory for config and data. Your actual directory locations may vary.**

Enable and start the new service:

```sh
sudo systemctl enable lumd
sudo systemctl start lumd
```

Check status:

```sh
lumd status
```

Check logs:

```sh
journalctl -u lumd -f
```
