import { aql } from 'arangojs';
import { db, tgID } from '.';
import { MyContext } from '../context';
import { User as TUser } from '@grammyjs/types';

interface IUserData extends TUser {
	started_at: number;
}

export class User {
	static collection = db.collection('Users');

	static async start(ctx: MyContext, from: TUser): Promise<any> {
		const user = await User.findById(from.id);
		if (user) {
			return user;
		}
		const userData: IUserData = {
			...from,
			started_at: ctx.msg?.date as number,
		};
		const userMeta = await User.collection.save(userData, { returnNew: true }); // , { overwriteMode: 'update' });

		return userMeta.new;
	}

	static async findById(id: tgID): Promise<any> {
		const user = await db
			.query(
				aql`
		FOR u IN Users
		FILTER u.id == ${id}
		RETURN u`
			)
			.then((cursor) => cursor.next());
		return user;
	}

	static async getAll(): Promise<any> {
		const users = await db
			.query(
				aql`
		FOR u IN Users
		RETURN u`
			)
			.then((cursor) => cursor.all());
		return users;
	}

	static async updateById(id: tgID, patch: object): Promise<any> {
		const user = await db
			.query(
				aql`
		FOR u IN Users
		FILTER u.id == ${id}
		UPDATE u WITH ${patch} IN Users`
			)
			.then((cursor) => cursor.next());
		return user;
	}

	static async update(user: any, data: any): Promise<any> {
		await User.collection.update(user, data);
	}
}

export class BlackList {
	static collection = db.collection('BlackList');

	static async add(ctx: MyContext, from: TUser): Promise<any> {
		const user = await User.findById(from.id);
		if (user) {
			return user;
		}
		const userData: IUserData = {
			...from,
			started_at: ctx.msg?.date as number,
		};
		const userMeta = await BlackList.collection.save(userData, { returnNew: true }); // , { overwriteMode: 'update' });

		return userMeta.new;
	}

	// static async findById(id: tgID): Promise<any> {
	// 	const user = await db
	// 		.query(
	// 			aql`
	// 	FOR u IN Users
	// 	FILTER u.id == ${id}
	// 	RETURN u`
	// 		)
	// 		.then((cursor) => cursor.next());
	// 	return user;
	// }

	static async getAll(): Promise<any> {
		const blUsers = await db
			.query(
				aql`
		FOR u IN BlackList
		RETURN u`
			)
			.then((cursor) => cursor.all());
		return blUsers;
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

	// static async update(user: any, data: any): Promise<any> {
	// 	await User.collection.update(user, data);
	// }
}
