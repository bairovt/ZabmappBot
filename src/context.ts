import { SessionFlavor, Context } from 'grammy';
import { TMapp } from './models/Record';

export interface ISessionData {
	// step: 'idle' | 'mapp' | 'truck' | 'infront' | 'phone' | 'createRecord';
	step: 'idle' | 'mapp' | 'truck' | 'infront' | 'inn' | 'createRecord';
	record: {
		mapp: TMapp;
		truck: string;
		infront: string | null;
		inn: string;
	};
}

export function initialSessionData(): ISessionData {
	return { step: 'idle', record: { mapp: 'Zab', truck: '', infront: '', inn: '' } };
}

export type MyContext = Context & SessionFlavor<ISessionData>;
