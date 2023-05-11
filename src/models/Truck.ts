import { aql } from 'arangojs';
import { db, tgID } from '.';
import { MyContext } from '../context';
import { User as TUser, Contact } from '@grammyjs/types';
import conf from '../config/config';
import { Mapps, TMapp } from './mapp';


// export type TStatus = 'ENTERED' | 'MOVED' | 'EXITED' | 'FINISHED' | 'DELETED';
export type TTruckStatus = 'ENTERED' | 'EXITED' | 'FINISHED' | 'DELETED';


export interface ITruck {
	_id?: string;
	_key?: string;
	// mapp: TMapp;
	front: string | null;
	truck: string;
	back: string | null;
	inn: string;
	tg_user_id: number;
	tg_tel: string;
	tg_contact: Contact;
	timestamp: number;
	created_at: Date;
	updated_at?: Date;
	status: TTruckStatus;
	exited_at?: Date;
	finished_at?: Date;
	deleted_at?: Date;
	deleted_by?: number; // tg user id
	delete_reason?: string;
	// moved_at?: Date;
	// moved_reason?: string;
	// moved_by?: number; // tg user id
}
export interface ITruck {
	mapp: TMapp;
	truck: string;
}


export class Truck {
	static collection = db.collection('Trucks');
	static async find(example: ITruck): Promise<ITruck> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.mapp == ${example.mapp}
		FILTER rec.truck == ${example.truck}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async create(truckData: ITruck): Promise<ITruck> {
		const truckMeta = await Truck.collection.save(truckData, { returnNew: true });
		return truckMeta.new;
	}

	static async exit(truck: ITruck): Promise<void> {
		const archiveCollection = db.collection('ArchiveTrucks');

		// todo: make in transaction https://arangodb.github.io/arangojs/8.2.1/classes/transaction.Transaction.html
		await Truck.collection.remove(truck._id as string, {waitForSync: true});

		// const behindTruck = await Truck.getBehindTruck(truck.truck);
		// await truckCollection.update(behindTruck._id as string, { infront: truck.infront, updated_at: truck.exited_at}, { waitForSync: true });

		truck.status = 'EXITED';
		truck.exited_at = new Date();
		await archiveCollection.save(truck, { waitForSync: true });
		return;
	}

	static async finish(truck: ITruck): Promise<void> {
		const archiveCollection = db.collection('ArchiveTrucks');
		truck.status = 'FINISHED';
		truck.finished_at = new Date();
		// todo: transaction
		await archiveCollection.save(truck, { waitForSync: true });
		await Truck.collection.remove(truck._id as string, {waitForSync: true});
		return;
	}

	// static async moveBehindInfront(truck: ITruck, infront: ITruck, reason: string, by: number): Promise<void> {
	// 	// first this
	// 	const prevBehindInfrontTruck = await Truck.getBehindTruck(infront.truck);

	// 	truck.front = infront.truck;
	// 	truck.status = 'MOVED';
	// 	truck.moved_at = new Date(); // same moved_at to search
	// 	truck.moved_reason = reason;
	// 	truck.moved_by = by;
	// 	// todo: transaction
	// 	await Truck.updateByKey(truck._key as string, truck);

	// 	if (prevBehindInfrontTruck) {
	// 		await Truck.updateByKey(prevBehindInfrontTruck._key as string, {infront: truck.truck, m_at: truck.moved_at}); // same moved_at to search
	// 	}
	// 	return;
	// }

	static async delete(truck: ITruck, reason: string, by: number): Promise<void> {
		const archiveCollection = db.collection('ArchiveTrucks');
		truck.status = 'DELETED';
		truck.deleted_at = new Date();
		truck.delete_reason = reason;
		truck.deleted_by = by;
		// todo: transaction
		await archiveCollection.save(truck, { waitForSync: true });
		await Truck.collection.remove(truck._id as string, {waitForSync: true});
		return;
	}

	static async findByKey(_key: string): Promise<ITruck> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec._key == ${_key}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async findByTruck(trcukNum: string): Promise<ITruck> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.truck == ${trcukNum}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async getLast(mapp: TMapp): Promise<ITruck> {
		const truckCollection = db.collection(mapp + 'Trucks');
		const truck = await db
			.query(
				aql`
				FOR rec IN ${truckCollection}
				SORT rec.timestamp DESC
				LIMIT 1
				RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async getPosition(truck: ITruck): Promise<number> {
		const position = await db
			.query(
				aql`
				LET truckDocument = DOCUMENT(${truck._id})

				LET position = (
					FOR doc IN Trucks
						FILTER doc.mapp == ${truck.mapp}
						FILTER doc.timestamp <= truckDocument.timestamp
						COLLECT WITH COUNT INTO count
						RETURN count
				)

				RETURN FIRST(position)`
			)
			.then((cursor) => cursor.next());

		return position;
	}

	static async findAllMyTrucks(tg_user_id: number): Promise<ITruck[]> {
		const trucks = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.tg_user_id == ${tg_user_id}
		SORT rec.timestamp ASC
		RETURN rec`
			)
			.then((cursor) => cursor.all());

		return trucks;
	}

	static async updateByKey(truckKey: string, patch: object): Promise<any> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec._key == ${truckKey}
		UPDATE rec WITH ${patch} IN Trucks`
			)
			.then((cursor) => cursor.next());
		return truck;
	}

	static async getBehindTruck(truckNumber: string): Promise<ITruck> {
		const truck = await db
			.query(
				aql`
		FOR rec IN Trucks
		FILTER rec.infront == ${truckNumber}
		RETURN rec`
			)
			.then((cursor) => cursor.next());
		return truck;
	}
}
