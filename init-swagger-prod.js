const env = require('node-env-file');
const fs = require('fs');
const path = require('path');
if (fs.existsSync(process.cwd() + '/.env')) {
  env(process.cwd() + '/.env');
}
const config = require('config');

function patchSwagger() {
  const hostPort = `${config.get('express.host')}:${config.get('express.port')}`;
  try {
    const swaggerFilePath = path.resolve(process.cwd() + '/dist/swagger.json');
    let tsoaJson = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf8'));
    tsoaJson.swagger.host = hostPort;
    fs.writeFileSync(swaggerFilePath, JSON.stringify(tsoaJson, '', 2), {encoding: 'utf8'});
  } catch (e) {
    console.error(e);
  }
}

patchSwagger();

module.exports = patchSwagger;

