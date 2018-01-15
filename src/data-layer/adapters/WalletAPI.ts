import {logger} from '../../middleware/common/logging';

const axios = require('axios');
import * as config from 'config';

const expressPort: number = +config.get('express.port');
const expressHost: string = config.get('express.host');

export interface IPeerSchema {
  host: string;
  port: number;
  protocol?: string;
}

export class WalletAPI {

  static axiosLib = axios;

  static axiosInst(address: string) {
    return axios.create({
      baseURL: `${address}/api`,
      timeout: 5000,
    });
  }

  private axiosInst = axios;
  private peers: string[] = [];

  constructor() {
    this.axiosInst = axios.create({
      baseURL: `${config.get('walletAPI.address')}/api`,
      timeout: 10000,
    });
  }

  async getPeerList(): Promise<any> {
    return this.axiosInst.get('/peers').then(({data, status}) => {
      this.peers = data.data;
      logger.info('WalletAPI:peers', this.peers);
      return Promise.resolve(this.peers);
    }).catch((err) => {
      logger.error('WalletAPI:getPeerList:error', err);
      throw {
        thrown: true,
        success: false,
        status: err.response.status,
        message: 'Wallet API server not available'
      };
    });
  }

  async postOwnAddress(): Promise<any> {
    const address: IPeerSchema = {
      host: expressHost,
      port: expressPort,
      protocol: 'http'
    };
    return this.axiosInst.post('/peer', address).catch((err) => {
      logger.error('WalletAPI:getPeerList:error', err);
      throw {
        thrown: true,
        success: false,
        status: err.response.status,
        message: 'Wallet API server not available'
      };
    });
  }

  public getOwnAddress() {
    return `http://${expressHost}:${expressPort}`;
  }

}
