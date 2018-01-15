#!/bin/bash

mkdir -p /var/local/nats
chmod 755 -R /var/local/nats

set -e

ARGUMENTS=""
if [ "$RANCHER_ENABLE" = 'true' ]; then
	RANCHER_META=http://rancher-metadata/2015-07-25
	PRIMARY_IP=$(curl --retry 3 --fail --silent $RANCHER_META/self/container/primary_ip)

	containers="$(curl --retry 3 --fail --silent $RANCHER_META/self/service/containers)"
	readarray -t containers_array <<<"$containers"
	#echo ${containers_array[0]}
	for i in "${containers_array[@]}"
	do
		container_name="$(curl --retry 3 --fail --silent $RANCHER_META/self/service/containers/$i)"
		container_ip="$(curl --retry 3 --fail --silent $RANCHER_META/containers/$container_name/primary_ip)"

		# TODO can we somehow check if container is already running correctly?

		if [ "$container_ip" != "$PRIMARY_IP" ]; then
			if [ "$NATS_CLUSTER_USER" ]; then
				ROUTE="nats-route://$NATS_CLUSTER_USER:$NATS_CLUSTER_PASS@$container_ip:6222"
			else
				ROUTE="nats-route://$container_ip:6222"
			fi

			if [ "$NATS_CLUSTER_ROUTES" ]; then
				NATS_CLUSTER_ROUTES="$NATS_CLUSTER_ROUTES,$ROUTE"
			else
				NATS_CLUSTER_ROUTES="$ROUTE"
			fi
		fi
	done
fi

cp /usr/local/nats/gnatsd.conf /var/local/nats -rf
# update the cluster user in the config file
sed -ri 's/^(\s*)('"user"':).*/\1\2 '"$NATS_CLUSTER_USER"'/' "/var/local/nats/gnatsd.conf"
sed -ri 's/^(\s*)('"password"':).*/\1\2 '"$NATS_CLUSTER_PASS"'/' "/var/local/nats/gnatsd.conf"

if [ "$NATS_CLUSTER_ROUTES" ]; then
	ARGUMENTS="$ARGUMENTS --routes=$NATS_CLUSTER_ROUTES"
fi

if [ "$NATS_USER" ]; then
	ARGUMENTS="$ARGUMENTS --user $NATS_USER --pass $NATS_PASS"
fi
exec /usr/local/nats/gnatsd -c /var/local/nats/gnatsd.conf $ARGUMENTS
