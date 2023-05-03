import { aql } from 'arangojs';
import { db, tgID } from '.';
import { MyContext } from '../context';
import { User as TUser, Contact } from '@grammyjs/types';

export type TMapp = 'Zab' | 'Sts';
export type TStatus = 'ENTERED' | 'EXITED' | 'FINISHED';

export enum Mapps {
	Zab = 'Забайкальск',
	Sts = 'Староцурухайтуй',
}

export interface IRecord {
	_id?: string; // arangodb
	_key?: string; // arangodb
	mapp: TMapp;
	truck: string;
	infront: string;
	// phone: string;
	tg_user_id: number;
	tg_tel: string;
	tg_contact: Contact;
	timestamp: number;
	created_at: Date;
	updated_at?: Date;
	status: TStatus;
	exited_at?: Date;
	finished_at?: Date;
}


export class Record {
	// static collection = db.collection('Records');

	static async create(recordData: IRecord): Promise<IRecord> {
		const recordCollection = db.collection(recordData.mapp + 'Records');
		const recordMeta = await recordCollection.save(recordData, { returnNew: true });
		return recordMeta.new;
	}

	static async exit(record: IRecord): Promise<void> {
		const recordCollection = db.collection(record.mapp + 'Records');
		const archiveCollection = db.collection('ArchiveRecords');

		// TODO: make in transaction https://arangodb.github.io/arangojs/8.2.1/classes/transaction.Transaction.html
		await recordCollection.remove(record._id as string, {waitForSync: true});

		const behindTruck = await Record.getBehindTruck(record.truck);
		await recordCollection.update(behindTruck._id as string, { infront: record.infront, updated_at: record.exited_at}, { waitForSync: true });

		record.status = 'EXITED';
		record.exited_at = new Date();
		await archiveCollection.save(record, { waitForSync: true });

		return;
	}

	static async finish(record: IRecord): Promise<void> {
		const recordCollection = db.collection(record.mapp + 'Records');
		const archiveCollection = db.collection('ArchiveRecords');
		record.status = 'FINISHED';
		record.finished_at = new Date();
		await archiveCollection.save(record, { waitForSync: true });
		await recordCollection.remove(record._id as string, {waitForSync: true});
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

	static async findByTruck(numTruck: string): Promise<IRecord> {
		const record = await db
			.query(
				aql`
		FOR rec IN Records
		FILTER rec.truck == ${numTruck}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return record;
	}

	static async getBehindTruck(numTruck: string): Promise<IRecord> {
		const record = await db
			.query(
				aql`
		FOR rec IN Records
		FILTER rec.infront == ${numTruck}
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
		const recordCollection = db.collection(record.mapp + 'Records');
		// LET recordId = "${record._id}"
		const position = await db
			.query(
				aql`
				LET recordDocument = DOCUMENT(${record._id})

				LET position = (
					FOR doc IN ${recordCollection}
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
}
