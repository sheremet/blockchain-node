#!/bin/bash

token="default"
username="rsheremet"
build=false
run=false
publish=false
dev=false
down=false
removeData=false

buildStatus=0
runStatus=0
publishStatus=0

while [ $# -gt 0 ]; do
  VALUE="${1#*=}"
  case "$1" in
    --token=*)
      token=${VALUE}
      ;;
    --username=*)
      username=${VALUE}
      ;;
    --build)
      build=true
      buildStatus=$((++buildStatus))
      ;;
    --publish)
      publish=true
      publishStatus=$((++publishStatus))
      ;;
    --run)
      run=true
      runStatus=$((++runStatus))
      ;;
    --dev)
      dev=true
      ;;
    --composestop)
      down=true
      ;;
    --remove-data)
      removeData=true
      ;;
    --help)
      echo "Please add arguments:
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
       "
       exit 1
      ;;
    *)
      printf "Please use --help for help"
      exit 1
  esac
  shift
done



if ((${buildStatus}>0)); then
./build.sh --username=${username}
fi

if ((${publishStatus}>0)); then
  if [[ ${token} == "default" ]]; then
  echo "--token=YOUR_TOKEN Required argument. Please use --help for help"
  exit 1
  fi
./publish.sh --token=${token} --username=${username}
fi

if ((${runStatus}>0)); then
./run.sh --dev=${dev} --composestop=${down} --remove-data=${removeData}
fi


