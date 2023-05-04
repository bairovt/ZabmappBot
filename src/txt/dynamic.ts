import { IRecord, Mapps } from "../models/Record";

export function truckExistsTxt(record: IRecord) {
	const text = `Тягач с гос. номером <b>${record.truck}</b> уже записан в очередь на МАПП ${Mapps[record.mapp]}.\nДублирование невозможно.`;
	return text;
}
