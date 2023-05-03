import { db } from '.';
import { Update } from '@grammyjs/types';

interface ILog {
	update: Update;
	unhandled?: boolean;
	// error?: unknown;
}

export class Log {
	static readonly collection = db.collection('Logs');

	static async create(log: ILog) {
		await Log.collection.save(log); // , { returnNew: true, overwriteMode: 'update' });
	}
}
