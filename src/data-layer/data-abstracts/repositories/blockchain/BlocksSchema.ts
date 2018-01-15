import {Schema} from 'mongoose';
import {IBlocksDocument} from './IBlocksDocument';
import {getCurrentDateTime, getCurrentTimestamp} from '../../../../shared/helper';
import {TransactionSchema} from './TransactionSchema';

/**
 * MongooseSchema
 * @type {"mongoose".Schema}
 * @private
 *
 */

export const data = new Schema({
  proofOfWork: {
    type: Number,
    required: true
  },
  transactions: [TransactionSchema]

});

export const block = new Schema({
  index: {
    type: Number,
    required: true,
    index: {unique: true}
  },

  timestamp: {
    type: Date,
    required: true,
    default: getCurrentTimestamp()
  },

  data,

  previousHash: {
    type: String,
    required: true,
    index: {unique: true}
  },

  hash: {
    type: String,
    required: true,
    index: {unique: true}
  }
});

const BlocksSchema: Schema = new Schema({

  block,

  createdAt: {
    type: Date,
    default: getCurrentDateTime()
  },

  modifiedAt: {
    type: Date,
    default: getCurrentDateTime()
  }

});


BlocksSchema.pre('save', function(next: any) {
  if (this._doc) {
    const doc = this._doc as IBlocksDocument;
    const now = getCurrentDateTime();

    if (!doc.createdAt) {
      doc.createdAt = now;
    }

    doc.modifiedAt = now;

  }

  next();
});

export {BlocksSchema};
