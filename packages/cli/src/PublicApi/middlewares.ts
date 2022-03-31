import express = require('express');
import config = require('../../config');

type Role = 'owner' | 'member';

const instanceOwnerSetup = (
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
	if (!config.get('userManagement.isInstanceOwnerSetUp')) {
		return res.status(400).json({ message: 'asasas' });
	}
	return next();
};

const authorize =
	(role: [Role]) =>
	(
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): any => {
		const {
			globalRole: { name: userRole },
		} = req.user as { globalRole: { name: Role } };
		if (!role.includes(userRole)) {
			return res.status(400).json({ message: 'asasas' });
		}
		return next();
	};

export const middlewares = {
	createUsers: [instanceOwnerSetup, authorize(['owner'])],
	getUsers: [instanceOwnerSetup, authorize(['owner'])],
	getUser: [instanceOwnerSetup, authorize(['owner'])],
};
