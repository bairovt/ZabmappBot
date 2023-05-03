import conf from '../config/config';

import { Database } from 'arangojs';

// @ts-ignore
export const db = new Database({
	url: conf.db.url,
	databaseName: conf.db.name,
	auth: { username: conf.db.username, password: conf.db.password },
});

export async function dbEnsureCollections(): Promise<void> {
	const expectedCollections = ['StsRecords', 'ZabRecords', 'ArchiveRecords', 'Users', 'Logs', 'UnhandledUpdates'];
	const collections = await db.listCollections();
	const existingCollections = collections.map((collection) => collection.name);
	const missingCollections = expectedCollections.filter((name) => !existingCollections.includes(name));
	if (missingCollections.length) {
		console.log('missingCollections', missingCollections);
		await Promise.all(missingCollections.map((name) => db.collection(name).create()));
	}
}

export async function dbEnsureIndexes(): Promise<void> {
	// StsRecords
	await db.collection('StsRecords').ensureIndex({
		type: 'persistent',
		fields: ['truck'],
		name: 'idx-StsRecords-truck',
		unique: true,
	});
	await db.collection('StsRecords').ensureIndex({
		type: 'persistent',
		fields: ['infront'],
		name: 'idx-StsRecords-infront',
		unique: true,
	});
	await db.collection('StsRecords').ensureIndex({
		type: 'persistent',
		fields: ['timestamp'],
		name: 'idx-StsRecords-timestamp',
		unique: true,
	});
	// ZabRecords
	await db.collection('ZabRecords').ensureIndex({
		type: 'persistent',
		fields: ['truck'],
		name: 'idx-ZabRecords-truck',
		unique: true,
	});
	await db.collection('ZabRecords').ensureIndex({
		type: 'persistent',
		fields: ['infront'],
		name: 'idx-ZabRecords-infront',
		unique: true,
	});
	await db.collection('ZabRecords').ensureIndex({
		type: 'persistent',
		fields: ['timestamp'],
		name: 'idx-ZabRecords-timestamp',
		unique: true,
	});

	await db.collection('Users').ensureIndex({
		type: 'persistent',
		fields: ['id'],
		name: 'idx-Users-id',
		unique: true,
	});
}

export type tgID = number;
