import {
  Route,
  Get,
  Post,
  Delete,
  Response,
  Header,
  Body,
  Controller,
  Tags,
  TsoaRoute,
  Security,
  Query,
  Path
} from 'tsoa';

import {Blockchain, IBlock, ILatestBlock} from '../../business-layer/blockchain';
import {IBlocksGetResponse, IErrorResponse, ISuccessResponse, ITransactionsAllResponse} from '../responses';
import {logger} from '../../middleware/common/logging';
import {IMinedBlockRequest, ITransactionRequest} from '../request';
import {BlockchainDataAgent} from '../../data-layer/data-agents/BlockchainDataAgent';
import {ITransactionResult} from '../../business-layer/blockchain/ITransaction';
import {successResponse} from '../../shared/helper';

const blockchainDataAgent = new BlockchainDataAgent();

const prepareBlockForResult = (block) => {
  if (block.data && block.data.transactions && block.data.transactions.length) {
    const transactions = block.data.transactions;
    block.data.transactions = transactions.map((tx) => {
      const correctTx = {...tx};
      delete correctTx._id;
      return correctTx;
    });
  }
  return block;
};

@Route('blockchain')
export class BlockchainController extends Controller {

  private blockchainDataAgent: BlockchainDataAgent;

  constructor() {
    super();
    this.blockchainDataAgent = blockchainDataAgent;
  }

  @Get('peers')
  @Tags('Peers')
  public async getPeers(): Promise<ISuccessResponse> {
    const result = await this.blockchainDataAgent.getPeers();
    if (result) {
      return successResponse<string[]>(result);
    } else {
      throw {
        thrown: true,
        success: false,
        status: 500,
        message: 'Peers not available'
      };
    }
  }

  @Get('blocks')
  @Tags('Blockchain block')
  public async getBlocks(@Query('skip') skip?: number): Promise<ISuccessResponse> {

    const currSkip = skip ? skip : 0;
    const total = await BlockchainDataAgent.getAllBlocksCount();
    const blocks = await this.blockchainDataAgent.getBlocks({skip: currSkip}) || [];
    const resultBlocksStr = JSON.stringify(blocks);
    const resultBlocks = JSON.parse(resultBlocksStr);
    resultBlocks.map(prepareBlockForResult);
    const blocksResponse: IBlocksGetResponse = {
      blocks: resultBlocks,
      count: blocks.length,
      skip: currSkip,
      total
    };
    return successResponse<IBlocksGetResponse>(blocksResponse);
  }

  @Get('block/{hash}')
  @Tags('Blockchain block')
  public async getBlockByHash(@Path('hash') hash: string): Promise<ISuccessResponse> {
    const resultBlock = await this.blockchainDataAgent.getBlockByHash(hash);
    const blockStr = JSON.stringify(resultBlock);
    const blockResult = JSON.parse(blockStr);
    return successResponse<IBlock>(prepareBlockForResult(blockResult));
  }

  @Get('latest-block')
  @Tags('Blockchain block')
  public async getLatestBlock(): Promise<ISuccessResponse> {
    const resultBlock = await this.blockchainDataAgent.getLatestBlock();
    const block = {...resultBlock};
    const blockStr = JSON.stringify(block);
    const blockParsed = JSON.parse(blockStr);
    resultBlock.block = prepareBlockForResult(blockParsed.block);
    return successResponse<ILatestBlock>(resultBlock);
  }

  @Post('transaction')
  @Tags('Blockchain transactions')
  public async postTransaction(@Body() request: ITransactionRequest): Promise<ISuccessResponse> {
    const result = await this.blockchainDataAgent.saveTransaction(request);
    logger.info(result);
    if (!result) {
      throw {
        thrown: true,
        status: 400,
        success: false,
        message: 'Invalid Data'
      };
    }
    return successResponse<ITransactionRequest>(result);
  }

  @Get('transactions')
  @Tags('Blockchain transactions')
  public async getTransactions(): Promise<ISuccessResponse> {
    const result: ITransactionResult[] = await this.blockchainDataAgent.getAllTransactions();
    if (!result) {
      throw {
        thrown: true,
        status: 400,
        success: false,
        message: 'Invalid Data'
      };
    }

    const response: ITransactionsAllResponse = {
      transactions: result,
      count: result.length
    };
    return successResponse<ITransactionsAllResponse>(response);
  }

  @Get('transactions/{address}')
  @Tags('Blockchain transactions')
  public async getTransactionsByAddress(@Path('address') address: string): Promise<ISuccessResponse> {
    const resultBlock = await this.blockchainDataAgent.getTransactionsByAddress(address);
    const blockStr = JSON.stringify(resultBlock);
    const blockResult = JSON.parse(blockStr);
    return successResponse(blockResult);
  }

  @Get('balance/{address}')
  @Tags('Blockchain balance')
  public async getBalance(@Path('address') address: string): Promise<ISuccessResponse> {
    const resultBlock = await this.blockchainDataAgent.getBalance(address);
    const blockStr = JSON.stringify(resultBlock);
    const blockResult = JSON.parse(blockStr);
    return successResponse(blockResult);
  }

  @Get('mine')
  @Tags('Blockchain mine')
  public async getMine(): Promise<IBlock> {

    // const {minerAddress, proofOfWork, findNewChains} = Blockchain;
    //
    // const lastBlock = blockchain[blockchain.length - 1];
    // const lastProof = lastBlock.data.proofOfWork;
    // const proof = proofOfWork(lastProof);
    //
    // ourTransactions.push({
    //   from: 'network',
    //   to: minerAddress(),
    //   amount: 1
    // });
    //
    // const newBlockData = {
    //   proofOfWork: proof,
    //   transactions: ourTransactions
    // };
    //
    // const newBlockIndex = lastBlock.index + 1;
    // const lastBlockHash = lastBlock.hash;
    // const newBlockTimestamp = getCurrentTimestamp();
    //
    // ourTransactions = [];
    //
    // const minedBlock = new Block(newBlockIndex, newBlockTimestamp, newBlockData, lastBlockHash);
    //
    // return Promise.resolve({
    //   index: newBlockIndex,
    //   timestamp: newBlockTimestamp,
    //   data: newBlockData,
    //   hash: lastBlockHash
    // });

    const result: IBlock = await this.blockchainDataAgent.saveBlock();

    if (result) {
      return Promise.resolve(result);
    } else {
      throw {
        thrown: true,
        status: 400,
        success: false,
        message: 'Invalid Data'
      };
    }

  }

  @Post('mined-new-block')
  @Tags('Blockchain mine')
  async minedNewBlock(@Body() body: IMinedBlockRequest) {
    const {hash} = body;
    if (hash) {
      const result = await this.blockchainDataAgent.minedBlockCheck(hash);
      return successResponse(result);
    } else {
      throw {
        thrown: true,
        status: 400,
        success: false,
        message: 'hash property in body required!'
      };
    }
  }
}
