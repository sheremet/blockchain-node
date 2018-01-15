#!/bin/bash

username=""

while [ $# -gt 0 ]; do
  VALUE="${1#*=}"
  case "$1" in
    --username=*)
      username=${VALUE}
      ;;
    --help)
      echo "Please add argument --username=YOUR_USERNAME"
      ;;
    *)
      printf "* Error: Invalid token. Please use --help for manual*\n"
      exit 1
  esac
  shift
done

# Init dirs

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
tmp_dir_name="tmp"
mkdir -p ${tmp_dir_name}
tmp_dir=$(cd "${this_dir}/${tmp_dir_name}" && pwd)
root_dir=$(cd .. && pwd)
dist_dir_name="dist"
mkdir -p ${root_dir}/${dist_dir_name}
dist_dir=$(cd "${root_dir}/${dist_dir_name}"&& pwd)

echo "tmp_dir: ${tmp_dir}"
echo "root_dir: ${root_dir}"
echo "dist_dir: ${dist_dir}"
echo "Prepare sources for Docker image"
# Prepare sources for Docker image

cd ${root_dir}
# parent_dir(deploy):
npm install
npm run prod:build
cp -rp ${dist_dir} ${tmp_dir}
cp -rp ${root_dir}/config ${tmp_dir}
cp package.json ${tmp_dir}
cp init-swagger-prod.js ${tmp_dir}

cd ${tmp_dir}
# tmp_dir:
npm install --production
cd ${root_dir}/deploy
cp Dockerfile ${tmp_dir}
cd ${tmp_dir}
echo "tmp_dir: ${tmp_dir}"
echo "Build image..."
# Build image
docker build -t ${username}/blockchain_node:latest .
echo "Build end"
echo "Clear begin..."
rm -fr ${tmp_dir}
echo "Clear end"
