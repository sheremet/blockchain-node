import moment = require('moment');
import {ICreatedResponse, ISuccessResponse, IUpdatedResponse} from '../service-layer/responses';

export const getCurrentTimestamp = () => {
  return +moment.utc().format('x').valueOf();
};

export const getCurrentDateTime = () => {
  return new Date(moment.utc().format());
};

export function successResponse<T>(obj: T): Promise<ISuccessResponse> {
  return Promise.resolve({
    success: true,
    status: 200,
    data: obj || null
  });
}

// export declare function updatedResponse<T>(obj: any): Promise<T>;

export function updatedResponse<T>(obj: T): Promise<IUpdatedResponse> {
  return Promise.resolve({
    success: true,
    status: 200,
    message: 'Updated',
    data: obj || null
  });
}

export function createdResponse<T>(obj: T): Promise<ICreatedResponse> {
  return Promise.resolve({
    success: true,
    status: 201,
    message: 'Created',
    data: obj || null
  });
}

export interface IExecuteAllPromisesCB {
  results: any[];
  errors: any[];
}

export function executeAllPromises(promises): Promise<IExecuteAllPromisesCB> {
  // Wrap all Promises in a Promise that will always "resolve"
  const resolvingPromises = promises.map((promise) => {
    return new Promise((resolve) => {
      const payload = new Array(2);
      promise.then((result) => {
        payload[0] = result;
      })
        .catch((error) => {
          payload[1] = error;
        })
        .then(() => {
          /*
           * The wrapped Promise returns an array:
           * The first position in the array holds the result (if any)
           * The second position in the array holds the error (if any)
           */
          resolve(payload);
        });
    });
  });

  const errors = [];
  const results = [];

  // Execute all wrapped Promises
  return Promise.all(resolvingPromises)
    .then((items) => {
      items.forEach((payload) => {
        if (payload[1]) {
          errors.push(payload[1]);
        } else {
          results.push(payload[0]);
        }
      });

      return {
        errors,
        results
      };
    });
}
