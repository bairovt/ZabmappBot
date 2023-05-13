import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') }); // for pm2

type NodeEnvType = 'development' | 'production';

interface IConf {
	nodeEnv: NodeEnvType;
	bot: {
		token: string | undefined;
	};
	db: {
		url: string | undefined;
		name: string | undefined;
		username: string | undefined;
		password: string | undefined;
	};
	mapZabName: string;
	// channelId: number;
	// channelChatId: number;
	superadmin: number;
	recordsChannel: number;
	// allowAll: boolean;
	// allowedUsers: number[];

	// siteUrl: string;
}

const conf: IConf = {
	nodeEnv: process.env.NODE_ENV as NodeEnvType,
	bot: {
		token: process.env.BOT_TOKEN,
	},
	db: {
		url: process.env.DB_URL,
		name: process.env.DB_NAME,
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
	},
	mapZabName: process.env.MAP_ZAB_NAME as string,
	// channelId: Number(process.env.CHANNEL_ID),
	// channelChatId: Number(process.env.CHANNEL_CHAT_ID),
	superadmin: Number(process.env.SUPERADMIN),
	recordsChannel: Number(process.env.RECORDS_CHANNEL),
	// allowAll: Boolean(Number(process.env.ALLOW_ALL)),
	// allowedUsers: JSON.parse(process.env.ALLOWED_USERS as string) as number[],

	// siteUrl: process.env.SITE_URL as string,
};

export default conf;
