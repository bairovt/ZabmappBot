module.exports = {
  apps : [{
    name      : "ZabmappBot",
    script    : "./bot.js",
    cwd       : "/home/tumen/mapp/mapp75bot/build",
    watch: false,
    instance_var: "INSTANCE_ID",
    env: {
	NODE_ENV: "production",
//	NODE_CONFIG_DIR: '/home/tumen/nodejs/omog-koa/config/',
//	NODE_PATH: '/home/tumen/nodejs/omog-koa'
    },
//    source_map_support: false
  }],
};
