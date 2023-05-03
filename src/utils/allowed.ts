import { Context } from 'grammy';
import conf from '../config/config';

// bot.use(async (ctx, next) => {
//   if (!utils.isAllowed(ctx)) {
//     await Log.create({update: ctx.update, allow: false});
//     if (ctx.channelPost || ctx.senderChat?.id === ctx.chat?.id) {
//       // channel_post or Anonymous admin
//       console.log('do nothing');
//       return;
//     }
//     return await ctx.reply('not allowed');
//   }
//   await Log.create({ update: ctx.update, allow: true });
//   await next();
// })

enum SenderType {
	CHAT = 'chat',
	USER = 'user',
	BOT = 'bot',
}

// export function isAllowed(ctx: Context): boolean {
//   let senderType: string;
//   let senderId: number | undefined;

//   if (!ctx.msg) throw new Error('!!! empty ctx.msg');

//   if (ctx.msg.sender_chat) {
//     senderId = ctx.msg.sender_chat.id;
//     senderType = SenderType.CHAT;
//   } else if(ctx.msg.from) {
//     senderId = ctx.msg.from.id;
//     senderType = ctx.msg.from.is_bot ? SenderType.BOT : SenderType.USER;
//   } else {
//     throw new Error('!!! unknown sender type');
//   };
//   if (!senderId) throw new Error('!!! empty sender id');

//   switch (senderType) {
//     case SenderType.CHAT:
//       if ([conf.channelId, conf.channelChatId].includes(senderId)) return true;
//       return false;
//     case SenderType.USER:
//       if (conf.allowAll) return true;
//       if (conf.admins.includes(senderId)) return true;
//       if (conf.allowedUsers.includes(senderId)) return true;
//       return false;
//     case SenderType.BOT:
//       return false;
//     default:
//       return false;
//   }
// }
