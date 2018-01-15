import {
  BlocksRepo,
  IBlocksDocument,
  TransactionRepo,
  ITransactionDocument
} from '../data-abstracts/repositories/blockchain';
import {logger} from '../../middleware/common/logging';
import {
  IBlock,
  ILatestBlock,
  ITransaction,
  IBlockData,
  createNextBlock,
  createGenesisBlock,
  Blockchain
} from '../../business-layer/blockchain';
import {Types} from 'mongoose';
import {ITransactionResult} from '../../business-layer/blockchain/ITransaction';
import {WalletAPI} from '../adapters/WalletAPI';
import {Client as NatsClient, NatsAccess} from '../adapters/NATS';
import {executeAllPromises, IExecuteAllPromisesCB} from '../../shared/helper';

interface IGetBlocksArgs {
  skip?: number;
  limit?: number;
}

export class BlockchainDataAgent {

  /**
   * Blocks
   */

  static async getBlocksCount(): Promise<number> {
    return await BlockchainDataAgent.getAllBlocksCount() - 1;
  }

  static async getAllBlocksCount(): Promise<any> {
    return BlocksRepo.count({});
  }

  static async createInitialBlock(): Promise<any> {
    const count = await this.getAllBlocksCount();
    logger.info('createGenesisBlock:count', count);
    if (!count) {
      const block: IBlock = createGenesisBlock();
      logger.info('createGenesisBlock', block);
      const result: IBlocksDocument = await BlocksRepo.create({block});
      if (result.errors) {
        throw  {thrown: true, success: false, status: 422, message: 'db is currently unable to process request'};
      }
      return result;
    } else {
      return Promise.resolve('already created');
    }

  }

  private latestBlockIndex: number;
  private latestBlock: IBlock;
  private peers: string[];
  private walletApi: WalletAPI;
  private natsInst: NatsClient;
  private longestChain: ILatestBlock;

  constructor() {
    this.walletApi = new WalletAPI();
    this.walletApi.getPeerList().then(async (peers) => {
      try {
        this.natsInst = await NatsAccess.connection();
        this.registerEvents();
      } catch (e) {
        this.natsInst = null;
      }
      if (!peers.length) {
        await BlockchainDataAgent.createInitialBlock().then(async ({block}) => {
          await this.postOwnAddress();
          if (this.natsInst) {
            this.natsInst.publish('newBlock', block);
          }
        });
      } else {
        this.peers = peers;
        await this.postOwnAddress();
        if (this.natsInst) {
          this.natsInst.publish('peers', this.peers);
        }
        const results = await this.runSyncBlocks();
        logger.info('runSyncBlocks:results', results);
        // const transactions = await this.getTransactionsFromNetwork();
        // logger.info('getTransactionsFromNetwork:transactions', transactions);
      }
    });
  }

  /**
   * Peers
   */

  public async getPeers(): Promise<any> {
    return this.walletApi.getPeerList();
  }

  async findLongestChain(): Promise<any> {
    const peers = await  this.walletApi.getPeerList();
    return new Promise<any>((resolve, reject) => {
      const longestChain = {
        address: '',
        block: null
      };
      const peerLen = peers ? peers.length : null;
      if (peerLen) {
        logger.warn('REQUEST START.......');

        const promArr = [];

        function process() {
          for (const address of peers) {
            try {
              promArr.push(WalletAPI.axiosInst(address).get('/blockchain/latest-block'));
            } catch (e) {
              logger.error('REQUEST err', address);
            }
          }
        }

        process();
        try {
          return executeAllPromises(promArr).then(({results, errors}) => {
            results.map((result) => {
              const {data} = result;
              if (data && data.data) {
                const currData = data.data;
                if (currData) {
                  if (!longestChain.block || longestChain.block.index < currData.block.index) {
                    longestChain.block = currData.block;
                    longestChain.address = currData.address;
                  }
                  logger.debug('pArr:currData', currData, 'longestChain', longestChain);
                }
              }
              logger.debug('REQUEST result ', longestChain);
            });
            logger.warn('REQUEST COMPLETED ', longestChain);
            this.longestChain = longestChain;
            resolve(longestChain);
          });
        } catch (e) {
          reject(e);
        }
      } else {
        reject({
          thrown: true,
          success: false,
          status: 404,
          message: 'Peers not registered yet'
        });
      }
    });
  }

  async getBlockByIndex(index: number): Promise<any> {
    const result: IBlocksDocument = await BlocksRepo.findOne({}).select({
      'block._id': 0,
      'block.data._id': 0,
      '_id': 0,
      '__v': 0
    })
      .where('block.index').equals(index);
    if (!result) {
      throw {
        thrown: true,
        success: false,
        status: 404,
        message: 'No block with index ' + index + ' found'
      };
    }
    return result.block;

  }

  async getBlockByHash(hash: number | string): Promise<any> {
    const result: IBlocksDocument = await BlocksRepo.findOne().select({
      'block._id': 0,
      'block.data._id': 0,
      '_id': 0,
      '__v': 0
    })
      .where('block.hash').equals(hash + '');
    if (!result) {
      throw {
        thrown: true,
        success: false,
        status: 404,
        message: 'No block with hash ' + hash + ' found'
      };
    }
    return result.block;
  }

  async getBlockLastIndex(): Promise<any> {
    const allBlocksCount = BlockchainDataAgent.getAllBlocksCount();
    if (allBlocksCount) {
      return BlockchainDataAgent.getBlocksCount();
    }
    return -1;
  }

  async getLatestBlock(): Promise<ILatestBlock> {
    this.latestBlockIndex = await this.getBlockLastIndex();
    logger.warn('getLatestBlock:this.latestBlockIndex', this.latestBlockIndex);
    if (this.latestBlockIndex === -1) {
      return Promise.reject({
        thrown: true,
        success: false,
        status: 404,
        message: 'Have no blocks'
      });
    }
    this.latestBlock = await this.getBlockByIndex(this.latestBlockIndex);
    if (!this.latestBlock) {
      throw {
        thrown: true,
        success: false,
        status: 404,
        message: `Have no blocks`
      };
    } else {
      return Promise.resolve({
        address: this.walletApi.getOwnAddress(),
        block: this.latestBlock
      });
    }

  }

  async getBlocks(options?: IGetBlocksArgs): Promise<any> {

    const args: IGetBlocksArgs = {limit: 10, skip: 0, ...(options || {})};
    logger.info('getBlocks', args, options);
    return BlocksRepo
      .find()
      .select({'block._id': 0, 'block.data._id': 0, '_id': 0, '__v': 0})
      // .populate({path: 'block.data.transactions', select: '-_id -__v'})
      // .where('block.index').ne(0)
      .sort('-block.index')
      .skip(args.skip)
      .limit(args.limit).then((result) => {
        return result.map((val) => {
          return val.block;
        });
      });
  }

  async getBalance(address: string): Promise<any> {
    const resultFrom = await BlocksRepo
      .find({'block.data.transactions.from': address},
        {'block.data.transactions.$': 1}).select({'block.data.transactions': 1, 'block.index': 1});
    const resultTo = await BlocksRepo.find({'block.data.transactions.to': address},
      {'block.data.transactions.$': 1}).select({'block.data.transactions': 1, 'block.index': 1});

    const countFromArr: number[] = [];
    const countToArr: number[] = [];

    if (!resultFrom.length && !resultTo.length) {
      throw {
        thrown: true,
        success: false,
        status: 404,
        message: `No Transactions on this address`
      };
    }

    const setAmountArr = (arrIterable, mutableArr) => {
      arrIterable.forEach((doc) => {
        doc.block.data.transactions.map((tx) => {
          mutableArr.push(tx.amount);
        });
      });
    };
    const count = (arr) => {
      return !arr.length ? 0 : arr.reduce((a: number = 0, b: number = 0) => {
        return a + b;
      });
    };

    setAmountArr(resultFrom, countFromArr);
    setAmountArr(resultTo, countToArr);

    const countFrom: number = count(countFromArr);
    const countTo: number = count(countToArr);
    const balance: number = countTo - countFrom;

    return Promise.resolve({
      balance
    });
  }

  async getTransactionsByAddress(address: string) {
    const fromDBResult = await BlocksRepo
      .find({'block.data.transactions.from': address},
        {'block.data.transactions.$': 1})
      .select({'block.index': 1, 'block.hash': 1});
    const toDBResult = await BlocksRepo.find({'block.data.transactions.to': address},
      {'block.data.transactions.$': 1})
      .select({'block.index': 1, 'block.hash': 1});

    const fromArr = [];
    const toArr = [];

    const latestBlock = this.longestChain.block.index;

    const prepareTransactionObject = (blockHash, blockIndex, {from, to, amount, txId}) => {
      return {txId, blockHash, blockIndex, from, to, amount, confirmations: latestBlock - blockIndex};
    };

    const createResultArr = (arrDBReasult, mutableArr) => {
      arrDBReasult.forEach(({block: {hash: blockHash, index: blockIndex, data: {transactions}}}) => {
        if (transactions.length) {
          transactions.forEach((transaction) => {
            mutableArr.push(prepareTransactionObject(blockHash, blockIndex, transaction));
          });
        }
      });
    };

    if (!fromDBResult.length && !toDBResult.length) {
      throw {
        thrown: true,
        success: false,
        status: 404,
        message: `No Transactions on this address`
      };
    }
    createResultArr(fromDBResult, fromArr);
    createResultArr(toDBResult, toArr);

    return Promise.resolve({
      from: fromArr,
      to: toArr
    });
  }

  async saveBlock(): Promise<any> {

    const allTransactions = await this.getTransactionsFromNetwork();
    const currBlockTransactions = allTransactions.allTransactions;
    if (currBlockTransactions.length) {

      const longestChain = await this.findLongestChain();
      if (!longestChain) {
        throw {
          thrown: true,
          success: false,
          status: 500,
          message: `no block exist`
        };
      }

      const {block: prevBlock} = longestChain;

      const minerTx: ITransactionResult = await this.saveTransaction({
        from: 'network',
        to: Blockchain.minerAddress(),
        amount: 1
      });
      currBlockTransactions.push(minerTx);
      const blockData: IBlockData = {
        proofOfWork: Blockchain.proofOfWork(prevBlock.data.proofOfWork),
        transactions: currBlockTransactions
      };
      const block: IBlock = createNextBlock(prevBlock, blockData);

      logger.info('saveBlock:removeAllTransactions');
      return BlocksRepo.create({block}).then((result) => {
        return this.removeAllTransactions().then(() => {
          return BlocksRepo
            .findOne({})
            .select({'block._id': 0, 'block.data._id': 0, '_id': 0, '__v': 0})
            // .populate({path: 'block.data.transactions', select: '-_id -__v'})
            .where('_id').equals(result._id);
        }).catch((err) => {
          throw {thrown: true, success: false, status: 500, message: `transactions not removed`, stack: err.toString()};
        });
      }).catch((err) => {
        throw {thrown: true, success: false, status: 500, message: `can't save block`, stack: err.toString()};
      }).then(({block: savedBlock}) => {
        if (this.natsInst) {
          this.natsInst.publish('newBlock', savedBlock);
        }
      });

    } else {
      throw  {thrown: true, success: false, status: 404, message: 'node has no transactions'};
    }

  }

  /**
   * Transactions
   */

  async getAllTransactions(): Promise<ITransactionResult[]> {
    return TransactionRepo.find({}).select({__v: 0, _id: 0});
  }

  async saveTransaction(transaction: ITransaction): Promise<any> {
    const tId = new Types.ObjectId();
    const tx = {_id: tId.toString(), txId: Blockchain.generateTxId(transaction), ...transaction};
    const tResult = await TransactionRepo.create(tx);
    if (tResult) {
      delete tResult._id;
      return Promise.resolve(tResult);
    } else {
      throw  {
        thrown: true,
        success: false,
        status: 422,
        message: 'db is currently unable to process request saveTransaction'
      };
    }
  }

  async minedBlockCheck(hash: string): Promise<any> {
    const runSyncBlocksResults = await this.runSyncBlocks();
    logger.debug('runSyncBlocks:results', runSyncBlocksResults);
    const {block} = await this.getLatestBlock();
    const latestBlockHash = block.hash;
    logger.debug('latest block', latestBlockHash, hash);
    if (latestBlockHash === hash) {
      const {data: {transactions}} = block;
      return this.checkTransactions(transactions);
    }
  }

  private async minedBlockCheckWithoutSync(): Promise<any> {
    const {block} = await this.getLatestBlock();
    const {data: {transactions}} = block;
    return this.checkTransactions(transactions);
  }

  private async checkTransactions(transactions: ITransaction[]): Promise<any> {
    const blockTransactions = transactions as ITransactionResult[];
    const transactionsForRemoveProm = [];
    const currentTransactions: ITransactionResult[] = await this.getAllTransactions();
    logger.debug('blockTransactions', [...blockTransactions]);
    logger.debug('currentTransactions', [...currentTransactions]);
    blockTransactions.forEach(({txId}) => {
      currentTransactions.forEach(({txId: ownTxId}) => {
        if (txId === ownTxId) {
          transactionsForRemoveProm.push(TransactionRepo.remove({txId}));
        }
      });
    });
    if (transactionsForRemoveProm.length) {
      return executeAllPromises(transactionsForRemoveProm)
        .then(({results, errors}) => {
          logger.info('minedBlockCheck:Transactions updated');
          logger.info('minedBlockCheck:results', results);
          logger.error('minedBlockCheck:errors', errors);
          return Promise.resolve({
            results,
            errors
          });
        });
    } else {
      return Promise.resolve({
        checkTransactionsResults: 'All transactions already in latest block'
      });
    }
  }

  private registerEvents() {
    if (this.natsInst) {
      const sid = NatsAccess.getInternalEventService().on('needUpdateBlocks', async () => {
        const results = await this.runSyncBlocks();
        logger.info('runSyncBlocks:results', results);
      });
    }
  }

  private async runSyncBlocks() {
    logger.info('runSyncBlocks:START...');
    this.longestChain = await this.findLongestChain();
    const currentBlocksCount = await BlockchainDataAgent.getAllBlocksCount();
    if (currentBlocksCount) {
      try {
        // this.latestBlockIndex = await this.getBlockLastIndex();
      } catch (e) {
        this.latestBlockIndex = -1;
      }
    } else {
      this.latestBlockIndex = -1;
    }

    logger.info('this.latestBlockIndex', this.latestBlockIndex);
    const {address, block} = this.longestChain;
    logger.info('this.longestChain', address, block.hash);
    const arrProm = [];
    const blocksInBlockchain = block.index + 1;
    logger.info('blocksInBlockchain', blocksInBlockchain);
    const numOfBlocks: number = blocksInBlockchain - this.latestBlockIndex - 1;
    logger.info('numOfBlocks', numOfBlocks);
    const numOfCalls = parseInt(`${numOfBlocks / 10}`, 2);
    logger.info('numOfCalls', numOfCalls);
    const iterations = numOfBlocks - numOfCalls === 0 ? numOfCalls : numOfCalls + 1;
    logger.info('iterations', iterations);
    for (let i = 0; i < iterations; ++i) {
      arrProm.push(WalletAPI.axiosInst(address).get('/blockchain/blocks'));
    }

    const queueBlocks = [];
    const resultBlockIds = [];
    const errorsGetBlocks = [];
    const errorsSaveBlocks = [];

    const saveBlocksCB = ({results, errors}: IExecuteAllPromisesCB) => {
      if (errors.length) {
        for (const err of errors) {
          errorsSaveBlocks.push(err);
        }
      }
      if (results.length) {
        results.forEach(({block: {index, hash, previousHash}}) => {
          resultBlockIds.push({index, hash, previousHash});
        });
      }
    };

    const getBlocksCB = ({results, errors}: IExecuteAllPromisesCB) => {
      if (errors.length) {
        for (const err of errors) {
          errorsGetBlocks.push(err);
        }
      }
      if (results.length) {
        results.forEach(({data}) => {
          const {data: currData} = data;
          const {blocks, total, skip} = currData;
          if (blocks && blocks.length) {
            blocks.forEach((blockVal: IBlock) => {
              logger.info('blockVal', blockVal);
              queueBlocks.push(BlocksRepo.create({block: blockVal}));
            });
          }
        });
      }
    };

    return executeAllPromises(arrProm)
      .then(getBlocksCB)
      .then(() => {
        return executeAllPromises(queueBlocks)
          .then(saveBlocksCB);
      })
      .then(async () => {
        const transactionsCheckResults = await this.minedBlockCheckWithoutSync();
        return Promise.resolve({
          transactionsCheckResults,
          resultBlockIds,
          errorsGetBlocks,
          errorsSaveBlocks
        });
      });
  }

  private async getTransactionsFromNetwork() {
    const peers = await  this.walletApi.getPeerList();

    const promArr = [];
    const allTransactions: ITransactionResult[] = [];
    const errorsGetTransactions = [];
    peers.forEach((address) => {
      promArr.push(WalletAPI.axiosInst(address).get('/blockchain/transactions'));
    });

    const getAllTransactions = ({results, errors}: IExecuteAllPromisesCB) => {
      if (errors.length) {
        for (const err of errors) {
          const {code, address, port} = err;
          errorsGetTransactions.push({code, address, port});
        }
      }
      if (results.length) {
        results.forEach(({data}) => {
          const {data: currData} = data;
          const {transactions} = currData ? currData : {transactions: null};
          if (transactions) {
            transactions.forEach((tx) => {
              allTransactions.push(tx);
            });
          }
        });
      }
    };

    return executeAllPromises(promArr)
      .then(getAllTransactions)
      .then(() => {
        return Promise.resolve({allTransactions, errorsGetTransactions});
      });

  }

  private async postOwnAddress() {
    return this.walletApi.postOwnAddress()
      .then((res) => {
        logger.info('Own address send successfully');
      }).catch((err) => {
        throw {
          thrown: true,
          success: false,
          status: 503,
          message: 'Own address not send'
        };
      });
  }

  private async removeAllTransactions() {
    return new Promise((resolve, reject) => {
      TransactionRepo.remove({}, (err) => {
        if (err) {
          reject({
            thrown: true,
            success: false,
            status: 422,
            message: 'db is currently unable to process request removeAllTransactions'
          });
        } else {
          resolve();
        }
      });
    });
  }

  private getPeersCallback(peers) {
    this.peers = peers;
  }

}
