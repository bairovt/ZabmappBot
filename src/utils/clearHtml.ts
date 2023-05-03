export function clearHtml(text: string) {
	const regex = /<\/?[bisu]>|/gi;
	return text.replace(regex, '');
}
