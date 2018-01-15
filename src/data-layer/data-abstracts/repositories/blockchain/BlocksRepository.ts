import {MongooseAccess} from '../../../adapters/MongooseAccess';
import {Model} from 'mongoose';
import {BlocksSchema} from './BlocksSchema';
import {IBlocksDocument} from './IBlocksDocument';

export type BlocksMod = Model<IBlocksDocument>;

const {mongooseConnection} = MongooseAccess;

export const BlocksRepo: BlocksMod = mongooseConnection.model<IBlocksDocument>('blocks', BlocksSchema);
