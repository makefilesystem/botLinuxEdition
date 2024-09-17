const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const botToken = process.env.BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: true });

// Загрузка 
function loadAdmins() {
    try {
        const data = fs.readFileSync('admins.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Ошибка при загрузке списка администраторов:', error);
        return [];
    }
}

const admins = loadAdmins();

// данные
const warns = {}; // Варны
const muted = {}; // Муты
const banned = {}; // Баны
const secretCodes = ['mkfs.ext4', 'chmod1488', 'kde_kallde', 'drom', 'linuxvoid', 'root', 'LFS', 'vmware']; 

function isAdmin(userId) {
    return admins.includes(userId);
}

function generateAccessCode() {
    return crypto.randomBytes(4).toString('hex');
}


function warnUser(username, chatId) {
    warns[username] = (warns[username] || 0) + 1;
    bot.sendMessage(chatId, `Пользователю ${username} выдан варн. Всего варнов: ${warns[username]}`);
    if (warns[username] >= 3) {
        bot.sendMessage(chatId, `Пользователь ${username} был забанен за 3 варна.`);
        banned[username] = true;
        bot.banChatMember(chatId, username);
    }
}

// снятие варна
function unwarnUser(username, chatId) {
    if (warns[username]) {
        warns[username] -= 1;
        bot.sendMessage(chatId, `Варн пользователя ${username} был снят. Осталось варнов: ${warns[username]}`);
        if (warns[username] < 3 && banned[username]) {
            banned[username] = false;
            bot.unbanChatMember(chatId, username);
            bot.sendMessage(chatId, `Пользователь ${username} был разбанен.`);
        }
    } else {
        bot.sendMessage(chatId, `У пользователя ${username} нет варнов.`);
    }
}

// показа всех варнов
function showWarns(chatId) {
    let message = "Список варнов:\n";
    for (const [username, count] of Object.entries(warns)) {
        message += `${username}: ${count}\n`;
    }
    bot.sendMessage(chatId, message || "Нет варнов.");
}

// показа всех мутов
function showMutes(chatId) {
    let message = "Список мутов:\n";
    for (const [userId, until] of Object.entries(muted)) {
        message += `ID ${userId}: до ${moment(until).format('LLL')}\n`;
    }
    bot.sendMessage(chatId, message || "Нет мутов.");
}

// показа всех банов
function showBans(chatId) {
    let message = "Список банов:\n";
    for (const [username, until] of Object.entries(banned)) {
        message += `${username}: до ${moment(until).format('LLL')}\n`;
    }
    bot.sendMessage(chatId, message || "Нет банов.");
}

// выдачи мута
function muteUser(userId, chatId, durationMoment) {
    const until = moment().add(durationMoment).toDate();
    muted[userId] = until;
    bot.restrictChatMember(chatId, userId, {
        until_date: Math.floor(until.getTime() / 1000),
        can_send_messages: false
    });
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был замьючен на ${durationMoment.humanize()}.`);
}

// размьют пользователя
function unmuteUser(userId, chatId) {
    bot.restrictChatMember(chatId, userId, {
        can_send_messages: true
    });
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был размьючен.`);
    delete muted[userId];
}

// выдачи бана
function banUser(userId, chatId, durationMoment) {
    const until = moment().add(durationMoment).toDate();
    banned[userId] = until;
    bot.banChatMember(chatId, userId, {
        until_date: Math.floor(until.getTime() / 1000)
    });
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был забанен на ${durationMoment.humanize()}.`);
}

// разбан пользователя
function unbanUser(userId, chatId) {
    bot.unbanChatMember(chatId, userId);
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был разбанен.`);
    delete banned[userId];
}

function tellJoke(chatId) {
    const jokes = [
        "муси-пуси линукс-сусе джага-джага, виндоус - шняга",
        "Некоторые игры запускать на линуксе интереснее чем играть в них",
        "Билл Гейтс застукал жену с Линуксом.",
        "Я понял чем Линукс от Винды отличается! В нем можно биться головой о клавиатуру, и у тебя не откроются десятки программ, которые ты видишь первый раз в жизни!').",
        "главный инструмент любого линуксоида, - это огромный, мозолистый мозг"
    ];
    const randomIndex = Math.floor(Math.random() * jokes.length);
    bot.sendMessage(chatId, jokes[randomIndex]);
}

function runQuiz(chatId) {
    const quizzes = [
        { question: 'Какой оператор используется для сравнения в C++?', answer: '==' },
        { question: 'Какой командой в bash можно вывести список файлов в директории?', answer: 'ls' },
        { question: 'Что такое pamac?', answer: 'Говно' },
        { question: 'Что такое aur, в arch Linux/Arch based distributions?', answer: 'Arch User Repository' },
        { question: 'Какой самый простой способ установить LFS, на реальное железо?', answer: 'Руками' }
    ];
    const randomIndex = Math.floor(Math.random() * quizzes.length);
    const quiz = quizzes[randomIndex];
    bot.sendMessage(chatId, `Вопрос: ${quiz.question}`);
    bot.once('message', (msg) => {
        if (msg.chat.id === chatId) {
            if (msg.text.trim().toLowerCase() === quiz.answer.toLowerCase()) {
                bot.sendMessage(chatId, "Правильно!");
            } else {
                bot.sendMessage(chatId, "Неправильно.");
            }
        }
    });
}

// Команда /myid
bot.onText(/\/myid/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    bot.sendMessage(chatId, `Твой ID: ${userId}`);
});

// Основные команды
bot.onText(/\/startx/, (msg) => {
    bot.sendMessage(msg.chat.id, "xinit: unable to run server");
});

bot.onText(/\/joke/, (msg) => {
    tellJoke(msg.chat.id);
});

bot.onText(/\/quiz/, (msg) => {
    runQuiz(msg.chat.id);
});

// Модерационные команды
bot.onText(/\/warn (.+)/, (msg, match) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        const username = match[1];
        warnUser(username, msg.chat.id);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/unwarn (.+)/, (msg, match) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        const username = match[1];
        unwarnUser(username, msg.chat.id);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/warns/, (msg) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        showWarns(msg.chat.id);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/bans/, (msg) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        showBans(msg.chat.id);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/mutes/, (msg) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        showMutes(msg.chat.id);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/mute (\d+)(m|h|d)/ , (msg, match) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        const muteUserId = msg.reply_to_message.from.id;
        const duration = parseInt(match[1]);
        const unit = match[2];
        let durationMoment = moment.duration(duration, unit);
        muteUser(muteUserId, msg.chat.id, durationMoment);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/unmute/, (msg) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        const unmuteUserId = msg.reply_to_message.from.id;
        unmuteUser(unmuteUserId, msg.chat.id);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/ban (\d+)(m|h|d|y)/, (msg, match) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        const banUserId = msg.reply_to_message.from.id;
        const duration = parseInt(match[1]);
        const unit = match[2];
        let durationMoment = moment.duration(duration, unit);
        banUser(banUserId, msg.chat.id, durationMoment);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

bot.onText(/\/unban/, (msg) => {
    const userId = msg.from.id;
    if (isAdmin(userId)) {
        const unbanUserId = msg.reply_to_message.from.id;
        unbanUser(unbanUserId, msg.chat.id);
    } else {
        bot.sendMessage(msg.chat.id, "Permission Denied!");
    }
});

// Дополнительные команды

const accessCommands = [
    '/access mkfs.ext4',
    '/access chmod1488',
    '/access kde_kallde',
    '/access drom',
    '/access linuxvoid',
    '/access root',
    '/access LFS',
    '/access vmware'
];

// Функция для проверки команд
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Проверяем, есть ли текст сообщения в списке команд
    if (accessCommands.includes(text)) {
        bot.sendMessage(chatId, 'Ты угадал код!\nНапиши /myid и позови мкфс');
    }
});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();
  
    if (text === 'Пинг') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Понг!`;
  
      // Отправляем сообщение с упоминанием пользователя
      bot.sendMessage(chatId, replyMessage, {
        parse_mode: 'Markdown'
      });
    }
  });

bot.onText(/\/echo (.+)/, (msg, match) => {
    bot.sendMessage(msg.chat.id, match[1]);
});

bot.onText(/\/date/, (msg) => {
    bot.sendMessage(msg.chat.id, `Текущая дата: ${moment().format('LL')}`);
});

bot.onText(/\/kernelpanic/, (msg) => {
    bot.sendMessage(msg.chat.id, "Kernel panic — все пизда!");
});

bot.onText(/\/grub/, (msg) => {
    bot.sendMessage(msg.chat.id, "Обновление загрузчика GRUB завершено.");
});

bot.onText(/\/ls/, (msg) => {
    bot.sendMessage(msg.chat.id, "text.txt");
});

bot.onText(/\/cat_text.txt/, (msg) => {
    bot.sendMessage(msg.chat.id, "hey there");
});

bot.onText(/\/uptime/, (msg) => {
    bot.sendMessage(msg.chat.id, `Uptime ${process.uptime()} `);
});

// СООБЩЕНИЯ БЕЗ /

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();
  
    if (text === 'sudo rm -rf /*') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Ну ты и шутник!`;
  
      // Отправляем сообщение с упоминанием пользователя
      bot.sendMessage(chatId, replyMessage, {
        parse_mode: 'Markdown'
      });
    }
  });

  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();
  
    if (text === 'sudo xbps-install mate-desktop') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Ну ты и шутник!`;
  
      // Отправляем сообщение с упоминанием пользователя
      bot.sendMessage(chatId, replyMessage, {
        parse_mode: 'Markdown'
      });
    }
  });

  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();
  
    if (text === 'doas rm -rf /* --no-preserve-root') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Ну ты и шутник!`;
  
      // Отправляем сообщение с упоминанием пользователя
      bot.sendMessage(chatId, replyMessage, {
        parse_mode: 'Markdown'
      });
    }
  });

  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();
  
    if (text === 'sudo rm -rf /* --no-preserve-root') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Ну ты и шутник!`;
  
      // Отправляем сообщение с упоминанием пользователя
      bot.sendMessage(chatId, replyMessage, {
        parse_mode: 'Markdown'
      });
    }
  });

  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();
  
    if (text === 'rm -rf /*') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Permission Denied!`;
  
      // Отправляем сообщение с упоминанием пользователя
      bot.sendMessage(chatId, replyMessage, {
        parse_mode: 'Markdown'
      });
    }
  });



  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();

  if (text === 'doas /warn @makefilesystem') {
    const mention = `@${msg.from.username || userName}`;
    const replyMessage = `${mention} Сука`;

    // Отправляем сообщение с упоминанием пользователя
    bot.sendMessage(chatId, replyMessage, {
      parse_mode: 'Markdown'
    });
  }
});

// Команда /help для показа мануала
bot.onText(/\/help/, (msg) => {
    const helpMessage = `
📘 *Мануал по командам бота*

*Основные команды*:
/start — Приветственное сообщение.
/joke — Рассказать шутку.
/quiz — Запустить викторину.
Пинг — Проверить доступность бота.
/echo [текст] — Повторить сообщение.
/date — Показать текущую дату.
/help — Показать список команд.

*Модерационные команды* _(доступны только администраторам)_:
/warn [username] — Выдать варн пользователю. Три варна — автоматический бан.
/unwarn [username] — Убрать варн у пользователя.
/warns — Показать список всех пользователей с варнами.
/mute [время][m|h|d] — Замьютить пользователя на определённое время. Пример: /mute 5m.
/unmute — Размьютить пользователя.
/mutes — Показать список всех замьюченных пользователей.
/ban [время][m|h|d|y] — Забанить пользователя на время или навсегда. Пример: /ban 1h.
/unban — Разбанить пользователя.
/bans — Показать список всех забаненных пользователей.

*Дополнительные команды*:
/access [код] — Получить доступ к модерационным командам, введя секретный код.
/kernelpanic
/grub
/uptime
    `;
    bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/timer (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const timeInSeconds = parseInt(match[1]); 

    if (isNaN(timeInSeconds) || timeInSeconds <= 0) {
        bot.sendMessage(chatId, 'Укажи корректное время в секундах.');
        return;
    }

    bot.sendMessage(chatId, `Таймер установлен на ${timeInSeconds} секунд.`);

    setTimeout(() => {
        bot.sendMessage(chatId, `@${msg.from.username}, Подъем, страна великая!`);
    }, timeInSeconds * 1000);
});
