import { Bot, GrammyError, HttpError, BotError, session } from 'grammy';
import conf from './config/config';
import { User, Log, Record, Mapps, db, dbEnsureIndexes, dbEnsureCollections, TMapp } from './models';
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
	// if (true) throw new Error('test error');
	await Log.create({ update: ctx.update });
	if (!ctx.msg?.from) throw new Error('not a User update');
	// if (ctx.update.message?.text === '/start') return await next();
	// const user = await User.findById(ctx.from?.id as number);
	await next();
});

bot.command('start', async (ctx) => {
	await User.start(ctx, ctx.msg?.from as TUser);
	// todo  refactor this to initialSessionData()
	ctx.session.step = 'idle';
	await ctx.reply(txt.info, {
		reply_markup: { remove_keyboard: true },
	});
});

bot.command('enter', async (ctx) => {
	await User.start(ctx, ctx.msg?.from as TUser);
	ctx.session.record.mapp = 'Zab';

	const usersRecords = await Record.findAllMyRecords(ctx.from?.id as number); // todo: check if id exists

	if (usersRecords.length >= 5) {
		return ctx.reply(txt.limit, {
			reply_markup: { remove_keyboard: true },
		});
	}

	ctx.session.step = 'truck';
	// await ctx.reply(txt.select_mapp, {
	// 	reply_markup: getMappsKb(),
	// });
	// await ctx.editMessageText(`Выбран МАПП: ${Mapps[ctx.session.record.mapp]}`, {
	// 	// reply_markup: { remove_keyboard: true },
	// });
	await ctx.reply(txt.set_truck, { reply_markup: {remove_keyboard: true}, parse_mode: 'HTML' });
});

bot.command('myrecords', async (ctx) => {
	ctx.session.step = 'idle';
	const records = await Record.findAllMyRecords(ctx.from?.id as number); // todo: check if id exists
	if (!records.length) return await ctx.reply(txt.no_records);
	for (const record of records) {
		const recordKb = getRecordKb(record._key as string);
		const info = await recordInfo(record);
		await ctx.reply(info, {
			reply_markup: recordKb,
			parse_mode: 'HTML',
		});
	}
});

bot.command('help', async (ctx) => {
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

// bot.callbackQuery(/^mapp:([a-zA-Z_]+)$/, async (ctx) => {
// 	const data = ctx.match;
// 	//@ts-ignore
// 	const mappKey = data[1];
// 	// const mapp = Mapps[mappKey as TMapp];
// 	ctx.session.record.mapp = mappKey as TMapp;
// 	ctx.session.step = 'truck';
// 	await ctx.editMessageText(`Выбран МАПП: ${Mapps[ctx.session.record.mapp]}`, {
// 		// reply_markup: { remove_keyboard: true },
// 	});
// 	await ctx.reply(txt.set_truck, {});
// });

bot.callbackQuery(/^rec:(\d+):(upd|exit|finish)$/, async (ctx) => {
	const data = ctx.match;
	//@ts-ignore
	const recordKey = data[1];
	//@ts-ignore
	const action = data[2];
	//@ts-ignore

	// const record = await Record.findByKey((record) => record._key === recordKey);
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
				const exitMessage = `Тягач с гос. номером <b>${record.truck}</b> вышел из очереди`
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
				const finishMessage = `Тягач с гос. номером <b>${record.truck}</b> заехал на МАПП`;
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

// router.route('mapp', async (ctx, next) => {
// 	if (!ctx.from?.id || !ctx.message?.text) {
// 		return await next();
// 	}
// 	if (!Object.keys(Mapps).includes(ctx.message.text)) {
// 		return await ctx.reply(txt.select_mapp);
// 	}
// 	ctx.session.record.mapp = ctx.message.text as TMapp;
// 	ctx.session.step = 'truck';

// 	await ctx.reply(txt.set_truck, {
// 		reply_markup: { remove_keyboard: true },
// 	});

// 	// await ctx.reply(ctx.session.record.mapp, { parse_mode: 'HTML' });
// });

router.route('truck', async (ctx, next) => {
	if (!ctx.from?.id || !ctx.message?.text) {
		return await next();
	}
	// todo: validate valid truck number
	let truckNumber = ctx.message.text.toLocaleUpperCase();
	// check if truck number is valid by regex /^([АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2})(\d{2,3})?$/
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
	const recordInfo = await checkRecordInfo(ctx);
	if (!recordInfo) return;
	// await ctx.reply(recordInfo, { reply_markup: confirmRecordKb, parse_mode: 'HTML' });

	ctx.session.step = 'createRecord';
	await ctx.reply(
		// `Для запси нажмите "${confirmKBTxt.CREATERECORD}"\nи подтвердите отправку Вашего telegram-номера`,
		recordInfo,
		{
			reply_markup: {
				keyboard: confirmKB.build(),
				resize_keyboard: true,
				// input_field_placehoder: 'Send LEFT or RIGHT', // todo why does not work
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
		// infront: lastRecord?.truck ?? '',
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

	await ctx.api.sendMessage(
		conf.recordsChannel,
		`Тягач с гос. номером <b>${record.truck}</b> записан в очередь на МАПП ${Mapps[record.mapp]}.\nТекущая позиция в очереди: ${position}`, // todo: enum Mapps
		{
			parse_mode: 'HTML',
		}
	);

	await ctx.reply(
		`Тягач с гос. номером <b>${record.truck}</b> записан в очередь на МАПП ${Mapps[record.mapp]}.\nТекущая позиция в очереди: ${position}`,
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
	await db.collection('UnhandledUpdates').save({ update: ctx.update });
	ctx.session.step = 'idle';
	await ctx.reply(txt.info, {
		reply_markup: { remove_keyboard: true },
	});
	// await next();
});

bot.catch(async (err) => {
	try {
		await db.collection('ErrorsLog').save(err);

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
	await dbEnsureIndexes();
	await dbEnsureCollections();

	await bot.api.setMyCommands([
		{ command: 'enter', description: 'Записаться в очередь' },
		{ command: 'myrecords', description: 'Мои записи' },
		// { command: 'dostavka', description: 'О доставк	е' },
		{ command: 'start', description: 'Перезапуск бота' },
		{ command: 'info', description: 'Справка' },
	]);
	// This will connect to the Telegram servers and wait for messages.
	bot.start({
		onStart: (botInfo) => console.log(`${botInfo.username} ran at ${new Date()}`),
		allowed_updates: ['message', 'callback_query', 'channel_post'],
	});
}

main();
