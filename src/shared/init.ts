import {logger} from '../middleware/common/logging';
import {EventEmitter} from 'events';
import {BlockchainDataAgent} from '../data-layer/data-agents/BlockchainDataAgent';
import {NatsAccess} from '../data-layer/adapters/NATS';

export const natsInit = new EventEmitter();

natsInit.once('initNats', () => {
  logger.info('initNats...');
  NatsAccess.connection().then(async (nc) => {
    logger.info('init complete');
    logger.info('NodeAddresses', NatsAccess.getPeerList());
  });
});

export async function init(): Promise<any> {

  const initialBlock = await BlockchainDataAgent.createInitialBlock();
  return Promise.resolve(initialBlock);

}
