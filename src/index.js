require('dotenv').config();
const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences
  ]
});

// ======================
// ⚙️ SERVER CONFIG
// ======================
const SERVER_1_ID = '1540006118489591919';
const SERVER_2_ID = '1498039515149766847';
const AUTO_MESSAGE_CHANNEL_NAME = 'general';

// 🎮 SERVER 1 ROLES — !rolesetup
const SERVER1_ROLES = {
  '⛰️': 'Peak',
  '🔫': 'Call of Duty',
  '🏰': 'Siege',
  '🎮': 'Roblox',
  '🧟': 'Dead by daylight',
  '⛏️': 'MineCraft'
};

// 🎮 SERVER 2 ROLES — !roleselection
const SERVER2_ROLES = {
  '🧟': 'DeadByDaylight',
  '🎯': 'ReadyOrNot',
  '🏰': 'Siege',
  '🔫': 'GrayZoneWarfare',
  '🎮': 'Roblox',
  '⛏️': 'MineCraft'
};

// 🗝️ KEY REQUESTS (SERVER 2 ONLY)
const KEY_REQUESTS = {
  '🗝️': { name: "Kegan & Moa's Key", roleName: "Kegan & Moa's Key", ownerId: '1495528302159331398' },
  '🦴': { name: "Geo's Key", roleName: "Geo's Key", ownerId: '1110250160086335680' },
  '😈': { name: "Biggie's Key", roleName: "Biggie's Key", ownerId: '875435665502920725' }
};
const pendingRequests = {};

// 🛡️ RAID & NUKE PROTECTION + AUTO BOT KICK
const joinTracker = new Map();
const RAID_THRESHOLD = 7;
const RAID_WINDOW = 10000;
const SUSPICIOUS_BOT_THRESHOLD_MINUTES = 15; // Account younger than this = KICK

// 💰 COINS & LEVELS DATA
const DATA_PATH = path.join(__dirname, 'data.json');
let data = { users: {} };
function loadData() { try { if (fs.existsSync(DATA_PATH)) data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch (e) {} }
function saveData() { fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2)); }
loadData();

function getUser(userId) {
  if (!data.users[userId]) data.users[userId] = { coins: 0, xp: 0, level: 0, daily: 0 };
  return data.users[userId];
}

// ✅ BOT READY
bot.once(Events.ClientReady, b => {
  console.log(`✅ BOT ONLINE: ${b.user.tag}`);
  setTimeout(() => sendAnnouncement(), 5000);
  setInterval(() => sendAnnouncement(), 6 * 60 * 60 * 1000);
});

// 📢 AUTO ANNOUNCEMENT
function sendAnnouncement() {
  bot.guilds.cache.forEach(g => {
    const ch = g.channels.cache.find(c => c.name.toLowerCase() === AUTO_MESSAGE_CHANNEL_NAME.toLowerCase());
    if (ch) ch.send('👋 @everyone How is everyone doing today?').catch(() => {});
  });
}

// 🛡️ AUTO BOT KICK + RAID PROTECTION
bot.on(Events.GuildMemberAdd, async member => {
  const guild = member.guild;
  const now = Date.now();
  const createdAt = member.user.createdTimestamp;
  const accountAgeMinutes = (now - createdAt) / (1000 * 60);

  // 🤖 AUTO-KICK NEW BOTS
  if (member.user.bot && accountAgeMinutes < SUSPICIOUS_BOT_THRESHOLD_MINUTES) {
    try {
      await member.kick(`Suspicious bot — account created ${Math.floor(accountAgeMinutes)} minutes ago`);
      console.log(`🤖 KICKED SUSPICIOUS BOT: ${member.user.tag}`);
      const logCh = guild.channels.cache.find(c => c.name.toLowerCase().includes('mod') || c.name.toLowerCase().includes('log'));
      if (logCh) logCh.send(`🤖 **SUSPICIOUS BOT KICKED:** ${member.user.tag}\nAccount created: ${Math.floor(accountAgeMinutes)} minutes ago`);
    } catch (e) { console.log(`❌ Could not kick bot: ${e.message}`); }
    return;
  }

  // 🚨 RAID PROTECTION
  const guildId = guild.id;
  if (!joinTracker.has(guildId)) joinTracker.set(guildId, []);
  const joins = joinTracker.get(guildId).filter(t => now - t < RAID_WINDOW);
  joins.push(now);
  joinTracker.set(guildId, joins);
  if (joins.length >= RAID_THRESHOLD) {
    console.log(`🚨 RAID DETECTED in ${guild.name}! ${joins.length} joins in 10s`);
    try {
      const logCh = guild.channels.cache.find(c => c.name.toLowerCase().includes('mod') || c.name.toLowerCase().includes('log'));
      if (logCh) logCh.send(`🚨 **RAID DETECTED!** ${joins.length} members joined in 10 seconds!`);
    } catch {}
  }
});

// 🎭 GET ROLES
function getRolesForServer(guildId) {
  if (guildId === SERVER_1_ID) return SERVER1_ROLES;
  if (guildId === SERVER_2_ID) return SERVER2_ROLES;
  return {};
}

// 🎭 REACTION ROLES — ADD
bot.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  const emojiName = reaction.emoji.name;
  const guild = reaction.message.guild;
  const guildId = guild.id;

  // 🗝️ KEY REQUESTS (SERVER 2 ONLY)
  if (KEY_REQUESTS[emojiName] && guildId === SERVER_2_ID) {
    const keyInfo = KEY_REQUESTS[emojiName];
    const requestId = `${user.id}-${Date.now()}`;
    pendingRequests[requestId] = { requesterId: user.id, requesterTag: user.username, keyName: keyInfo.name, roleName: keyInfo.roleName, guildId: guildId };
    const acceptBtn = new ButtonBuilder().setCustomId(`accept-${requestId}`).setLabel('✅ ACCEPT').setStyle(ButtonStyle.Success);
    const denyBtn = new ButtonBuilder().setCustomId(`deny-${requestId}`).setLabel('❌ DENY').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(acceptBtn, denyBtn);
    const embed = new EmbedBuilder().setTitle('🗝️ KEY REQUEST').setColor('#ffcc00').addFields(
      { name: 'Requester', value: `<@${user.id}>`, inline: true },
      { name: 'Key Wanted', value: keyInfo.name, inline: true }
    );
    try {
      const owner = await bot.users.fetch(keyInfo.ownerId);
      await owner.send({ embeds: [embed], components: [row] });
      await reaction.message.channel.send(`✅ Request sent!`);
    } catch {
      await reaction.message.channel.send(`❌ Could not message owner!`);
    }
    return;
  }

  // 🎮 GAME ROLES
  const roles = getRolesForServer(guildId);
  const roleName = roles[emojiName];
  if (!roleName) return;
  const member = guild.members.cache.get(user.id);
  const role = guild.roles.cache.find(r => r.name === roleName);
  if (!role) return;
  try { await member.roles.add(role); } catch (e) { console.log(`❌ ${e.message}`); }
});

// 🎭 REACTION ROLES — REMOVE
bot.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch();
  if (KEY_REQUESTS[reaction.emoji.name]) return;
  const guildId = reaction.message.guild.id;
  const roles = getRolesForServer(guildId);
  const roleName = roles[reaction.emoji.name];
  if (!roleName) return;
  const member = reaction.message.guild.members.cache.get(user.id);
  const role = reaction.message.guild.roles.cache.find(r => r.name === roleName);
  if (member && role) await member.roles.remove(role).catch(() => {});
});

// 🗝️ KEY REQUEST BUTTONS
bot.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;
  const [act, ...rest] = i.customId.split('-');
  const req = pendingRequests[rest.join('-')];
  if (!req) return;
  if (act === 'accept') {
    try {
      const guild = await bot.guilds.fetch(req.guildId);
      const member = await guild.members.fetch(req.requesterId);
      const role = guild.roles.cache.find(r => r.name === req.roleName);
      if (!role) return i.reply({ content: `❌ Role not found!`, ephemeral: true });
      await member.roles.add(role);
      await i.reply({ content: `✅ APPROVED!`, ephemeral: true });
      try { (await bot.users.fetch(req.requesterId)).send(`✅ Approved!`); } catch {}
    } catch (e) { return i.reply({ content: `❌ FAILED: ${e.message}`, ephemeral: true }); }
  } else if (act === 'deny') {
    await i.reply({ content: `❌ Denied`, ephemeral: true });
    try { (await bot.users.fetch(req.requesterId)).send(`❌ Denied.`); } catch {}
  }
});

// 🤖 ALL COMMANDS
bot.on(Events.MessageCreate, async msg => {
  if (msg.author.bot || !msg.guild) return;
  const args = msg.content.trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  const guildId = msg.guild.id;
  const user = getUser(msg.author.id);

  // ======================================
  // 📋 HELP
  // ======================================
  if (cmd === '!help') {
    return msg.reply({ embeds: [new EmbedBuilder().setTitle('🤖 BOT COMMANDS').addFields(
      { name: '✨ SPECIAL', value: '!doxButcher • !whoistrey • !joke • !bestdrink • !question • !serverinfo • !membercount • !botinfo' },
      { name: '🎮 GAMES', value: '!rps rock/paper/scissors • !8ball question • !coinflip [amount] heads/tails • !dice • !guess (1-100) • !flip' },
      { name: '💰 COINS', value: '!balance / !bal • !daily (+50 Coins) • !give @User amount • !rich' },
      { name: '📈 LEVELS', value: '!level / !rank • !leaderboard / !lb' },
      { name: '🎭 ROLES', value: '!rolesetup (Server1) • !roleselection (Server2) • !keyrequest (Server2 only)' },
      { name: '🔧 MOD (STAFF)', value: '!purge [amount] • !kick @User reason • !ban @User reason • !unban UserID • !warn @User reason • !mute @User [h] reason • !slowmode [seconds] • !lock • !unlock' },
      { name: '🛡️ SECURITY', value: 'Auto kick suspicious bots • Auto raid protection • Auto messages every 6h' }
    )]});
  }

  // ======================================
  // ✨ SPECIAL COMMANDS
  // ======================================
  if (cmd === '!doxbutcher' || cmd === '!doxButcher') {
    return msg.reply({ content: 'Niall Field', embeds: [new EmbedBuilder().setImage('https://cdn.discordapp.com/attachments/1491448866577318071/1540332592585510972/IMG_0595.jpg')] });
  }
  if (cmd === '!whoistrey') return msg.reply('some scottish cunt');
  if (cmd === '!joke') {
    const jokes = [
      "😂 Why don't scientists trust atoms? Because they make up everything!",
      "😂 What do you call a fake noodle? An impasta!",
      "😂 Why did the scarecrow win an award? He was outstanding in his field!",
      "😂 I told my wife she was drawing her eyebrows too high. She looked surprised.",
      "😂 Parallel lines have so much in common... it's a shame they'll never meet.",
      "😂 What do you call a bear with no teeth? A gummy bear!",
      "😂 Why did the math book look sad? It had too many problems."
    ];
    return msg.reply(jokes[Math.floor(Math.random() * jokes.length)]);
  }
  if (cmd === '!bestdrink') return msg.reply('pepsi');
  if (cmd === '!question') {
    const questions = [
      '🤔 @everyone What is the best food ever?',
      '🤔 @everyone If you could have any superpower, what would it be?',
      '🤔 @everyone What is your favorite game and why?',
      '🤔 @everyone If you could travel anywhere, where would you go?',
      '🤔 @everyone What is the funniest thing that happened to you this week?',
      '🤔 @everyone If you won £1 million, what is the FIRST thing you would buy?',
      '🤔 @everyone What is your favorite thing to do when bored?',
      '🤔 @everyone What is the most useless talent you have?'
    ];
    return msg.reply(questions[Math.floor(Math.random() * questions.length)]);
  }
  if (cmd === '!serverinfo') {
    const g = msg.guild;
    return msg.reply(`📊 **SERVER INFO:**\n📝 Name: ${g.name}\n👥 Members: ${g.memberCount}\n📅 Created: ${g.createdAt.toLocaleDateString()}\n🆔 ID: ${g.id}\n🔒 Roles: ${g.roles.cache.size}`);
  }
  if (cmd === '!membercount') return msg.reply(`👥 Total Members: **${msg.guild.memberCount}**`);
  if (cmd === '!botinfo') {
    return msg.reply(`🤖 **BOT INFO:**\nName: ${bot.user.username}\n🆔 ID: ${bot.user.id}\n📅 Created: ${bot.user.createdAt.toLocaleDateString()}\n⏰ Uptime: ${Math.floor(bot.uptime / 60000)} minutes\n🛡️ Status: Online & Protected!`);
  }
  if (cmd === '!flip') {
    return msg.reply(Math.random() < 0.5 ? '🪙 **HEADS!**' : '🪙 **TAILS!**');
  }

  // ======================================
  // 🎭 ROLE COMMANDS
  // ======================================
  if (cmd === '!rolesetup' && guildId === SERVER_1_ID) {
    const roles = SERVER1_ROLES;
    let desc = '**React below to get your role!**\n\n';
    for (const [e, n] of Object.entries(roles)) desc += `${e} → ${n}\n`;
    const embed = new EmbedBuilder().setTitle('🎮 SERVER 1 ROLES').setDescription(desc).setColor('#00aaff');
    const sent = await msg.reply({ embeds: [embed] });
    for (const e of Object.keys(roles)) await sent.react(e);
    return;
  }
  if (cmd === '!roleselection' && guildId === SERVER_2_ID) {
    const roles = SERVER2_ROLES;
    let desc = '**React below to get your role!**\n\n';
    for (const [e, n] of Object.entries(roles)) desc += `${e} → ${n}\n`;
    const embed = new EmbedBuilder().setTitle('🎮 SERVER 2 ROLES').setDescription(desc).setColor('#00aaff');
    const sent = await msg.reply({ embeds: [embed] });
    for (const e of Object.keys(roles)) await sent.react(e);
    return;
  }
  if (cmd === '!keyrequest' && guildId === SERVER_2_ID) {
    const emb = new EmbedBuilder().setTitle('🗝️ KEY REQUESTS').setDescription('🗝️ → Kegan & Moa\'s Key\n🦴 → Geo\'s Key\n😈 → Biggie\'s Key');
    const sent = await msg.reply({ embeds: [emb] });
    await sent.react('🗝️'); await sent.react('🦴'); await sent.react('😈');
    return;
  }

  // ======================================
  // 🎮 MINI GAMES
  // ======================================
  if (cmd === '!rps') {
    const choices = ['Rock', 'Paper', 'Scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const userChoice = args[0]?.charAt(0).toUpperCase() + args[0]?.slice(1).toLowerCase();
    if (!choices.includes(userChoice)) return msg.reply('✂️ Use: `!rps Rock` • `!rps Paper` • `!rps Scissors`');
    let result = 'Draw!';
    if ((userChoice === 'Rock' && botChoice === 'Scissors') ||
        (userChoice === 'Paper' && botChoice === 'Rock') ||
        (userChoice === 'Scissors' && botChoice === 'Paper')) {
      result = '🎉 YOU WIN! +15 Coins!'; user.coins += 15; saveData();
    } else if (userChoice !== botChoice) {
      result = '😢 Bot Wins!';
    }
    return msg.reply(`You: **${userChoice}** vs Bot: **${botChoice}**\n${result}`);
  }
  if (cmd === '!8ball') {
    const answers = ['✅ Yes!', '❌ No.', '🤔 Maybe...', '🔮 Definitely!', '😴 Ask again later.', '💯 Most likely!', '⚠️ Cannot predict now.', '🚫 Don\'t count on it.'];
    return msg.reply(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
  }
  if (cmd === '!coinflip' || cmd === '!cf') {
    const bet = parseInt(args[0]) || 0;
    const choice = args[1]?.toLowerCase();
    if (bet < 1) return msg.reply('🪙 Usage: `!coinflip 10 heads` or `!coinflip 5 tails`');
    if (!['heads', 'tails'].includes(choice)) return msg.reply('🪙 Pick: `heads` or `tails`');
    if (user.coins < bet) return msg.reply(`❌ You only have ${user.coins} Coins!`);
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    if (choice === result) {
      user.coins += bet; saveData();
      return msg.reply(`🪙 **${result.toUpperCase()}!** YOU WIN ${bet} Coins! New Balance: ${user.coins}`);
    } else {
      user.coins -= bet; saveData();
      return msg.reply(`🪙 **${result.toUpperCase()}!** You lost ${bet} Coins! New Balance: ${user.coins}`);
    }
  }
  if (cmd === '!dice') {
    const roll = Math.floor(Math.random() * 6) + 1;
    return msg.reply(`🎲 You rolled a **${roll}**!`);
  }
  if (cmd === '!guess') {
    const num = Math.floor(Math.random() * 100) + 1;
    const guess = parseInt(args[0]);
    if (!guess || guess < 1 || guess > 100) return msg.reply('🔢 Guess a number **1–100**! Example: `!guess 42`');
    if (guess === num) {
      user.coins += 15; saveData();
      return msg.reply(`🎉 PERFECT! It was **${num}**! +15 Coins!`);
    }
    return msg.reply(`❌ Wrong! It was **${num}**! Try again!`);
  }

  // ======================================
  // 💰 COINS SYSTEM
  // ======================================
  if (cmd === '!balance' || cmd === '!bal') {
    return msg.reply(`💰 Your Balance: **${user.coins} Coins**\n📊 Level: **${user.level}** • XP: ${user.xp}`);
  }
  if (cmd === '!daily') {
    const now = Date.now();
    if (now - user.daily < 86400000) return msg.reply('⏰ Come back tomorrow for your daily Coins!');
    user.daily = now;
    user.coins += 50;
    saveData();
    return msg.reply('✅ **DAILY CLAIMED!** +50 Coins added! Come back in 24 hours!');
  }
  if (cmd === '!give') {
    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || !amount || amount < 1) return msg.reply('💰 Usage: `!give @User 50`');
    if (user.coins < amount) return msg.reply(`❌ You don't have enough Coins! Balance: ${user.coins}`);
    if (target.id === msg.author.id) return msg.reply('❌ You cannot give to yourself!');
    user.coins -= amount;
    getUser(target.id).coins += amount;
    saveData();
    return msg.reply(`✅ Gave **${amount} Coins** to ${target.username}!`);
  }
  if (cmd === '!rich') {
    const sorted = Object.entries(data.users).sort((a, b) => b[1].coins - a[1].coins).slice(0, 10);
    let desc = '';
    sorted.forEach((u, i) => desc += `${i+1}. <@${u[0]}> — ${u[1].coins} Coins\n`);
    return msg.reply({ embeds: [new EmbedBuilder().setTitle('💰 TOP 10 RICHEST').setDescription(desc || 'No data yet!')] });
  }

  // ======================================
  // 📈 LEVELS / XP
  // ======================================
  if (cmd === '!level' || cmd === '!rank') {
    const needed = user.level * 100 + 100;
    return msg.reply(`📊 **${msg.author.username}**\nLevel: **${user.level}**\nXP: ${user.xp} / ${needed}`);
  }
  if (cmd === '!leaderboard' || cmd === '!lb') {
    const sorted = Object.entries(data.users).sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp).slice(0, 10);
    let desc = '';
    sorted.forEach((u, i) => desc += `${i+1}. <@${u[0]}> — Level ${u[1].level} • ${u[1].xp} XP\n`);
    return msg.reply({ embeds: [new EmbedBuilder().setTitle('🏆 TOP 10 LEADERBOARD').setDescription(desc || 'No data yet!')] });
  }

  // ======================================
  // 🔧 MODERATION
  // ======================================
  if (cmd === '!purge' || cmd === '!clear') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return msg.reply('❌ You need **Manage Messages** permission!');
    const amount = parseInt(args[0]) || 10;
    if (amount < 1 || amount > 100) return msg.reply('❌ Use a number between **1 and 100**! Example: `!purge 50`');
    try {
      await msg.delete();
      const msgs = await msg.channel.bulkDelete(amount, true);
      const confirm = await msg.channel.send(`✅ **PURGE COMPLETE!** Deleted **${msgs.size}** messages!`);
      setTimeout(() => confirm.delete(), 4000);
    } catch (e) { return msg.reply(`❌ Failed: Make sure bot has **Manage Messages** permission!`); }
    return;
  }
  if (cmd === '!kick') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return msg.reply('❌ No permission!');
    const target = msg.mentions.members.first();
    if (!target) return msg.reply('Usage: `!kick @User Reason`');
    const reason = args.slice(1).join(' ') || 'No reason';
    if (target.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply('❌ Cannot kick an Admin!');
    await target.kick(reason);
    return msg.reply(`✅ Kicked ${target.user.username} — ${reason}`);
  }
  if (cmd === '!ban') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply('❌ No permission!');
    const target = msg.mentions.members.first();
    if (!target) return msg.reply('Usage: `!ban @User Reason`');
    const reason = args.slice(1).join(' ') || 'No reason';
    if (target.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply('❌ Cannot ban an Admin!');
    await target.ban({ reason });
    return msg.reply(`✅ Banned ${target.user.username} — ${reason}`);
  }
  if (cmd === '!unban') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply('❌ No permission!');
    const userId = args[0];
    if (!userId) return msg.reply('Usage: `!unban UserID`');
    await msg.guild.bans.remove(userId);
    return msg.reply(`✅ Unbanned user: ${userId}`);
  }
  if (cmd === '!warn') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return msg.reply('❌ No permission!');
    const target = msg.mentions.users.first();
    if (!target) return msg.reply('Usage: `!warn @User Reason`');
    const reason = args.slice(1).join(' ') || 'No reason';
    return msg.reply(`⚠️ Warned ${target.username} — ${reason}`);
  }
  if (cmd === '!mute') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return msg.reply('❌ No permission!');
    const target = msg.mentions.members.first();
    if (!target) return msg.reply('Usage: `!mute @User [hours] Reason`');
    const hours = parseInt(args[1]) || 24;
    const reason = args.slice(2).join(' ') || 'No reason';
    const member = msg.guild.members.cache.get(target.id);
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply('❌ Cannot mute an Admin!');
    await member.timeout(hours * 60 * 60 * 1000, reason);
    return msg.reply(`🔇 Muted ${target.username} for ${hours} hours — ${reason}`);
  }
  if (cmd === '!slowmode') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return msg.reply('❌ No permission!');
    const sec = parseInt(args[0]) || 0;
    await msg.channel.setRateLimitPerUser(sec);
    return msg.reply(`⏱️ Slowmode set to **${sec} seconds**`);
  }
  if (cmd === '!lock') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return msg.reply('❌ No permission!');
    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
    return msg.reply('🔒 Channel LOCKED!');
  }
  if (cmd === '!unlock') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return msg.reply('❌ No permission!');
    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: true });
    return msg.reply('🔓 Channel UNLOCKED!');
  }

  // ======================================
  // 🔹 BASIC
  // ======================================
  if (cmd === '!ping') return msg.reply('🏓 Pong! BOT ONLINE!');
  if (cmd === '!hello' || cmd === '!hi') return msg.reply(`👋 Hello ${msg.author.username}!`);
  if (cmd === '!userinfo') {
    const u = msg.mentions.users.first() || msg.author;
    const m = msg.guild.members.cache.get(u.id);
    return msg.reply(`👤 **${u.username}**\n🆔 ID: ${u.id}\n📅 Joined: ${m.joinedAt.toLocaleDateString()}\n📆 Created: ${u.createdAt.toLocaleDateString()}`);
  }

  // Auto XP gain on every message
  user.xp += 1;
  const needed = user.level * 100 + 100;
  if (user.xp >= needed) {
    user.level += 1;
    user.xp = 0;
    msg.reply(`🎉 LEVEL UP! You are now **LEVEL ${user.level}**!`);
  }
  saveData();
});

// 🔑 LOGIN
bot.login(process.env.DISCORD_TOKEN);
