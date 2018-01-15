#!/bin/bash

while [ $# -gt 0 ]; do
  VALUE="${1#*=}"
  case "$1" in
    --token=*)
      token=${VALUE}
      ;;
    --username=*)
      username=${VALUE}
      ;;
    --help)
      echo "Please add argument --token=YOUR_TOKEN"
      ;;
    *)
      printf "* Error: Invalid token. Please use --help for manual*\n"
      exit 1
  esac
  shift
done

# Init dirs

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Update Docker Registry

docker login -u ${username} -p ${token}
docker push ${username}/blockchain_node:latest

#docker push rsheremet/nats:latest
docker push ${username}/nats:latest