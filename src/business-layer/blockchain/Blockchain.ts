import {createHash} from 'crypto';
import * as config from 'config';
import {ITransaction} from './ITransaction';

export class Blockchain {

  static proofOfWork(lastProof) {
    let incrementor = lastProof + 1;
    while (!(incrementor % 9 === 0 && incrementor % lastProof === 0)) {
      incrementor += 1;
    }
    return incrementor;
  }

  static generateTxId(tx: ITransaction): string {
    return createHash('sha256').update(JSON.stringify(tx)).digest('hex');
  }

  static minerAddress() {
    return config.get('minerAddress').toString();
  }

}
