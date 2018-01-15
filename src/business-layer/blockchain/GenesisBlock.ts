import {Block} from './Block';
import {IBlock, IBlockData} from './IBlock';
import {getCurrentTimestamp} from '../../shared/helper';

export const createGenesisBlock = (): IBlock => {
  return new Block(0, getCurrentTimestamp(), {proofOfWork: 9, transactions: []}, '0').getObject();
};

export const createNextBlock = (previousBlock: IBlock, data: IBlockData): IBlock => {
  return new Block(previousBlock.index + 1, getCurrentTimestamp(), data, previousBlock.hash).getObject();
};
