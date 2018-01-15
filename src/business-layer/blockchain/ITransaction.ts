export interface ITransaction {
  from: string;
  to: string;
  amount: number;
}

export interface ITransactionResult extends ITransaction {
  txId: string;
}
