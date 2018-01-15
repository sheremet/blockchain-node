import {ITransactionResult} from '../../business-layer/blockchain/ITransaction';

export interface ITransactionsAllResponse {
  transactions: ITransactionResult[];
  count: number;
}
