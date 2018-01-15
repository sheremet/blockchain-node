#!/bin/bash

down=false
removeData=false

while [ $# -gt 0 ]; do
  VALUE="${1#*=}"
  case "$1" in
    --dev=*)
      dev=${VALUE}
      ;;
    --composestop=*)
      down=${VALUE}
      ;;
    --remove-data=*)
      removeData=${VALUE}
      ;;
    --help)
      echo "Please add argument --dev=true|false"
      ;;
    *)
      printf "* Error: Invalid token. Please use --help for manual*\n"
      exit 1
  esac
  shift
done

# Create dirs
mkdir -p /data/docker/data/blockchain_node
mkdir -p /data/docker/data/blockchain_node_mongodb

mkdir -p /data/docker/data/blockchain_node1
mkdir -p /data/docker/data/blockchain_node_mongodb1

mkdir -p /data/docker/data/blockchain_node2
mkdir -p /data/docker/data/blockchain_node_mongodb2

mkdir -p /data/docker/data/blockchain_node3
mkdir -p /data/docker/data/blockchain_node_mongodb3

if(${dev} !== "false"); then
cp override/docker-compose.override.yaml .
else
rm docker-compose.override.yaml
fi

if(${down} !== "false"); then

if(${removeData} !== "false"); then
sudo rm -fr /data/docker/data/blockchain_*
fi
docker-compose -f docker-compose.yaml down
docker-compose -f docker-compose.node1.yaml down
docker-compose -f docker-compose.node2.yaml down
docker-compose -f docker-compose.node3.yaml down
else
docker-compose -f docker-compose.yaml up -d
docker-compose -f docker-compose.node1.yaml up -d
docker-compose -f docker-compose.node2.yaml up -d
docker-compose -f docker-compose.node3.yaml up -d
fi

rm docker-compose.override.yaml