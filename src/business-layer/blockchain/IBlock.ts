import {ITransaction} from './ITransaction';

export interface IBlockData {
  proofOfWork: number;
  transactions: ITransaction[];
}

export interface IBlock {
  index: number;
  timestamp: number;
  data: IBlockData;
  previousHash: string;
  hash: string;
}

export interface ILatestBlock {
  address: string;
  block: IBlock;
}
