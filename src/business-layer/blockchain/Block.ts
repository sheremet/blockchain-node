import {createHash} from 'crypto';
import {IBlock, IBlockData} from './IBlock';
import {IBlockMethods} from './IBlockMethods';
import {getCurrentTimestamp} from '../../shared/helper';

export const getHash = (s: string): string => {
  return createHash('sha256')
    .update(s)
    .digest('hex');
};

export class Block implements IBlockMethods, IBlock {

  private hashVar: string;

  constructor(private indexVar: number,
              private timestampVar: number,
              private dataVar: IBlockData,
              private previousHashVar) {
    this.indexVar = indexVar;
    this.timestampVar = timestampVar;
    this.dataVar = dataVar;
    this.previousHashVar = previousHashVar;
    this.hashVar = this.generateHash();
  }

  getObject(): IBlock {
    return {
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      hash: this.hash
    };
  }

  get index(): number {
    return this.indexVar;
  }

  get timestamp(): number {
    return this.timestampVar;
  }

  get data(): any {
    return this.dataVar;
  }

  get previousHash() {
    return this.previousHashVar;
  }

  get hash(): string {
    return this.hashVar;
  }

  private generateHash(): string {
    return getHash(`${this.indexVar}${this.timestampVar}${JSON.stringify(this.dataVar)}${this.previousHashVar}`);
  }

}
