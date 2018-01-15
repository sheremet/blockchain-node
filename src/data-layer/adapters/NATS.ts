import * as config from 'config';
import {logger} from '../../middleware/common/logging';
import * as events from 'events';
import {ClientOpts, SubscribeOptions} from 'nats';
import {getCurrentTimestamp} from '../../shared/helper';

const NATS = require('nats');
const axios = require('axios');

const CURRENT_NATS_HOST = config.get('NATS.currentHost');
const NATS_HOST = config.get('NATS.mainHost') || 'nats-main';
const NATS_MGM_PORT = config.get('NATS.managementPort') || 8222;
const NATS_CLIENT_PORT = config.get('NATS.clientPort') || 4222;
const NATS_MAIN_CLUSTER = `nats://${NATS_HOST}:${NATS_CLIENT_PORT}`;
const expressPort = config.get('express.port');
const expressHost = config.get('express.host');
const clusterManagement = `http://${NATS_HOST}:${NATS_MGM_PORT}/varz`;

class InternalEventService extends events.EventEmitter {

  constructor() {
    super();
    this.subscribeToBlockUpdate();
  }

  private subscribeToBlockUpdate() {
    const sid = this.on('newBlock', (msg) => {
      this.emit('needUpdateBlocks');
    });
  }
}

const WAIT: number = 5;
const ATTEMPTS: number = -1;

interface ISubscriptions {
  [subject: string]: number;
}

export declare class Client extends events.EventEmitter {
  /**
   * Create a properly formatted inbox subject.
   */
  createInbox(): string;

  /**
   * Close the connection to the server.
   */
  close(): void;

  /**
   * Flush outbound queue to server and call optional callback when server has processed
   * all data.
   */
  flush(callback?: (...args) => void): void;

  /**
   * Publish a message to the given subject, with optional reply and callback.
   */
  publish(callback: (...args) => void): void;
  publish(subject: string, callback: (...args) => void): void;
  publish(subject: string, msg: string | Buffer | object, callback: (...args) => void): void;
  publish(subject: string, msg?: string | Buffer | object, reply?: string, callback?: (...args) => void): void;

  /**
   * Subscribe to a given subject, with optional options and callback. opts can be
   * ommitted, even with a callback. The Subscriber Id is returned.
   */
  subscribe(subject: string, callback: (...args) => void): number;
  subscribe(subject: string, opts: SubscribeOptions, callback: (...args) => void): number;

  /**
   * Unsubscribe to a given Subscriber Id, with optional max parameter.
   */
  unsubscribe(sid: number, max?: number): void;

  /**
   * Set a timeout on a subscription.
   */
  timeout(sid: number, timeout: number, expected: number, callback: (sid: number) => void): void;

  /**
   * Publish a message with an implicit inbox listener as the reply. Message is optional.
   * This should be treated as a subscription. You can optionally indicate how many
   * messages you only want to receive using opt_options = {max:N}. Otherwise you
   * will need to unsubscribe to stop the message stream.
   * The Subscriber Id is returned.
   */
  request(subject: string, callback: (...args) => void): number;
  request(subject: string, msg: string | Buffer | object, callback: (...args) => void): number;
  request(subject: string, msg?: string, options?: SubscribeOptions, callback?: (...args) => void): number;

  /**
   * Publish a message with an implicit inbox listener as the reply. Message is optional.
   * This should be treated as a subscription. Request one, will terminate the subscription
   * after the first response is received or the timeout is reached.
   * The callback can be called with either a message payload or a NatsError to indicate
   * a timeout has been reached.
   * The Subscriber Id is returned.
   */
  requestOne(subject: string, msg: string | Buffer | object,
             options?: SubscribeOptions, timeout?: number, callback?: (...args) => void): number;

  /**
   * Report number of outstanding subscriptions on this connection.
   */
  numSubscriptions(): number;
}

export class NatsAccess {

  static async connection(): Promise<Client> {

    if (NatsAccess.ncInstActive) {
      return Promise.resolve(this.ncInst);
    }

    const connect = async (reconnect: boolean = false): Promise<Client> => {
      const servers: string[] = await NatsAccess.getClusterNodesList();
      const clientOpts: ClientOpts = {
        servers,
        reconnectTimeWait: WAIT,
        maxReconnectAttempts: ATTEMPTS,
        reconnect,
        json: true
      };
      try {
        return Promise.resolve(NATS.connect(clientOpts));
      } catch (e) {
        return Promise.reject(false);
      }
    };

    const runWatchers = async (nc: Client) => {
      this.ncInst = nc;
      this.ncInst.on('error', (e) => {
        this.ncInstActive = false;
        logger.warn('nc error', e.message.toString());
        this.publishStatusEvent('error', nc);
        // process.exit();
        // cb('error' + e.message.toString());
        clearInterval(this.intervalId);
      });

      this.ncInst.on('connect', async () => {
        clearInterval(this.intervalId);
        this.ncInstActive = true;
        await this.subscribeToPeerAddress(nc);
        this.publishStatusEvent('connect', nc);
        await this.publishExpressAddressRequest(nc);
        this.internalEventService = new InternalEventService();
        logger.info('NATS connected');
        // cb(null, nc);
      });
      this.ncInst.on('reconnect', () => {
        clearInterval(this.intervalId);
        this.ncInstActive = true;
        logger.info('reconnect');
        this.publishStatusEvent('reconnect', nc);
        // cb(null, nc);
      });
      this.ncInst.on('reconnecting', (/*client*/) => {
        clearInterval(this.intervalId);
        this.ncInstActive = false;
        logger.info('reconnecting');
      });
      this.ncInst.on('close', () => {
        clearInterval(this.intervalId);
        this.ncInstActive = false;
        logger.info('closed');
        this.publishStatusEvent('closed', nc);
        nc.close();
        // runWatchers(connect(true), cb);
      });
    };

    return connect(true).then(async (nc) => {
      await runWatchers(nc);
      return Promise.resolve(this.ncInst);
    }).catch((err) => {
      return Promise.reject('Not connected to NATS');
    });
  }

  public static subscription(subject: string, cb: (err?, reply?, response?) => void): number {
    const sid = this.ncInst.subscribe(subject, cb);
    this.setSubscription(sid, subject);
    return sid;
  }

  public static getPeerList() {
    const arr = [];
    if (this.peerAddresses) {
      Object.keys(this.peerAddresses)
        .forEach((serverId) => {
          arr.push(this.peerAddresses[serverId]);
        });
    }

    return arr;
  }

  public static getInternalEventService() {
    return this.internalEventService;
  }

  private static ncInst: Client;
  private static ncInstActive = false;
  private static subscriptions: ISubscriptions;
  private static currIpAddresses;
  private static peersServerIds: any[] = [];
  private static currentServerId: string;
  private static peerAddresses: string[] = [];
  private static intervalId = null;
  private static internalEventService: InternalEventService;

  private static async getNodes() {
    const response = await axios.get(clusterManagement);
    if (response.status !== 200) {
      return false;
    }
    return response.data.connect_urls;
  }

  private static async setCurrentServerId() {
    const addr = `http://${CURRENT_NATS_HOST}:${NATS_MGM_PORT}/varz`;
    const response = await axios.get(addr);
    if (response.status !== 200) {
      return false;
    }
    this.currentServerId = response.data.server_id;
    return this.currentServerId;
  }

  private static async getClusterNodesList() {
    // const nodes = await this.getNodes();
    const arr = [];
    // if (nodes && Array.isArray(nodes) && nodes.length) {
    //   nodes.forEach((node) => {
    //     const str = `nats://${node}`;
    //     arr.push(str);
    //   });
    //   await this.setPeersServerIds(nodes);
    // }
    await this.setCurrentServerId();
    arr.push(NATS_MAIN_CLUSTER);
    return arr;
  }

  private static async setPeersServerIds(nodesArr: string[]) {
    nodesArr.forEach(async (node) => {
      const host = node.split(':')[0];
      const addr = `http://${host}:${NATS_MGM_PORT}/varz`;
      try {
        const response = await axios.get(addr);
        if (response.status === 200) {
          this.peersServerIds.push(response.data.server_id);
        }
      } catch (e) {
        logger.error('Not reachable Address: ', addr);
      }

    });
  }

  private static publishStatusEvent(eventName: string, nc: Client) {

    const subject = `peerStatus.${eventName}`;
    const serverId = this.currentServerId;
    nc.publish(subject, {
      serverId,
      event: eventName,
      port: NATS_CLIENT_PORT,
      expressHost,
      expressPort,
      address: CURRENT_NATS_HOST,
      timestamp: getCurrentTimestamp()
    });
  }

  private static setSubscription(sid: number, subject: string) {
    this.subscriptions[subject] = sid;
  }

  private static getSidBySubject(subject: string): number | null {
    if (this.subscriptions.hasOwnProperty(subject) && this.subscriptions[subject]) {
      return this.subscriptions[subject];
    }
    return null;
  }

  private static composeExpressAddressSubject(serverId: string): string {
    const expressAddr = `expressAddr`;
    logger.info('expressAddr', expressAddr);
    return expressAddr;
  }

  private static async publishExpressAddressRequest(nc: Client) {
    this.ncInst = nc;
    const subject = this.composeExpressAddressSubject(this.currentServerId);
    this.intervalId = setInterval(() => {
      nc.publish(subject, {
        address: this.getExpressAddress(),
        serverId: this.currentServerId
      });
    }, 5000);
  }

  private static async subscribeToPeerAddress(nc: Client) {
    const sid2 = nc.subscribe('peerStatus.*', (res) => {
      logger.info('subscribeToPeerAddress:res', res);
      //  nc.unsubscribe(sid2);
    });

    const sid3 = nc.subscribe('peers', (res) => {
      logger.info('Peers:res', res);
      this.peerAddresses = res;
      // nc.unsubscribe(sid3);
    });
  }

  private static getExpressAddress() {
    return `http://${expressHost}:${expressPort}`;
  }

}
