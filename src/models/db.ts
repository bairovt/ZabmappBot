import conf from '../config/config';

import { Database } from 'arangojs';

// @ts-ignore
export const db = new Database({
	url: conf.db.url,
	databaseName: conf.db.name,
	auth: { username: conf.db.username, password: conf.db.password },
});

export async function dbEnsureCollections(): Promise<void> {
	// const expectedCollections = ['StsRecords', 'ZabRecords', 'ArchiveRecords', 'Users', 'Logs', 'UnhandledUpdates'];
	const expectedCollections = ['Records', 'ArchiveRecords', 'Users', 'Logs', 'UnhandledUpdates', 'ErrorsLog'];
	const collections = await db.listCollections();
	const existingCollections = collections.map((collection) => collection.name);
	const missingCollections = expectedCollections.filter((name) => !existingCollections.includes(name));
	if (missingCollections.length) {
		console.log('missingCollections', missingCollections);
		await Promise.all(missingCollections.map((name) => db.collection(name).create()));
	}
}

export async function dbEnsureIndexes(): Promise<void> {

	await db.collection('Records').ensureIndex({
		type: 'persistent',
		fields: ['mapp', 'truck'],
		name: 'idx-Records-mapp-truck',
		unique: true,
	});

	// await db.collection('Records').ensureIndex({
	// 	type: 'persistent',
	// 	fields: ['mapp', 'infront'],
	// 	name: 'idx-Records-mapp-infront',
	// 	unique: true,
	// });

	await db.collection('Records').ensureIndex({
		type: 'persistent',
		fields: ['timestamp'],
		name: 'idx-Records-timestamp',
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
