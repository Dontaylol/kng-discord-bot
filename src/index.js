require('dotenv').config();
const { Client, GatewayIntentBits, Events, PermissionsBitField, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// ======================
// ⚙️ CONFIG
// ======================
const SERVER_1_ID = '1540006118489591919';
const SERVER_2_ID = '1498039515149766847';
const WELCOME_CHANNEL_NAME = 'welcome';
const AUTO_ROLE_NAME = 'Member';
const LOG_CHANNEL_NAME = 'mod-logs';
const ANNOUNCE_CHANNEL_NAME = 'announcements';

// Game Roles — Server 1
const SERVER1_ROLES = [
  { name: 'Peak', emoji: '🏔️' },
  { name: 'Call of Duty', emoji: '🔫' },
  { name: 'Siege', emoji: '🛡️' },
  { name: 'Roblox', emoji: '🧱' },
  { name: 'Dead by Daylight', emoji: '👻' },
  { name: 'MineCraft', emoji: '⛏️' }
];

// Game Roles — Server 2
const SERVER2_ROLES = [
  { name: 'DeadByDaylight', emoji: '👻' },
  { name: 'ReadyOrNot', emoji: '🚔' },
  { name: 'Siege', emoji: '🛡️' },
  { name: 'GrayZoneWarfare', emoji: '🌐' },
  { name: 'Roblox', emoji: '🧱' },
  { name: 'MineCraft', emoji: '⛏️' }
];

// VC Key Request — Server 2
const VC_KEY_ROLES = [
  { name: 'Kegan', emoji: '🔑', id: '1495528302159331398' },
  { name: 'Geo', emoji: '🗺️', id: '1110250160086335680' },
  { name: 'Biggies', emoji: '💰', id: '875435665502920725' }
];

const CURRENCY_NAME = 'Coins';
const STARTING_COINS = 100;
const DAILY_REWARD = 50;

// IMAGE LINK — DIRECT LINK
const DOX_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1491448866577318071/1540332592585510972/IMG_0595.jpg';

// ======================
// 💾 DATA STORAGE
// ======================
const BALANCES_FILE = './balances.json';
const LEVELS_FILE = './levels.json';
const LAST_DAILY_FILE = './lastdaily.json';
const WARN_FILE = './warnings.json';

let balances = fs.existsSync(BALANCES_FILE) ? JSON.parse(fs.readFileSync(BALANCES_FILE)) : {};
let levels = fs.existsSync(LEVELS_FILE) ? JSON.parse(fs.readFileSync(LEVELS_FILE)) : {};
let lastDaily = fs.existsSync(LAST_DAILY_FILE) ? JSON.parse(fs.readFileSync(LAST_DAILY_FILE)) : {};
let warnings = fs.existsSync(WARN_FILE) ? JSON.parse(fs.readFileSync(WARN_FILE)) : {};

function saveData() {
  fs.writeFileSync(BALANCES_FILE, JSON.stringify(balances, null, 2));
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
  fs.writeFileSync(LAST_DAILY_FILE, JSON.stringify(lastDaily, null, 2));
  fs.writeFileSync(WARN_FILE, JSON.stringify(warnings, null, 2));
}

// Announcement every 6 hours
setInterval(() => {
  bot.guilds.cache.forEach(guild => {
    const channel = guild.channels.cache.find(c => c.name === ANNOUNCE_CHANNEL_NAME || c.name === 'general' || c.type === 0);
    if (channel) {
      channel.send('@everyone How is everyone doing today? Stay safe and have fun!');
    }
  });
}, 6 * 60 * 60 * 1000);

// Keep bot alive — prevent Render sleep
setInterval(() => {
  console.log('✅ Bot heartbeat — staying alive!');
}, 300000); // Every 5 minutes

// ======================
// 🚀 BOT READY
// ======================
bot.on(Events.ClientReady, () => {
  console.log(`✅ BOT ONLINE: ${bot.user.tag}`);
  bot.user.setActivity('Type !help for commands!', { type: 'PLAYING' });
});

// ======================
// 🎯 WELCOME & AUTO-ROLE
// ======================
bot.on(Events.GuildMemberAdd, async member => {
  try {
    const welcomeChannel = member.guild.channels.cache.find(c => c.name === WELCOME_CHANNEL_NAME);
    if (welcomeChannel) {
      welcomeChannel.send(`Welcome to the server, ${member}! 🎉 Make sure to read the rules and have fun!`);
    }
    const autoRole = member.guild.roles.cache.find(r => r.name === AUTO_ROLE_NAME);
    if (autoRole) {
      await member.roles.add(autoRole);
    }
  } catch (e) { console.log('Welcome error:', e.message); }
});

// ======================
// 🛡️ ANTI-NUKE / SECURITY
// ======================
bot.on(Events.GuildRoleDelete, async role => {
  try {
    const logs = role.guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
    const audit = await role.guild.fetchAuditLogs({ type: 32, limit: 1 });
    const deleter = audit.entries.first()?.executor;
    if (!deleter) return;
    const member = await role.guild.members.fetch(deleter.id).catch(() => null);
    if (member && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      if (logs) logs.send(`⚠️ ROLE DELETED: ${deleter} deleted role **${role.name}** — KICKED FOR NUKE PROTECTION!`);
      await member.kick('Anti-Nuke: Deleted role without permission').catch(() => {});
    }
  } catch (e) {}
});

bot.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  const prefix = '!';
  if (!message.content.startsWith(prefix)) {
    // XP System
    if (!levels[message.author.id]) levels[message.author.id] = { xp: 0, level: 0 };
    levels[message.author.id].xp += Math.floor(Math.random() * 5) + 1;
    const needed = levels[message.author.id].level * 100 + 100;
    if (levels[message.author.id].xp >= needed) {
      levels[message.author.id].level++;
      levels[message.author.id].xp = 0;
      message.channel.send(`🎉 ${message.author} LEVEL UP! You are now **Level ${levels[message.author.id].level}**!`);
    }
    saveData();
    return;
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const isMod = message.member.permissions.has(PermissionsBitField.Flags.KickMembers);

  // ======================
  // 📋 HELP
  // ======================
  if (cmd === 'help') {
    return message.channel.send(`
**🤖 KNG BOT COMMANDS**

**SPECIAL**
!doxButcher — Niall Field + photo
!whoistrey — Who is Trey
!joke — Tell a joke
!bestdrink — Best drink
!question — Random question @everyone

**GAMES**
!rps rock/paper/scissors — Win +15 Coins
!8ball question — Magic answer
!coinflip [amount] heads/tails
!dice — Roll dice
!guess — Guess number 1–100, Win +15 Coins

**COINS**
!balance / !bal — Check coins
!daily — Claim +50 Coins every day
!give @User 50 — Send coins to someone

**LEVELS**
!level / !rank — Your level & XP
!leaderboard / !lb — Top 10 richest

**ROLES**
!rolesetup — Post game roles (Server 1)
!roleselection — Post game roles (Server 2)
!keyrequest — Request VC Key (Server 2)

**MOD (STAFF ONLY)**
!kick @User — Kick member
!ban @User — Ban member
!purge 10 — Delete last 10 messages
!warn @User reason — Warn member
!warnings @User — See warnings
    `);
  }

  // ======================
  // 🎯 CUSTOM COMMANDS — WITH IMAGE FIXED!
  // ======================
  if (cmd === 'doxbutcher') {
    const embed = new EmbedBuilder()
      .setTitle('Niall Field')
      .setImage(DOX_IMAGE_URL)
      .setColor('Red');
    return message.channel.send({ embeds: [embed] });
  }

  if (cmd === 'whoistrey') {
    return message.channel.send('some scottish cunt');
  }

  if (cmd === 'bestdrink') {
    return message.channel.send('pepsi');
  }

  if (cmd === 'joke') {
    const jokes = [
      'Why did the scarecrow win an award? He was outstanding in his field!',
      'Why don\'t scientists trust atoms? Because they make up everything!',
      'What do you call a fake noodle? An impasta!',
      'Why did the coffee file a police report? It got mugged!',
      'What do you call a bear with no teeth? A gummy bear!'
    ];
    return message.channel.send(jokes[Math.floor(Math.random() * jokes.length)]);
  }

  if (cmd === 'question') {
    const questions = [
      '@everyone What is the best game of all time?',
      '@everyone What is your go-to snack?',
      '@everyone If you could have any superpower, what would it be?',
      '@everyone What game are you playing right now?',
      '@everyone What is your favorite thing to do when not gaming?'
    ];
    return message.channel.send(questions[Math.floor(Math.random() * questions.length)]);
  }

  // ======================
  // 🎮 GAMES
  // ======================
  if (cmd === 'ping') {
    return message.channel.send(`🏓 Pong! ${Date.now() - message.createdTimestamp}ms`);
  }

  if (cmd === 'rps') {
    if (!balances[message.author.id]) balances[message.author.id] = STARTING_COINS;
    const choices = ['rock', 'paper', 'scissors'];
    const userChoice = args[0]?.toLowerCase();
    if (!choices.includes(userChoice)) return message.channel.send('Use: !rps rock / !rps paper / !rps scissors');
    const botChoice = choices[Math.floor(Math.random() * 3)];
    let result;
    if (userChoice === botChoice) {
      result = 'Tie!';
    } else if (
      (userChoice === 'rock' && botChoice === 'scissors') ||
      (userChoice === 'paper' && botChoice === 'rock') ||
      (userChoice === 'scissors' && botChoice === 'paper')
    ) {
      result = `You win! 🎉 +15 ${CURRENCY_NAME}!`;
      balances[message.author.id] += 15;
    } else {
      result = `I chose ${botChoice}. You lose! 😢`;
    }
    saveData();
    return message.channel.send(`You chose **${userChoice}** — I chose **${botChoice}**\n${result}`);
  }

  if (cmd === '8ball') {
    if (!args.length) return message.channel.send('Ask me something! !8ball Will I win?');
    const answers = ['Yes ✅', 'No ❌', 'Maybe 🤔', 'Definitely ✅✅', 'Absolutely not ❌❌', 'Most likely ✅', 'Don\'t count on it ❌'];
    return message.channel.send(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
  }

  if (cmd === 'coinflip') {
    if (!balances[message.author.id]) balances[message.author.id] = STARTING_COINS;
    const amount = Math.max(1, parseInt(args[0]) || 10);
    const pick = args[1]?.toLowerCase();
    if (!['heads', 'tails'].includes(pick)) return message.channel.send('Use: !coinflip 20 heads or !coinflip 20 tails');
    const flip = Math.random() > 0.5 ? 'heads' : 'tails';
    if (pick === flip) {
      balances[message.author.id] += amount;
      message.channel.send(`🪙 ${flip.toUpperCase()}! You WON ${amount} ${CURRENCY_NAME}!`);
    } else {
      balances[message.author.id] = Math.max(0, balances[message.author.id] - amount);
      message.channel.send(`🪙 ${flip.toUpperCase()}! You LOST ${amount} ${CURRENCY_NAME}!`);
    }
    saveData();
    return;
  }

  if (cmd === 'dice') {
    const roll = Math.floor(Math.random() * 6) + 1;
    return message.channel.send(`🎲 You rolled a **${roll}**!`);
  }

  if (cmd === 'guess') {
    if (!balances[message.author.id]) balances[message.author.id] = STARTING_COINS;
    const num = Math.floor(Math.random() * 100) + 1;
    const guess = parseInt(args[0]);
    if (!guess || guess < 1 || guess > 100) return message.channel.send('Guess a number **1–100**! Example: !guess 42');
    if (guess === num) {
      balances[message.author.id] += 15;
      saveData();
      return message.channel.send(`🎉 CORRECT! The number was **${num}**! +15 ${CURRENCY_NAME}!`);
    }
    return message.channel.send(`❌ Wrong! The number was **${num}**. Try again!`);
  }

  // ======================
  // 💰 COINS
  // ======================
  if (cmd === 'balance' || cmd === 'bal') {
    if (!balances[message.author.id]) balances[message.author.id] = STARTING_COINS;
    return message.channel.send(`💰 ${message.author.username}, you have **${balances[message.author.id]} ${CURRENCY_NAME}**!`);
  }

  if (cmd === 'daily') {
    if (!balances[message.author.id]) balances[message.author.id] = STARTING_COINS;
    const today = new Date().toDateString();
    if (lastDaily[message.author.id] === today) return message.channel.send('⏰ Already claimed today! Come back tomorrow!');
    balances[message.author.id] += DAILY_REWARD;
    lastDaily[message.author.id] = today;
    saveData();
    return message.channel.send(`✅ Daily reward! +${DAILY_REWARD} ${CURRENCY_NAME}! Total: ${balances[message.author.id]}!`);
  }

  if (cmd === 'give') {
    const target = message.mentions.members.first();
    const amount = parseInt(args[1]);
    if (!target || !amount || amount < 1) return message.channel.send('Use: !give @User 50');
    if (!balances[message.author.id] || balances[message.author.id] < amount) return message.channel.send('Not enough coins!');
    if (!balances[target.id]) balances[target.id] = STARTING_COINS;
    balances[message.author.id] -= amount;
    balances[target.id] += amount;
    saveData();
    return message.channel.send(`✅ Gave **${amount} ${CURRENCY_NAME}** to ${target}!`);
  }

  // ======================
  // 📊 LEVELS
  // ======================
  if (cmd === 'level' || cmd === 'rank') {
    if (!levels[message.author.id]) levels[message.author.id] = { xp: 0, level: 0 };
    const { level, xp } = levels[message.author.id];
    const needed = level * 100 + 100;
    return message.channel.send(`📊 ${message.author.username}\nLevel: **${level}**\nXP: ${xp}/${needed}`);
  }

  if (cmd === 'leaderboard' || cmd === 'lb') {
    const sorted = Object.entries(balances).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let text = '🏆 TOP 10 RICHEST\n';
    let place = 1;
    for (const [id, coins] of sorted) {
      try {
        const user = await bot.users.fetch(id);
        text += `${place}. ${user.username} — ${coins} ${CURRENCY_NAME}\n`;
      } catch {
        text += `${place}. Unknown User — ${coins} ${CURRENCY_NAME}\n`;
      }
      place++;
    }
    return message.channel.send(text);
  }

  // ======================
  // 🎭 ROLE SETUP
  // ======================
  if (cmd === 'rolesetup' && message.guild.id === SERVER_1_ID) {
    let desc = 'React to get your game role!\n\n';
    SERVER1_ROLES.forEach(r => desc += `${r.emoji} — **${r.name}**\n`);
    const embed = new EmbedBuilder().setTitle('🎮 Pick Your Game Roles').setDescription(desc).setColor('Blue');
    const msg = await message.channel.send({ embeds: [embed] });
    for (const r of SERVER1_ROLES) await msg.react(r.emoji);
    return;
  }

  if (cmd === 'roleselection' && message.guild.id === SERVER_2_ID) {
    let desc = 'React to get your game role!\n\n';
    SERVER2_ROLES.forEach(r => desc += `${r.emoji} — **${r.name}**\n`);
    const embed = new EmbedBuilder().setTitle('🎮 Pick Your Game Roles').setDescription(desc).setColor('Green');
    const msg = await message.channel.send({ embeds: [embed] });
    for (const r of SERVER2_ROLES) await msg.react(r.emoji);
    return;
  }

  if (cmd === 'keyrequest' && message.guild.id === SERVER_2_ID) {
    let desc = 'Select a key to request access:\n\n';
    VC_KEY_ROLES.forEach(r => desc += `${r.emoji} — **${r.name}**\n`);
    const embed = new EmbedBuilder().setTitle('🔑 Request VC Key Access').setDescription(desc).setColor('Gold');
    const msg = await message.channel.send({ embeds: [embed] });
    for (const r of VC_KEY_ROLES) await msg.react(r.emoji);
    return;
  }

  // ======================
  // 🛡️ MOD COMMANDS
  // ======================
  if (cmd === 'kick' && isMod) {
    const target = message.mentions.members.first();
    if (!target) return message.channel.send('Mention someone to kick!');
    await target.kick(args.slice(1).join(' ') || 'No reason').catch(() => null);
    return message.channel.send(`✅ Kicked ${target.user.username}`);
  }

  if (cmd === 'ban' && isMod) {
    const target = message.mentions.members.first();
    if (!target) return message.channel.send('Mention someone to ban!');
    await target.ban({ reason: args.slice(1).join(' ') || 'No reason' }).catch(() => null);
    return message.channel.send(`✅ Banned ${target.user.username}`);
  }

  if (cmd === 'purge' && isMod) {
    const count = parseInt(args[0]);
    if (!count || count < 1 || count > 100) return message.channel.send('Use: !purge 50 (max 100)');
    const msgs = await message.channel.messages.fetch({ limit: count + 1 });
    await message.channel.bulkDelete(msgs, true).catch(() => null);
    return message.channel.send(`✅ Deleted ${count} messages`).then(m => setTimeout(() => m.delete(), 3000));
  }

  if (cmd === 'warn' && isMod) {
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason';
    if (!target) return message.channel.send('Mention someone to warn!');
    if (!warnings[target.id]) warnings[target.id] = [];
    warnings[target.id].push({ reason, date: new Date().toLocaleString(), mod: message.author.username });
    saveData();
    return message.channel.send(`✅ Warned ${target.user.username}: ${reason}`);
  }

  if (cmd === 'warnings' && isMod) {
    const target = message.mentions.members.first();
    if (!target) return message.channel.send('Mention someone!');
    const list = warnings[target.id] || [];
    return message.channel.send(`⚠️ ${target.user.username} has **${list.length}** warnings:\n${list.map((w, i) => `${i + 1}. ${w.reason} — ${w.date}`).join('\n') || 'None'}`);
  }
});

// ======================
// ✅ REACTION ROLES
// ======================
bot.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  await reaction.message.guild.members.fetch(user.id).catch(() => null);
  const member = reaction.message.guild.members.cache.get(user.id);
  if (!member) return;

  const rolesList = reaction.message.guild.id === SERVER_1_ID ? SERVER1_ROLES :
                    reaction.message.guild.id === SERVER_2_ID ? [...SERVER2_ROLES, ...VC_KEY_ROLES] : [];

  const found = rolesList.find(r => r.emoji === reaction.emoji.name);
  if (!found) return;

  // VC Key Request — DM the owner
  const keyRole = VC_KEY_ROLES.find(vc => vc.emoji === reaction.emoji.name);
  if (keyRole) {
    const owner = await bot.users.fetch(keyRole.id).catch(() => null);
    if (owner) {
      owner.send(`🔑 **KEY REQUEST:** ${user.username} wants access to ${keyRole.name}'s VC!\nReply with: \`!accept ${user.id}\` or \`!deny ${user.id}\``).catch(() => {});
    }
    return member.send(`✅ Request sent to ${keyRole.name}! They will DM you shortly.`).catch(() => {});
  }

  // Game Role — assign directly
  const role = reaction.message.guild.roles.cache.find(r => r.name === found.name);
  if (role) {
    await member.roles.add(role).catch(() => {});
    member.send(`✅ You got the **${found.name}** role!`).catch(() => {});
  }
});

bot.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;
  const rolesList = reaction.message.guild.id === SERVER_1_ID ? SERVER1_ROLES : SERVER2_ROLES;
  const found = rolesList.find(r => r.emoji === reaction.emoji.name);
  if (!found) return;
  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  const role = reaction.message.guild.roles.cache.find(r => r.name === found.name);
  if (role) await member.roles.remove(role).catch(() => {});
});

// ======================
// 🔑 KEY REQUEST ACCEPT/DENY
// ======================
bot.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith('!accept') && !message.content.startsWith('!deny')) return;
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

  const targetId = message.content.split(' ')[1]?.trim();
  if (!targetId) return message.channel.send('Use: !accept <userid> or !deny <userid>');
  const target = await bot.users.fetch(targetId).catch(() => null);
  if (!target) return message.channel.send('User not found!');

  if (message.content.startsWith('!accept')) {
    target.send(`✅ Your VC Key request was **ACCEPTED!**`).catch(() => {});
    return message.channel.send(`✅ Accepted ${target.username}`);
  } else {
    target.send(`❌ Your VC Key request was **DENIED.**`).catch(() => {});
    return message.channel.send(`❌ Denied ${target.username}`);
  }
});

// ======================
// 🚀 LOGIN
// ======================
bot.login(process.env.DISCORD_TOKEN);
