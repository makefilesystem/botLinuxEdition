const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const botToken = process.env.BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: true });
 
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

const warns = {}; 
const muted = {}; 
const banned = {};

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

function showWarns(chatId) {
    let message = "Список варнов:\n";
    for (const [username, count] of Object.entries(warns)) {
        message += `${username}: ${count}\n`;
    }
    bot.sendMessage(chatId, message || "Нет варнов.");
}

function showMutes(chatId) {
    let message = "Список мутов:\n";
    for (const [userId, until] of Object.entries(muted)) {
        message += `ID ${userId}: до ${moment(until).format('LLL')}\n`;
    }
    bot.sendMessage(chatId, message || "Нет мутов.");
}

function showBans(chatId) {
    let message = "Список банов:\n";
    for (const [username, until] of Object.entries(banned)) {
        message += `${username}: до ${moment(until).format('LLL')}\n`;
    }
    bot.sendMessage(chatId, message || "Нет банов.");
}

function muteUser(userId, chatId, durationMoment) {
    const until = moment().add(durationMoment).toDate();
    muted[userId] = until;
    bot.restrictChatMember(chatId, userId, {
        until_date: Math.floor(until.getTime() / 1000),
        can_send_messages: false
    });
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был замьючен на ${durationMoment.humanize()}.`);
}

function unmuteUser(userId, chatId) {
    bot.restrictChatMember(chatId, userId, {
        can_send_messages: true
    });
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был размьючен.`);
    delete muted[userId];
}

function banUser(userId, chatId, durationMoment) {
    const until = moment().add(durationMoment).toDate();
    banned[userId] = until;
    bot.banChatMember(chatId, userId, {
        until_date: Math.floor(until.getTime() / 1000)
    });
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был забанен на ${durationMoment.humanize()}.`);
}

function unbanUser(userId, chatId) {
    bot.unbanChatMember(chatId, userId);
    bot.sendMessage(chatId, `Пользователь с ID ${userId} был разбанен.`);
    delete banned[userId];
}

function tellRandomFact(chatId) {
    const facts = [
        "Около 60% тела человека состоит из воды.",
        "Пчелы могут распознавать лица.",
        "В Японии есть остров, на котором живут только кролики.",
        "Средняя температура тела человека составляет 37°C.",
        "Собаки могут чувствовать запахи до 100 000 раз лучше, чем люди.",
        "Человеческие глаза могут различать около 10 миллионов цветов.",
        "В 1969 году человек впервые ступил на Луну.",
        "Дельфины спят с одним открытым глазом.",
        "Молния может быть горячее, чем поверхность Солнца.",
        "Самый длинный период, который человек провел без сна, составил 11 дней.",
        "Осьминоги имеют три сердца и голубую кровь.",
        "В Австралии обитает пингвин, который не живет на льду, а на суше.",
        "Самая старая живущая рыба - это акулка, которая может дожить до 400 лет.",
        "В Китае есть деревня, где все жители живут до 100 лет.",
        "Луна отдаляется от Земли на 3,8 см каждый год.",
        "Жирафы могут спать только 30 минут в день.",
        "Жизнь банана длится от 3 до 5 дней после его полного созревания.",
        "В Канаде находится озеро, которое меняет цвет в зависимости от времени года.",
        "Слон — единственное животное, которое не может прыгать.",
        "Альпийские горы продолжают расти на 1 см в год.",
        "Самая длинная река в мире — это река Амазонка.",
        "Зебры имеют уникальные полоски, как отпечатки пальцев у людей.",
        "В мире существует более 2 тысяч языков, которые вымерли.",
        "Медузы не имеют мозга.",
        "Древние египтяне использовали косметику не только для красоты, но и для защиты от солнца.",
        "Человеческие ногти растут быстрее, чем волосы.",
        "Яблоки на 25% состоят из воздуха, поэтому они могут плавать.",
        "Только 2% океанов были исследованы человеком.",
        "На Земле есть место, где не падает дождь в течение десятилетий.",
        "Самое большое живое существо на Земле — гриб в Орегоне.",
        "У страусов самые большие глаза среди наземных животных.",
        "Там, где растут кактусы, осадки могут не выпадать в течение нескольких лет."
    ];
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    bot.sendMessage(chatId, randomFact);
}

bot.onText(/\/fact/, (msg) => {
    tellRandomFact(msg.chat.id);
});

function tellQuote(chatId) {
    const quotes = [
        "«Будь собой, все остальные роли уже заняты.» — Оскар Уайльд",
        "«Не важно, сколько раз ты упал, важно, сколько раз ты поднялся.» — Мэрилин Монро",
        "«Жизнь не в том, чтобы найти себя. Жизнь в том, чтобы создать себя.» — Джордж Бернард Шоу",
        "«Я не хочу, чтобы Linux был простым. Я хочу, чтобы он был мощным.» — Линус Торвальдс",
        "«Linux — это для пользователей, которые могут думать.» — Линус Торвальдс",
        "«Свобода не означает свободу от работы, свобода — это свобода работать без ограничений.» — Ричард Столлман",
        "«Я не считаю, что технологии должны быть закрытыми. Мы должны делиться ими, чтобы люди могли изучать и улучшать их.» — Ричард Столлман",
        "«Linux — это не для тех, кто хочет, чтобы все было просто. Это для тех, кто хочет, чтобы все работало, как нужно.» — Линус Торвальдс",
        "«Linux — юзер френдли, но не долбоеб френдли» — Линус Торвальдс",
        "«Свобода программного обеспечения — это не просто абстракция, это обязательство.» — Ричард Столлман",
        "«Я всегда предпочитал Linux. Он быстрее, безопаснее и просто работает.» — Линус Торвальдс",
        "«Если вы не можете понять код, вы не можете понять, что делает программа.» — Ричард Столлман"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    bot.sendMessage(chatId, randomQuote);
}

bot.onText(/\/quote/, (msg) => {
    tellQuote(msg.chat.id);
});

function calculate(chatId, expression) {
    try {
        const result = eval(expression);
        bot.sendMessage(chatId, `Результат: ${result}`);
    } catch (error) {
        bot.sendMessage(chatId, "Неверное математическое выражение.");
    }
}

bot.onText(/\/calc (.+)/, (msg, match) => {
    calculate(msg.chat.id, match[1]);
});

function daysUntilNewYear(chatId) {
    const now = moment();
    const nextYear = moment().year() + 1;
    const newYear = moment(`${nextYear}-01-01`);
    const daysLeft = newYear.diff(now, 'days');
    bot.sendMessage(chatId, `До нового года осталось ${daysLeft} дней.`);
}

bot.onText(/\/newyear/, (msg) => {
    daysUntilNewYear(msg.chat.id);
});


bot.onText(/\/reminder (\d+)(m|h|d) (.+)/, (msg, match) => {
    const duration = parseInt(match[1]);
    const unit = match[2];
    const reminderText = match[3];
    const durationMoment = moment.duration(duration, unit);

    bot.sendMessage(msg.chat.id, `Напоминание установлено: ${reminderText}`);

    setTimeout(() => {
        bot.sendMessage(msg.chat.id, `⏰ Напоминаю: ${reminderText}`);
    }, durationMoment.asMilliseconds());
});

function tellJoke(chatId) {
    const jokes = [
        "муси-пуси линукс-сусе джага-джага, виндоус - шняга",
        "Некоторые игры запускать на линуксе интереснее чем играть в них",
        "Билл Гейтс застукал жену с Линуксом.",
        "Я понял чем Линукс от Винды отличается! В нем можно биться головой о клавиатуру, и у тебя не откроются десятки программ, которые ты видишь первый раз в жизни!').",
        "главный инструмент любого линуксоида, - это огромный, мозолистый мозг",
        "у слові ебілд буква д явно не на своєму місці",
        "Сын подходит с флешкой к папе-линуксоиду и говорит:\n– Пап, а проиграй-ка мне этот .wav-ик…\n– Ща сынок, только в ядро поддержку саунда вкомпилю…",
        "«Linux. Карманный справочник (основные команды)» - 4409 страниц",
        "Объявлено об объединении Microsoft и Linux. Эмблемой новой системы выбран пингвин, выпадающий в окно.",
        "sudo apt-search girl | grep beautiful",
        "Линукс создан для удобства как птица пингвин - для полета.",
        "- Правда ли, что в дистрибутиве Linux есть фраза 'при изготовлении этого продукта ни один пингвин не пострадал?'\n- Правда. Зато при его установке пострадало много дятлов."
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

// /myid
bot.onText(/\/myid/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    bot.sendMessage(chatId, `Твой ID: ${userId}`);
});

bot.onText(/\/startx/, (msg) => {
    bot.sendMessage(msg.chat.id, "xinit: unable to run server");
});

bot.onText(/\/fetch/, (msg) => {
    bot.sendMessage(msg.chat.id, "Unknown Server");
});

bot.onText(/\/joke/, (msg) => {
    tellJoke(msg.chat.id);
});

bot.onText(/\/quiz/, (msg) => {
    runQuiz(msg.chat.id);
});

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
    const chatId = msg.chat.id;

    if (isAdmin(userId)) {
        const targetUserId = msg.reply_to_message.from.id;

        if (muted[targetUserId]) {
            bot.restrictChatMember(chatId, targetUserId, {
                can_send_messages: true,
                can_send_media_messages: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true
            });
            delete muted[targetUserId];
            bot.sendMessage(chatId, `Пользователь с ID ${targetUserId} был размьючен.`);
        } else {
            bot.sendMessage(chatId, `Пользователь с ID ${targetUserId} не был замьючен.`);
        }
    } else {
        bot.sendMessage(chatId, "Permission Denied!");
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

bot.onText(/\/echo (.+)/, (msg, match) => {
    bot.sendMessage(msg.chat.id, match[1]);
});

bot.onText(/\/date/, (msg) => {
    bot.sendMessage(msg.chat.id, `date: ${moment().format('LL')}`);
});

bot.onText(/\/kernelpanic/, (msg) => {
    bot.sendMessage(msg.chat.id, "kernel panic: not syncing");
});

bot.onText(/\/grub/, (msg) => {
    bot.sendMessage(msg.chat.id, "error: no such partition\nEntering rescue mode...");
});

bot.onText(/\/ls/, (msg) => {
    bot.sendMessage(msg.chat.id, "bot.js");
});

bot.onText(/\/cat/, (msg) => {
    bot.sendMessage(msg.chat.id, "sh: cat: command not found");
});

bot.onText(/\/uptime/, (msg) => {
    bot.sendMessage(msg.chat.id, `Uptime ${process.uptime()} `);
});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'there';
    const text = msg.text.toLowerCase();
  
    if (text === 'sudo rm -rf /*') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Ну ты и шутник!`;
  
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
  
    if (text === 'Ты еблан') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Без оскорблений!`;
  
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
  
    if (text === 'Ты тупой') {
      const mention = `@${msg.from.username || userName}`;
      const replyMessage = `${mention} Ну ты и шутник!`;
  
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

// /help
bot.onText(/\/help/, (msg) => {
    const helpMessage = `
📘 *Мануал по командам бота*

*Основные команды*:
/startx — Проверить работу бота.
/joke — Рассказать шутку.
/quiz — Запустить викторину.
/echo [текст] — Повторить сообщение.
/date — Показать текущую дату
/fetch — проверить ОС сервера.
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
Бот кто <>
/newyear - Показать сколько дней до нового года
/calc <выражение>
/reminder <очемнапомнить> d|m|h
/quote - Цитата
/fact
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
        bot.sendMessage(chatId, `@${msg.from.username} Подъем, страна великая!`);
    }, timeInSeconds * 1000);
});

const chatUsers = {};

async function updateChatMembers(chatId) {
    try {
        
        const members = await bot.getChatAdministrators(chatId);
        
        chatUsers[chatId] = members.map(member => member.user);
    } catch (error) {
        console.error(`[Error while updating members in chat ${chatId}]`, error);
    }
}


function getRandomUser(users) {
    return users[Math.floor(Math.random() * users.length)];
}

// "Бот кто"
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();

    if (text.startsWith('бот кто')) {
        const userText = text.slice(8).trim(); 

        if (!chatUsers[chatId] || chatUsers[chatId].length === 0) {
            await updateChatMembers(chatId);
        }

        const users = chatUsers[chatId] || [];

        if (users.length === 0) {
            bot.sendMessage(chatId, 'Ошибка, уничтожение сервера через 674 секунды');
            return;
        }

        const randomUser = getRandomUser(users);
        const chosenName = randomUser.first_name || 'Аноним'; // Используем имя или "Аноним"

        const response = `${chosenName} ${userText || 'крутой'}`;
        bot.sendMessage(chatId, response);
    }
});

setInterval(async () => {
    for (const chatId in chatUsers) {
        await updateChatMembers(chatId);
    }
}, 60000); 

bot.on('polling_error', (error) => {
	console.log("Polling_error:", error.code, error.response ? error.response.body : error);
});

// rand
bot.onText(/\/rand (.+)/, (msg, match) => {
	    const chatId = msg.chat.id;
	    const input = match[1].trim();

	    if (input.includes('==')) {
		            const [start, end] = input.split('==').map(Number);
		            if (isNaN(start) || isNaN(end) || start >= end) {
				                bot.sendMessage(chatId, 'Укажи корректный диапазон чисел в формате: /rand число1==число2');
				            } else {
						                const randomNum = Math.floor(Math.random() * (end - start + 1)) + start;
						                bot.sendMessage(chatId, `[${start}, ${end}]: ${randomNum}`);
						            }
		        } else {
				        const options = input.split(/\s+/);
				        if (options.length < 2) {
						            bot.sendMessage(chatId, 'Usage: /rand gta rdr skyrim mafia');
						        } else {
								            const randomChoice = options[Math.floor(Math.random() * options.length)];
								            bot.sendMessage(chatId, `${randomChoice}`);
								        }
				    }
});

bot.on('message', (msg) => {
	    const chatId = msg.chat.id;
	    const userWhoActed = msg.from.username || msg.from.first_name || 'Аноним';
	    const replyTo = msg.reply_to_message;

	    if (!replyTo) return; 

	    const targetUser = replyTo.from.username;

	    if (!replyTo) return; 
	    const actionText = msg.text.toLowerCase();

	    if (actionText.includes('обнять')) {
		            bot.sendMessage(chatId, `🤗 ${userWhoActed} обнял ${targetUser}!`);
		        } else if (actionText.includes('поцеловать')) {
				        bot.sendMessage(chatId, `😘 ${userWhoActed} поцеловал ${targetUser}!`);
				    } else if (actionText.includes('пожать руку')) {
					            bot.sendMessage(chatId, `🤝 ${userWhoActed} пожал руку ${targetUser}!`);
					        } else if (actionText.includes('покормить')) {
							        bot.sendMessage(chatId, `🍽️ ${userWhoActed} покормил ${targetUser}!`);
							    } else if (actionText.includes('потеребить волосы')) {
								            bot.sendMessage(chatId, `💆‍♂️ ${userWhoActed} потеребил волосы ${targetUser}!`);
								        } else if (actionText.includes('приласкать')) {
										        bot.sendMessage(chatId, `😊 ${userWhoActed} приласкал ${targetUser}!`);
										    } else if (actionText.includes('успокоить')) {
											            bot.sendMessage(chatId, `🫂 ${userWhoActed} успокоил ${targetUser}!`);
											        } else if (actionText.includes('погладить')) {
													        bot.sendMessage(chatId, `🤗 ${userWhoActed} погладил ${targetUser}!`);
													    } else if (actionText.includes('поцеловать в лоб')) {
														            bot.sendMessage(chatId, `💋 ${userWhoActed} поцеловал ${targetUser} в лоб!`);
														        } else if (actionText.includes('поцеловать в щёку')) {
																        bot.sendMessage(chatId, `😘 ${userWhoActed} поцеловал ${targetUser} в щёку!`);
																    } else if (actionText.includes('погонять')) {
																	            bot.sendMessage(chatId, `🏃‍♂️ ${userWhoActed} погнал ${targetUser}!`);
																	        } else if (actionText.includes('позвать')) {
																			        bot.sendMessage(chatId, `📞 ${userWhoActed} позвал ${targetUser}!`);
																			    } else if (actionText.includes('сделать комплимент')) {
																				            bot.sendMessage(chatId, `💖 ${userWhoActed} сделал комплимент ${targetUser}!`);
																				        } else if (actionText.includes('подарить цветы')) {
																						        bot.sendMessage(chatId, `💐 ${userWhoActed} подарил цветы ${targetUser}!`);
																						    } else if (actionText.includes('погладить по голове')) {
																							            bot.sendMessage(chatId, `🧠 ${userWhoActed} погладил ${targetUser} по голове!`);
																							        } else if (actionText.includes('накормить')) {
																									        bot.sendMessage(chatId, `🍽️ ${userWhoActed} накормил ${targetUser}!`);
																									    } else if (actionText.includes('погладить спину')) {
																										            bot.sendMessage(chatId, `💆‍♀️ ${userWhoActed} погладил спину ${targetUser}!`);
																										        } else if (actionText.includes('обнять сзади')) {
																												        bot.sendMessage(chatId, `🙆‍♂️ ${userWhoActed} обнял ${targetUser} сзади!`);
																												    } else if (actionText.includes('поцеловать в шею')) {
																													            bot.sendMessage(chatId, `💋 ${userWhoActed} поцеловал ${targetUser} в шею!`);
																													        } else if (actionText.includes('прикоснуться к щеке')) {
																															        bot.sendMessage(chatId, `🥰 ${userWhoActed} прикоснулся к щеке ${targetUser}!`);
																															    } else if (actionText.includes('встряхнуть')) {
																																            bot.sendMessage(chatId, `👐 ${userWhoActed} встряхнул ${targetUser}!`);
																																        } else if (actionText.includes('позаботиться')) {
																																		        bot.sendMessage(chatId, `💝 ${userWhoActed} позаботился о ${targetUser}!`);
																																		    } else if (actionText.includes('обнять за талию')) {
																																			            bot.sendMessage(chatId, `💃 ${userWhoActed} обнял ${targetUser} за талию!`);
																																			        } else if (actionText.includes('покачать на руках')) {
																																					        bot.sendMessage(chatId, `💪 ${userWhoActed} покачал ${targetUser} на руках!`);
																																					    } else if (actionText.includes('сделать массаж')) {
																																						            bot.sendMessage(chatId, `💆‍♂️ ${userWhoActed} сделал массаж ${targetUser}!`);
																																						        } else if (actionText.includes('поцеловать в лобик')) {
																																								        bot.sendMessage(chatId, `💋 ${userWhoActed} поцеловал ${targetUser} в лобик!`);
																																								    } else if (actionText.includes('пожать плечо')) {
																																									            bot.sendMessage(chatId, `💪 ${userWhoActed} пожал плечо ${targetUser}!`);
																																									        }
});

