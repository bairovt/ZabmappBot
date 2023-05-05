import { InlineKeyboard, Keyboard } from 'grammy';
import { Mapps, TMapp } from './models/Record';

export enum confirmKBTxt {
	CANCEL = 'Отмена',
	CREATERECORD = 'Подтвердить запись',
}

export function getRecordKb(recordKey: string): InlineKeyboard {
	const recordKb = new InlineKeyboard()
		.text('Обновить', `rec:${recordKey}:upd`)
		.text('Выйти', `rec:${recordKey}:exit`)
		.row()
		.text('ЗАЕХАЛ!', `rec:${recordKey}:finish`);
	return recordKb;
}

export function getMappsKb(): InlineKeyboard {

	// generate mapps keyboard from enum Mapss
	const mappsKb = new InlineKeyboard();

	const mappKeys = Object.keys(Mapps).filter((key) => isNaN(Number(key)));
	console.log(mappKeys);
	for (const mappKey of mappKeys) {
		mappsKb.text(Mapps[mappKey as TMapp], `mapp:${mappKey}`).row();
	}
	return mappsKb;
}

export const confirmKB = new Keyboard()
	.text(confirmKBTxt.CANCEL)
	.requestContact(confirmKBTxt.CREATERECORD); // Отправить мой контакт

export const changeRecordKb = new InlineKeyboard()
	.text('✏️ Пунт пропуска', 'changeRecordMapp')
	.row()
	.text('✏️ Номер тягача', 'changeRecordTruck')
	.row();
	// .text('✏️ Телефон', 'changeRecordPhone')
	// .row();

export const confirmRecordKb = new InlineKeyboard()
	.text('Изменить', 'changeRecord')
	.text('Подтвердить', 'confirmRecord')
	.row();
