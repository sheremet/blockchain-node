import mongoose = require('mongoose');
import {ITransaction} from '../../../../business-layer/blockchain';

export interface ITransactionDocument extends mongoose.Document, ITransaction {
  txId: string;
}
