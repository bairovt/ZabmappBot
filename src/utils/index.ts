export * from './allowed';
export * from './dates';

export function isNotModifiedError(error: any): boolean {
	return (
		error.description &&
		error.description.match &&
		error.description.match(/message is not modified/i)
	);
}
