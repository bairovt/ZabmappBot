import { aql } from 'arangojs';
import { db, tgID } from '.';
import { MyContext } from '../context';
import { User as TUser, Contact } from '@grammyjs/types';
import conf from '../config/config';

export type TMapp = 'Zab' | 'Sts';
export type TStatus = 'ENTERED' | 'MOVED' | 'EXITED' | 'FINISHED' | 'DELETED';

export enum Mapps {
	Zab = 'Забайкальск (тест)', //  TODO:
	//@ts-ignore
	// Zab = conf.mapZabName, // TODO: solve type error
	Sts = 'Староцурухайтуй',
}

export interface IRecord {
	_id?: string; // arangodb
	_key?: string; // arangodb
	mapp: TMapp;
	truck: string;
	infront: string | null;
	inn: string;
	tg_user_id: number;
	tg_tel: string;
	tg_contact: Contact;
	timestamp: number;
	created_at: Date;
	updated_at?: Date;
	status: TStatus;
	exited_at?: Date;
	finished_at?: Date;
	deleted_at?: Date;
	deleted_by?: number; // tg user id
	delete_reason?: string;
}
export interface ITruck {
	mapp: TMapp;
	truck: string;
}


export class Record {
	static collection = db.collection('Records');
	static async find(example: ITruck): Promise<IRecord> {
		const record = await db
			.query(
				aql`
		FOR rec IN Records
		FILTER rec.mapp == ${example.mapp}
		FILTER rec.truck == ${example.truck}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return record;
	}

	static async create(recordData: IRecord): Promise<IRecord> {
		const recordMeta = await Record.collection.save(recordData, { returnNew: true });
		return recordMeta.new;
	}

	static async exit(record: IRecord): Promise<void> {
		const archiveCollection = db.collection('ArchiveRecords');

		// todo: make in transaction https://arangodb.github.io/arangojs/8.2.1/classes/transaction.Transaction.html
		await Record.collection.remove(record._id as string, {waitForSync: true});

		// const behindTruck = await Record.getBehindTruck(record.truck);
		// await recordCollection.update(behindTruck._id as string, { infront: record.infront, updated_at: record.exited_at}, { waitForSync: true });

		record.status = 'EXITED';
		record.exited_at = new Date();
		await archiveCollection.save(record, { waitForSync: true });
		return;
	}

	static async finish(record: IRecord): Promise<void> {
		const archiveCollection = db.collection('ArchiveRecords');
		record.status = 'FINISHED';
		record.finished_at = new Date();
		// todo: transaction
		await archiveCollection.save(record, { waitForSync: true });
		await Record.collection.remove(record._id as string, {waitForSync: true});
		return;
	}

	// static async moveBehindInfront(record: IRecord, infront: IRecord): Promise<void> {
	// 	record.status = 'DELETED';
	// 	record.moved_at = new Date();
	// 	record.delete_reason = reason;
	// 	// todo: transaction
	// 	await Record.collection.remove(record._id as string, {waitForSync: true});
	// 	return;
	// }

	static async delete(record: IRecord, reason: string, by: number): Promise<void> {
		const archiveCollection = db.collection('ArchiveRecords');
		record.status = 'DELETED';
		record.deleted_at = new Date();
		record.delete_reason = reason;
		record.deleted_by = by;
		// todo: transaction
		await archiveCollection.save(record, { waitForSync: true });
		await Record.collection.remove(record._id as string, {waitForSync: true});
		return;
	}

	static async findByKey(_key: string): Promise<IRecord> {
		const record = await db
			.query(
				aql`
		FOR rec IN Records
		FILTER rec._key == ${_key}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return record;
	}

	static async findByTruck(trcukNum: string): Promise<IRecord> {
		const record = await db
			.query(
				aql`
		FOR rec IN Records
		FILTER rec.truck == ${trcukNum}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return record;
	}

	static async getLast(mapp: TMapp): Promise<IRecord> {
		const recordCollection = db.collection(mapp + 'Records');
		const record = await db
			.query(
				aql`
				FOR rec IN ${recordCollection}
				SORT rec.timestamp DESC
				LIMIT 1
				RETURN rec`
			)
			.then((cursor) => cursor.next());
		return record;
	}

	static async getPosition(record: IRecord): Promise<number> {
		const position = await db
			.query(
				aql`
				LET recordDocument = DOCUMENT(${record._id})

				LET position = (
					FOR doc IN Records
						FILTER doc.mapp == ${record.mapp}
						FILTER doc.timestamp <= recordDocument.timestamp
						COLLECT WITH COUNT INTO count
						RETURN count
				)

				RETURN FIRST(position)`
			)
			.then((cursor) => cursor.next());

		return position;
	}

	static async findAllMyRecords(tg_user_id: number): Promise<IRecord[]> {
		const records = await db
			.query(
				aql`
		FOR rec IN Records
		FILTER rec.tg_user_id == ${tg_user_id}
		SORT rec.timestamp ASC
		RETURN rec`
			)
			.then((cursor) => cursor.all());

		return records;
	}

	// static async updateById(id: tgID, patch: object): Promise<any> {
	// 	const user = await db
	// 		.query(
	// 			aql`
	// 	FOR u IN Users
	// 	FILTER u.id == ${id}
	// 	UPDATE u WITH ${patch} IN Users`
	// 		)
	// 		.then((cursor) => cursor.next());
	// 	return user;
	// }

	static async getBehindRecord(truckNumber: string): Promise<IRecord> {
		const record = await db
			.query(
				aql`
		FOR rec IN Records
		FILTER rec.infront == ${truckNumber}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return record;
	}
}
