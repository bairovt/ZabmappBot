import { MyContext } from '../context';
import { InlineKeyboard } from 'grammy';
import { Record, User, IRecord } from '../models';
import {txt} from '../txt';
import { confirmKBTxt } from '../keyboards';


export async function recordInfo(record: IRecord): Promise<string> {
	let text = `Номер тягача: <b>${record.truck}</b>.\n`;
	// if (record.infront) {
	// 	text = text + `Впередистоящий тягач: <i>${record.infront}</i>\n`;
	// }
	const position = await Record.getPosition(record);
	text += `Позиция в очереди: ${position}\n`;
	return text;
}

export async function checkRecordInfo(ctx: MyContext): Promise<string> {
	if (!ctx.session.record.mapp) {
		ctx.session.record.mapp = 'Zab';
	}

	if (!ctx.session.record?.truck) {
		ctx.session.step = 'truck';
		await ctx.reply(txt.set_truck, { parse_mode: 'HTML', disable_web_page_preview: true });
		return '';
	}

	if (!ctx.session.record?.infront) {
		ctx.session.step = 'infront';
		await ctx.reply(txt.set_infront, { parse_mode: 'HTML', disable_web_page_preview: true });
		return '';
	}

	if (!ctx.session.record?.inn) {
		ctx.session.step = 'inn';
		await ctx.reply(txt.set_inn, { parse_mode: 'HTML', disable_web_page_preview: true });
		return '';
	}

	const recordSummary = getRecordSummary(ctx);

	const recordInfo = '<b>Информация о записи</b>\n\n' +
						recordSummary +
						`Для записи нажмите кнопку "${confirmKBTxt.CREATERECORD}" и согласитесь на отправку номера телефона.`;
	return recordInfo;
}

export function getRecordSummary(ctx: MyContext): string {
	const recordInfo =
		`Номер тягача: <b>${ctx.session.record.truck}</b>\n` +
		`Номер впередистоящего тягача: <b>${ctx.session.record.infront}</b>\n` +
		`ИНН перевозчика: <b>${ctx.session.record.inn}</b>\n\n`;
	return recordInfo;
}


