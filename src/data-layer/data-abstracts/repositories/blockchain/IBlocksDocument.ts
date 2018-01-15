import mongoose = require('mongoose');
import {IBlock} from '../../../../business-layer/blockchain';

export interface IBlocksDocument extends mongoose.Document {
  block: IBlock;
  createdAt: Date;
  modifiedAt: Date;
}
