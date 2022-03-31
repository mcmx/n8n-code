import * as querystring from 'querystring';
// eslint-disable-next-line import/no-extraneous-dependencies
import { pick } from 'lodash';
import express = require('express');
import * as SwaggerParser from '@apidevtools/swagger-parser';
// eslint-disable-next-line import/no-cycle
import { User } from '../databases/entities/User';

interface IPaginationOffsetDecoded {
	offset: number;
	limit: number;
}
export interface IMiddlewares {
	[key: string]: [IMiddleware];
}
interface IMiddleware {
	(req: express.Request, res: express.Response, next: express.NextFunction): void;
}

export type OperationID = 'getUsers' | 'getUser';

export const decodeCursor = (cursor: string): IPaginationOffsetDecoded => {
	const data = JSON.parse(Buffer.from(cursor, 'base64').toString()) as string;
	const unserializedData = querystring.decode(data) as { offset: string; limit: string };
	return {
		offset: parseInt(unserializedData.offset, 10),
		limit: parseInt(unserializedData.limit, 10),
	};
};

export const getNextCursor = (
	offset: number,
	limit: number,
	numberOfRecords: number,
): string | null => {
	const retrieveRecordsLength = offset + limit;

	if (retrieveRecordsLength < numberOfRecords) {
		return Buffer.from(
			JSON.stringify(
				querystring.encode({
					limit,
					offset: offset + limit,
				}),
			),
		).toString('base64');
	}

	return null;
};

export const getSelectableProperties = (table: 'user' | 'role'): string[] => {
	return {
		user: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
		role: ['id', 'name', 'scope', 'createdAt', 'updatedAt'],
	}[table];
};

export const connectionName = (): string => {
	return 'default';
};

export const clean = (users: User[], keepRole = false): Array<Partial<User>> => {
	return users.map((user) =>
		pick(user, getSelectableProperties('user').concat(keepRole ? ['globalRole'] : [])),
	);
};

const middlewareDefined = (operationId: OperationID, middlewares: IMiddlewares) =>
	operationId && middlewares[operationId];

export const addMiddlewares = (
	router: express.Router,
	method: string,
	routePath: string,
	operationId: OperationID,
	middlewares: IMiddlewares,
): void => {
	if (middlewareDefined(operationId, middlewares)) {
		routePath.replace(/\{([^}]+)}/g, ':$1');
		switch (method) {
			case 'get':
				router.get(routePath, ...middlewares[operationId]);
				break;
			case 'post':
				router.post(routePath, ...middlewares[operationId]);
				break;
			case 'put':
				router.post(routePath, ...middlewares[operationId]);
				break;
			case 'delete':
				router.post(routePath, ...middlewares[operationId]);
				break;
			default:
				break;
		}
	}
};
export const addCustomMiddlewares = async (
	apiController: express.Router,
	openApiSpec: string,
	middlewares: IMiddlewares,
): Promise<void> => {
	const { paths = {} } = await SwaggerParser.parse(openApiSpec);
	Object.entries(paths).forEach(([routePath, methods]) => {
		Object.entries(methods).forEach(([method, data]) => {
			const operationId: OperationID = (
				data as {
					'x-eov-operation-id': OperationID;
				}
			)['x-eov-operation-id'];
			addMiddlewares(apiController, method, routePath, operationId, middlewares);
		});
	});
};
