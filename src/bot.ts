import { Bot, GrammyError, HttpError, BotError, session } from 'grammy';
import conf from './config/config';
import { User, BlackList, Log, Record, Mapps, db, dbEnsureIndexes, dbEnsureCollections, TMapp } from './models';
import { User as TUser, Contact } from '@grammyjs/types';
import {
	recordInfo,
	checkRecordInfo,
} from './helpers';
import { MyContext, initialSessionData } from './context';
import { Router } from '@grammyjs/router';
import { isNotModifiedError } from './utils';
import {txt, truckExistsTxt} from './txt';
import { getMappsKb, getRecordKb, confirmKB, confirmKBTxt } from './keyboards';
import { InlineKeyboard } from 'grammy';
// import {isArangoError} from 'arangojs';
import { ArangoError } from "arangojs/error";
import { IRecord, ITruck } from './models/Record';
// import { truckExistsTxt } from './txt/dynamic';


if (!conf.nodeEnv) throw new Error('NODE_ENV is not set');

const bot = new Bot<MyContext>(conf.bot.token as string);

bot.use(session({ initial: initialSessionData }));

bot.use(async (ctx, next) => {
	await Log.create({ update: ctx.update });
	if (!ctx.msg?.from) throw new Error('not a User update');
	await next();
});

bot.command('start', async (ctx) => {
	await User.start(ctx, ctx.msg?.from as TUser);
	ctx.session.step = 'idle';
	await ctx.reply(txt.info, {
		reply_markup: { remove_keyboard: true },
	});
});

bot.command('sendall', async (ctx) => {
	if (ctx.msg?.from?.id !== conf.superadmin) {
		return await ctx.reply('forbidden');
	};
	const blUsers = await BlackList.getAll();
	//@ts-ignore
	const blUserIds = blUsers.map((user) => user.id);

	const sendMsg = ctx.match;

	const allUsers = await User.getAll();
	//@ts-ignore
	// const allUsersSend = allUsers.map((user) => {
	// 	return ctx.api.sendMessage(user.id, sendMsg, {
	// 		parse_mode: 'HTML',
	// 	});
	// });
	// await Promise.all(allUsersSend);
	let counter =  0;
	for (let user of allUsers) {
		if (blUserIds.includes(user.id)) continue;
		try {
			await ctx.api.sendMessage(user.id, sendMsg, {
				parse_mode: 'HTML',
			});
			counter++;
		} catch (error) {
			console.log(error);
		}
	}
	console.log('sendall', counter);
});

bot.command('find', async (ctx) => {
	if (ctx.msg?.from?.id !== conf.superadmin) {
		return await ctx.reply('forbidden');
	};
	ctx.session.step = 'idle';
	const truckNumber = ctx.match;

	const record = await Record.findByTruck(truckNumber);
	if (!record) return await ctx.reply(truckNumber + ' запись не найдена');

	return await ctx.reply(JSON.stringify(record, null, 2));
});

bot.command('getbehind', async (ctx) => {
	if (ctx.msg?.from?.id !== conf.superadmin) {
		return await ctx.reply('forbidden');
	};
	ctx.session.step = 'idle';
	const truckNumber = ctx.match;

	const record = await Record.getBehindRecord(truckNumber);
	if (!record) return await ctx.reply(`За ${truckNumber} тягач не числится`);

	return await ctx.reply(JSON.stringify(record, null, 2));
});

bot.command('delete', async (ctx) => {
	if (ctx.msg?.from?.id !== conf.superadmin) {
		return await ctx.reply('forbidden');
	};
	ctx.session.step = 'idle';
	const deleteArgument = ctx.match;
	let [truckNumber, deleteReason] = deleteArgument.split('::');
	truckNumber = truckNumber.trim();

	if (!deleteReason)	return await ctx.reply('delete reason not provided (divide with ::)');
	deleteReason = deleteReason.trim();

	const record = await Record.findByTruck(truckNumber);
	if (!record) return await ctx.reply(truckNumber + ' record not found');

	await Record.delete(record, deleteReason, ctx.msg?.from?.id as number);
	return await ctx.reply(truckNumber + ' deleted');
});

// bot.command('enter', async (ctx) => {
// 	await User.start(ctx, ctx.msg?.from as TUser);
// 	ctx.session.record.mapp = 'Zab';

// 	const usersRecords = await Record.findAllMyRecords(ctx.from?.id as number); // todo: check if id exists

// 	if (usersRecords.length >= 5) {
// 		return ctx.reply(txt.limit, {
// 			reply_markup: { remove_keyboard: true },
// 		});
// 	}

// 	ctx.session.step = 'truck';
// 	await ctx.reply(txt.set_truck, { reply_markup: {remove_keyboard: true}, parse_mode: 'HTML' });
// });

// bot.command('myrecs', async (ctx) => {
// 	ctx.session.step = 'idle';
// 	const records = await Record.findAllMyRecords(ctx.from?.id as number); // todo: check if id exists
// 	if (!records.length) return await ctx.reply(txt.no_records);
// 	for (const record of records) {
// 		const recordKb = getRecordKb(record._key as string);
// 		const info = await recordInfo(record);
// 		await ctx.reply(info, {
// 			reply_markup: recordKb,
// 			parse_mode: 'HTML',
// 		});
// 	}
// });

bot.command('info', async (ctx) => {
	const helpInfoKb = new InlineKeyboard().text('Закрыть', 'closeHelpInfo');
	await ctx.reply(txt.info, {
		reply_markup: helpInfoKb,
		parse_mode: 'HTML',
		disable_web_page_preview: true,
	});
});

bot.callbackQuery('closeHelpInfo', async (ctx) => {
	await ctx.deleteMessage();
	await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^rec:(\d+):(upd|exit|finish)$/, async (ctx) => {
	const data = ctx.match;
	//@ts-ignore
	const recordKey = data[1];
	//@ts-ignore
	const action = data[2];
	//@ts-ignore

	const record = await Record.findByKey(recordKey);

	if (!record) {
		console.error('record not found', recordKey); // todo: send to logBot
		return await ctx.answerCallbackQuery(txt.record_not_found);
	}
	try {
		switch (action) {
			case 'upd':
				const recordKb = getRecordKb(record._key as string);
				const info = await recordInfo(record);
				await ctx.editMessageText(info, {
					reply_markup: recordKb,
					parse_mode: 'HTML',
				});
				await ctx.answerCallbackQuery();
				break;
			case 'exit':
				await Record.exit(record);
				// todo: подтверждение действия
				const exitMessage = `☑️ Тягач с гос. номером <b>${record.truck}</b> вышел из очереди`
				await ctx.editMessageText(exitMessage, {parse_mode: 'HTML'});
				await ctx.answerCallbackQuery();
				await ctx.api.sendMessage(
					conf.recordsChannel,
					exitMessage,
					{
						parse_mode: 'HTML',
					}
				);
				break;
			case 'finish':
				// todo: подтверждение действия
				await Record.finish(record);
				const finishMessage = `✅ Тягач с гос. номером <b>${record.truck}</b> заехал на МАПП`;
				await ctx.editMessageText(finishMessage, {parse_mode: 'HTML'});
				await ctx.answerCallbackQuery();
				await ctx.api.sendMessage(
					conf.recordsChannel,
					finishMessage,
					{
						parse_mode: 'HTML',
					}
				);
				break;
		}
	} catch (error) {
		if (isNotModifiedError(error)) return await ctx.answerCallbackQuery(txt.no_change);;
		throw error;
	}
});

const router = new Router<MyContext>((ctx) => ctx.session.step);

router.route('truck', async (ctx, next) => {
	if (!ctx.from?.id || !ctx.message?.text) {
		return await next();
	}
	// todo: validate valid truck number by internet
	let truckNumber = ctx.message.text.toLocaleUpperCase();
	if (!/^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(truckNumber)) {
		return await ctx.reply(txt.set_truck, { parse_mode: 'HTML' });
	}
	const truck: ITruck = {
		mapp: ctx.session.record.mapp,
		truck: truckNumber
	};
	const existingTruck = await Record.find(truck);
	if (existingTruck) {
		ctx.session.step = 'idle';
		ctx.session.record.truck = '';

		return await ctx.reply(
			truckExistsTxt(existingTruck),
			{
				reply_markup: { remove_keyboard: true },
				parse_mode: 'HTML'
			}
		);
	}
	ctx.session.record.truck = truck.truck;

	ctx.session.step = 'infront';
	await ctx.reply(txt.set_infront, { reply_markup: {remove_keyboard: true}, parse_mode: 'HTML' });
});

router.route('infront', async (ctx, next) => {
	if (!ctx.from?.id || !ctx.message?.text) {
		return await next();
	}
	// todo: validate valid truck number
	let infrontNumber: string | null = ctx.message.text.toLocaleUpperCase();
	// check if infrontNumber is not equal to truckNumber
	if (infrontNumber === ctx.session.record.truck) {
		return await ctx.reply('одинаковые номера недопустимы', { parse_mode: 'HTML' });
	}
	if (!/^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(infrontNumber) && infrontNumber !== '0') {
		return await ctx.reply(txt.set_infront, { parse_mode: 'HTML' });
	}
	if (infrontNumber === '0') infrontNumber = null;
	ctx.session.record.infront = infrontNumber;

	ctx.session.step = 'inn';
	await ctx.reply(txt.set_inn, { reply_markup: {remove_keyboard: true}, parse_mode: 'HTML' });
});

router.route('inn', async (ctx, next) => {
	if (!ctx.from?.id || !ctx.message?.text) {
		return await next();
	}

	let inn = ctx.message.text;
	if (!/^\d{10,12}$/.test(inn)) {
		return await ctx.reply(txt.set_inn, { parse_mode: 'HTML' });
	}

	ctx.session.record.inn = inn;

	const recordInfo = await checkRecordInfo(ctx);
	if (!recordInfo) return;

	ctx.session.step = 'createRecord';

	await ctx.reply(
		recordInfo,
		{
			reply_markup: {
				keyboard: confirmKB.build(),
				resize_keyboard: true,
			},
			parse_mode: 'HTML'
		}
	);
});

router.route('createRecord', async (ctx) => {
	// todo: пускать только confirmKBTxt
	if (ctx.message?.text === confirmKBTxt.CANCEL) {
		await ctx.deleteMessage();
		await ctx.reply(`${confirmKBTxt.CANCEL}`, {
			reply_markup: { remove_keyboard: true },
		});
		ctx.session.step = 'idle';
		return;
	}
	const userId = ctx.msg?.from?.id;
	const contact = ctx.msg?.contact;
	if (contact && contact.user_id !== userId) {
		return await ctx.reply('Ожидается Ваш telegram-контакт');
	}
	const timestamp =  new Date();

	// const lastRecord = await Record.getLast(ctx.session.record.mapp);

	if (!(contact && userId)) {
		return await ctx.reply(`Нажмите "${confirmKBTxt.CANCEL}" или "${confirmKBTxt.CREATERECORD}"`,
			{
				reply_markup: {
					keyboard: confirmKB.build(),
					resize_keyboard: true,
					// input_field_placehoder: 'Send LEFT or RIGHT', // todo why does not work
				},
				parse_mode: 'HTML'
			}
		);
	}

	// todo транзакции
	const recordDto: IRecord = {
		mapp: ctx.session.record.mapp,
		truck: ctx.session.record.truck,
		infront: ctx.session.record.infront,
		inn: ctx.session.record.inn,
		tg_user_id: userId,
		tg_tel: contact.phone_number,
		tg_contact: contact,
		timestamp: Date.now(),
		created_at: new Date(timestamp),
		status: 'ENTERED'
	};
	let record: IRecord;
	try {
		record = await Record.create(recordDto);
	} catch (error) {
		// на случай одновременной записи
		if (error instanceof ArangoError && error.code === 409) {
			ctx.session.step = 'idle';
			ctx.session.record.truck = '';
			return await ctx.reply(
				truckExistsTxt(recordDto),
				{
					reply_markup: { remove_keyboard: true },
					parse_mode: 'HTML'
				}
			);
		}
		throw error;
	}

	const position = await Record.getPosition(record);

	let msg = `🚛 Тягач с гос. номером <b>${record.truck}</b> записан в очередь на МАПП ${Mapps[record.mapp]}.\n`;
	if (record.infront) msg += `Впередистоящий тягач: ${record.infront}\n`;
	msg += `Текущая позиция в очереди: ${position}`;

	await ctx.api.sendMessage(
		conf.recordsChannel,
		msg,
		{
			parse_mode: 'HTML',
		}
	);

	await ctx.reply(
		msg,
		{
			reply_markup: { remove_keyboard: true },
			parse_mode: 'HTML'
		}
	);

	ctx.session.record.mapp = 'Zab';
	ctx.session.record.truck = '';
	ctx.session.step = 'idle';
	return;
});

bot.use(router);

// unhandled updates
bot.use(async (ctx, next) => {
	if (conf.nodeEnv === 'development') {
		console.log('!!! UNHANDLED UPDATE');
	}

	// todo: respond something
	await db.collection('Unhandled').save({ update: ctx.update });
	ctx.session.step = 'idle';
	await ctx.reply(txt.info, {
		reply_markup: { remove_keyboard: true },
	});
	// await next();
});

bot.catch(async (err) => {
	try {
		await db.collection('Errors').save(err);

		const ctx = err.ctx;
		console.error(`Error while handling update ${ctx.update.update_id}:`);
		const e = err.error;
		if (e instanceof BotError) {
			console.error('Bot Error:', e.error);
		} else if (e instanceof GrammyError) {
			// if (isNotModifiedError(e)) return; // ignore this error
			console.error('Error in request:', e.description);
		} else if (e instanceof HttpError) {
			console.error('Could not contact Telegram:', e);
		} else {
			console.error('UNKNOWN_ERROR::', e);
		}
	} catch (error) {
		console.error('Error while err handle:', error);
	}
});

async function main() {
	await dbEnsureCollections();
	await dbEnsureIndexes();

	await bot.api.setMyCommands([
		// { command: 'enter', description: 'Записаться в очередь' },
		// { command: 'myrecs', description: 'Мои записи' },
		// { command: 'dostavka', description: 'О доставк	е' },
		{ command: 'start', description: 'Перезапуск бота' },
		{ command: 'info', description: 'Информация' },
	]);
	// This will connect to the Telegram servers and wait for messages.
	bot.start({
		onStart: (botInfo) => console.log(`${botInfo.username} ran at ${new Date()}`),
		allowed_updates: ['message', 'callback_query'], //'channel_post'
	});
}

main();
