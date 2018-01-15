# Blockchain Node

## Configuring

### For `development` please edit `config/default.yaml`:

```yaml
express:
    port: 8082
    debug: 5858
    host: localhost

auth:
    jwt_secret: SuperSecret

mongo:
    urlClient: mongodb://<dbuser>:<dbpassword>@<dbhost>:<dbport>/blockchain
    urlDocker: 'mongodb://mongo:27017/blockchain'
``` 

You can also use `.env` file in root of the project for set environment variables which overrides `config/default.yaml` according to `config/custom-environment-variables.yaml`

### For `production` please specify environment variables which override the `config/custom-environment-variables.yaml`:

```text
EXPRESS_PORT=8082
EXPRESS_HOST=192.168.1.206
EXPRESS_DEBUG=5858
JWT_SECRET=SuperSecretToken
MONGODB_URL=mongodb://<dbuser>:<dbpassword>@<dbhost>:<dbport>/blockchain_prod
# LOG_LEVEL info | warn | debug | infoAndRequest
LOG_LEVEL=info
MINER_ADDRESS=c084ccb93461c63f0a33a8eccf8149c2a747b71d9218e42b7cd442b3322f298e
NATS_HOST=192.168.46.10
NATS_MAIN_HOST=192.168.46.10
WALLET_API_ADDRESS=http://192.168.1.206:8081
```

You can also use `.env` file in root of the project for set environment variables

## Starting project in production mode

```bash
npm start
```

## Starting project in Dev mode

```bash
npm run start:dev
```

## On DockerHub:

Link: 

https://hub.docker.com/r/rsheremet/blockchain_node/

```bash
docker pull rsheremet/blockchain_node
```

## Build Docker image locally:

Go to `deploy` directory, run next command:
 
 ```bash
sudo chmod 755 *.sh
```

Run `deploy/init.sh` with parameters:

 ```bash
Required for publish:
--token=YOUR_TOKEN|Password
--username=YOUR_USERNAME
Optional:
--build
--run
--dev
--composestop
--remove-data
--publish
 ```
 
Example for Build, publish and run:
 
 ```bash
./deploy/init.sh --build --publish --token=MY_DOCKERHUB_PASSWORD --run
```    

Stop all nodes without removing all persisted data:

```bash
./deploy/init.sh --run --composestop
```

Stop all nodes with removing all the persisted data related for this deployment

```bash
./deploy/init.sh --run --composestop --remove-data
``` 
