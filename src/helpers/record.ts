import { MyContext } from '../context';
import { InlineKeyboard } from 'grammy';
import { Record, User, IRecord } from '../models';
import txt from '../txt';
import { confirmKBTxt } from '../keyboards';


export async function recordInfo(record: IRecord): Promise<string> {
	let text = `Номер тягача: <i>${record.truck}</i>.\n`;
	if (record.infront) {
		text = text + `Впередистоящий тягач: <i>${record.infront}</i>\n`;
	}
	const position = await Record.getPosition(record);
	text += `Позиция в очереди: ${position}\n`;
	return text;
}

export async function checkRecordInfo(ctx: MyContext): Promise<string> {
	if (!ctx.session.record.mapp) {
		ctx.session.record.mapp = 'Sts';
	}

	if (!ctx.session.record?.truck) {
		ctx.session.step = 'truck';
		await ctx.reply(txt.set_truck, { parse_mode: 'HTML', disable_web_page_preview: true });
		return '';
	}

	// ctx.session.step = 'idle'; // todo: ???
	const recordInfo = '<b><u>Информация о записи</u></b>\n\n' + getRecortSummary(ctx) +
						`\nНажмите кнопку "${confirmKBTxt.CREATERECORD}" и отправьте свой контакт`;
	return recordInfo;
}

export function getRecortSummary(ctx: MyContext): string {
	const recordInfo =
		`<b>Номер тягача</b>: <i>${ctx.session.record.truck}</i>\n`;
		// `<b>Hомер впереди стоящего тягача:</b>: <i>${ctx.session.record.infront}</i>\n` +
		// `<b>Телефон для связи</b>: <i>${ctx.session.record.phone}</i>\n`;
		// `<b>ИНН отправителя/</b>: <i>${ctx.session.record.inn}</i>\n`;

	return recordInfo;
}


