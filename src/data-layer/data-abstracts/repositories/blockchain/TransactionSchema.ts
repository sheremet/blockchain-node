import {Schema} from 'mongoose';

export const TransactionSchema = new Schema({
  txId: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }

}, {
  versionKey: false
});


