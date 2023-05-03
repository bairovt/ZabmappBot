export function getMsRuDate(msDate: string): string {
	const date = msDate.split(' ')[0]; //2022-04-27
	const dateArr = date.split('-');
	return `${dateArr[2]}.${dateArr[1]}.${dateArr[0]}`;
}
