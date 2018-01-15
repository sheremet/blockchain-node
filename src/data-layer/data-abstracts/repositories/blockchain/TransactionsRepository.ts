import {MongooseAccess} from '../../../adapters/MongooseAccess';
import {Model} from 'mongoose';
import {ITransactionDocument} from './ITransactionDocument';
import {TransactionSchema} from './TransactionSchema';

export type TransactionMod = Model<ITransactionDocument>;

const {mongooseConnection} = MongooseAccess;

export const TransactionRepo: TransactionMod =
  mongooseConnection.model<ITransactionDocument>('transactions', TransactionSchema);
