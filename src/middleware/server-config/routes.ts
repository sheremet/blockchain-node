/* tslint:disable */
import { Controller, ValidateParam, FieldErrors, ValidateError, TsoaRoute } from 'tsoa';
import { BlockchainController } from './../../service-layer/controllers/BlockchainController';

const models: TsoaRoute.Models = {
    "ISuccessResponse": {
        "properties": {
            "success": { "dataType": "boolean", "required": true },
            "status": { "dataType": "double", "required": true },
            "data": { "dataType": "any", "required": true },
        },
    },
    "ITransactionRequest": {
        "properties": {
            "from": { "dataType": "string", "required": true },
            "to": { "dataType": "string", "required": true },
            "amount": { "dataType": "double", "required": true },
        },
    },
    "ITransaction": {
        "properties": {
            "from": { "dataType": "string", "required": true },
            "to": { "dataType": "string", "required": true },
            "amount": { "dataType": "double", "required": true },
        },
    },
    "IBlockData": {
        "properties": {
            "proofOfWork": { "dataType": "double", "required": true },
            "transactions": { "dataType": "array", "array": { "ref": "ITransaction" }, "required": true },
        },
    },
    "IBlock": {
        "properties": {
            "index": { "dataType": "double", "required": true },
            "timestamp": { "dataType": "double", "required": true },
            "data": { "ref": "IBlockData", "required": true },
            "previousHash": { "dataType": "string", "required": true },
            "hash": { "dataType": "string", "required": true },
        },
    },
    "IMinedBlockRequest": {
        "properties": {
            "hash": { "dataType": "string", "required": true },
        },
    },
};

export function RegisterRoutes(app: any) {
    app.get('/api/blockchain/peers',
        function(request: any, response: any, next: any) {
            const args = {
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getPeers.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/blockchain/blocks',
        function(request: any, response: any, next: any) {
            const args = {
                skip: { "in": "query", "name": "skip", "dataType": "double" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getBlocks.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/blockchain/block/:hash',
        function(request: any, response: any, next: any) {
            const args = {
                hash: { "in": "path", "name": "hash", "required": true, "dataType": "string" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getBlockByHash.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/blockchain/latest-block',
        function(request: any, response: any, next: any) {
            const args = {
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getLatestBlock.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.post('/api/blockchain/transaction',
        function(request: any, response: any, next: any) {
            const args = {
                request: { "in": "body", "name": "request", "required": true, "ref": "ITransactionRequest" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.postTransaction.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/blockchain/transactions',
        function(request: any, response: any, next: any) {
            const args = {
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getTransactions.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/blockchain/transactions/:address',
        function(request: any, response: any, next: any) {
            const args = {
                address: { "in": "path", "name": "address", "required": true, "dataType": "string" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getTransactionsByAddress.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/blockchain/balance/:address',
        function(request: any, response: any, next: any) {
            const args = {
                address: { "in": "path", "name": "address", "required": true, "dataType": "string" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getBalance.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.get('/api/blockchain/mine',
        function(request: any, response: any, next: any) {
            const args = {
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.getMine.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });
    app.post('/api/blockchain/mined-new-block',
        function(request: any, response: any, next: any) {
            const args = {
                body: { "in": "body", "name": "body", "required": true, "ref": "IMinedBlockRequest" },
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            const controller = new BlockchainController();


            const promise = controller.minedNewBlock.apply(controller, validatedArgs);
            promiseHandler(controller, promise, response, next);
        });


    function promiseHandler(controllerObj: any, promise: any, response: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                let statusCode;
                if (controllerObj instanceof Controller) {
                    const controller = controllerObj as Controller
                    const headers = controller.getHeaders();
                    Object.keys(headers).forEach((name: string) => {
                        response.set(name, headers[name]);
                    });

                    statusCode = controller.getStatus();
                }

                if (data) {
                    response.status(statusCode || 200).json(data);
                } else {
                    response.status(statusCode || 204).end();
                }
            })
            .catch((error: any) => next(error));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        const fieldErrors: FieldErrors = {};
        const values = Object.keys(args).map((key) => {
            const name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return ValidateParam(args[key], request.query[name], models, name, fieldErrors);
                case 'path':
                    return ValidateParam(args[key], request.params[name], models, name, fieldErrors);
                case 'header':
                    return ValidateParam(args[key], request.header(name), models, name, fieldErrors);
                case 'body':
                    return ValidateParam(args[key], request.body, models, name, fieldErrors, name + '.');
                case 'body-prop':
                    return ValidateParam(args[key], request.body[name], models, name, fieldErrors, 'body.');
            }
        });
        if (Object.keys(fieldErrors).length > 0) {
            throw new ValidateError(fieldErrors, '');
        }
        return values;
    }
}
