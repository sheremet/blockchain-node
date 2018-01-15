import {IBlock} from '../../business-layer/blockchain';

export interface IBlocksGetResponse {
  blocks: IBlock[];
  count: number;
  skip: number;
  total: number;
}
