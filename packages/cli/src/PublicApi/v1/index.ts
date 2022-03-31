import * as OpenApiValidator from 'express-openapi-validator';

import path = require('path');

import express = require('express');

import { HttpError } from 'express-openapi-validator/dist/framework/types';
import passport = require('passport');
import { Strategy } from 'passport-http-header-strategy';
import { VerifiedCallback } from 'passport-jwt';
// eslint-disable-next-line import/no-cycle
import { Db } from '../..';
import { middlewares } from '../middlewares';
// eslint-disable-next-line import/no-cycle
import { addCustomMiddlewares, IMiddlewares } from '../helpers';

export const publicApiController = (async (): Promise<express.Router> => {
	const openApiSpec = path.join(__dirname, 'openapi.yml');

	const apiController = express.Router();

	apiController.use(express.json());

	passport.use(
		new Strategy(
			{ header: 'X-N8N-API-KEY', passReqToCallback: false },
			async (token: string, done: VerifiedCallback) => {

				const user = await Db.collections.User?.findOne({
					where: {
						apiKey: token,
					},
					relations: ['globalRole'],
				});

				if (!user) {
					return done(null, false);
				}

				return done(null, user);
			},
		),
	);

	// add authentication middlewlares
	apiController.use('/', passport.authenticate('header', { session: false }));

	await addCustomMiddlewares(apiController, openApiSpec, middlewares as unknown as IMiddlewares);

	apiController.use(
		'/',
		OpenApiValidator.middleware({
			apiSpec: openApiSpec,
			operationHandlers: path.join(__dirname),
			validateRequests: true,
			validateApiSpec: true,
			validateSecurity: false,
		}),
	);

	// add error handler
	// @ts-ignore
	apiController.use((error: HttpError, req, res: express.Response) => {
		res.status(error.status || 500).json({
			message: error.message,
			errors: error.errors,
		});
	});

	return apiController;
})();

// {
// 				handlers: {
// 					// eslint-disable-next-line @typescript-eslint/naming-convention
// 					ApiKeyAuth: async (req, scopes, schema: OpenAPIV3.ApiKeySecurityScheme) => {
// 						const apiKey = req.headers[schema.name.toLowerCase()];

// 						const user = await Db.collections.User?.find({
// 							where: {
// 								apiKey,
// 							},
// 							relations: ['globalRole'],
// 						});

// 						if (!user?.length) {
// 							return false;
// 						}

// 						if (!config.get('userManagement.isInstanceOwnerSetUp')) {
// 							// eslint-disable-next-line @typescript-eslint/no-throw-literal
// 							throw {
// 								status: 400,
// 							};
// 						}

// 						if (config.get('userManagement.disabled')) {
// 							// eslint-disable-next-line @typescript-eslint/no-throw-literal
// 							throw {
// 								status: 400,
// 							};
// 						}

// 						if (user[0].globalRole.name !== 'owner') {
// 							// eslint-disable-next-line @typescript-eslint/no-throw-literal
// 							throw {
// 								status: 403,
// 							};
// 						}

// 						[req.user] = user;

// 						return true;
// 					},
// 				},
// 			},
