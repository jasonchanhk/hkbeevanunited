const { Telegraf, Markup } = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN)
const session = new RedisSession({
  store: {
    host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
    port: process.env.TELEGRAM_SESSION_PORT || 6379,
    password: process.env.TELEGRAM_SESSION_PASSWORD
  },
  //ttl in second: 1 hour
  ttl: 60 * 60
})
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

bot.use(session)

const ApplyRegex = (item, text) => {
  //library for imput regex
  const pattern = {
    order_date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[0y1])$/,
    order_time: /^(0[0-9]|1[0-9]|2[0-3])([012345][0-9])$/,
    flightNumber: /^[a-zA-Z]{2,3}\d{2,4}$/gm,
    name: /^[a-zA-Z\s]*$/gm,
    contact: /(((\+44)? ?(\(0\))? ?)|(0))( ?[0-9]{3,4}){3}/gm,
    items: /^[1-9]\d*$/gm,
    numberinclude0: /^[0-9]\d*$/gm,
    postcode: /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/gm
  };
  //return true/false to see if it match
  const targerPattern = pattern[item]
  const result = targerPattern.test(text)
  console.log(result)
  return result
}

bot.start((ctx) => {
  const username = ctx.message.chat.username
  ctx.reply(`
Welcome onboard, @${username}!

Thank you for chosing HKBeeVanUtd. Our team of professional drivers are dedicated to provide the most flexible and high quality service on your demand. 

The most common package we offer is the standard 1-hour door to door service with our medium van(L: 2.4m/ W: 1.7m/ H: 1.5m). Send us a message to know how we can help!

/callvan Send order to our team
/status Check order status
/cancel Cancel existing order
  `)
})

bot.command('callvan', (ctx) => {
  const user_chat_id = ctx.message.chat.id;
  const chatUsername = ctx.message.chat.username;
  const today = new Date();
  const input_date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  const input_time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  const orderinfo = {
    order_id: uuidv4(),
    user_chat_id: user_chat_id,
    username: chatUsername,
    service: null,
    input_date: input_date,
    input_time: input_time,
    status: "drafting",
    order_date: null,
    order_time: null,
    pick_up_address: null,
    pick_up_postcode: null,
    drop_off_address: null,
    drop_off_postcode: null,
    distance: null,
    charges: null,
    items: null,
    helpers: null,
    assemble_services: null,
    extra_hours: null,
    flightNumber: null,
    name: null,
    contact: null,
    preferred_contact: null
  }
  if (Object.keys(ctx.session).length !== 0) {
    ctx.reply(
      `HKBeeVanUtd - you have already filed an order: 

Username: ${ctx.session.username}
Service: ${ctx.session.service}
OrderID: ${ctx.session.order_id}

/cancel it if you want to make a new order`
    )
  } else {
    ctx.session = orderinfo
    ctx.reply("HKBeeVanUtd - please select your service",
      Markup
        .keyboard([["Manchester Airport Transfer"], ["Home Moving"], ["Furniture Delivery and Assembly"], ["Goods Delivery"]]).oneTime()
    )
  }
})

bot.action(/(.*?)/, (ctx) => {

  const order_id = ctx.update.callback_query.data;
  const driver_chat_id = ctx.update.callback_query.from.id;
  const driver_username = ctx.update.callback_query.from.username

  if (order_id.startsWith('!')) {
    const new_order_id = order_id.substring(1)
    pool.query("SELECT * FROM orders WHERE order_id = ?", [new_order_id], (err, results) => {
      const db_res = results[0]
      //order availability => status => driver_chat_id

      if (db_res.status == "taken") {
        return ctx.answerCbQuery('Reporting failed - order taken')
      }
      else if (db_res.status == "sent2Driver") {
        pool.query("UPDATE orders SET driver_chat_id = ?, status = 'report' WHERE order_id = ?", [driver_chat_id, new_order_id], (err, results) => {
          if (err) throw err;
        })
        ctx.telegram.sendMessage(db_res.user_chat_id,
          `HKBeeVanUtd - your order has been rejected by our driver, please contact our customer support at 07882590546`
        )
        ctx.answerCbQuery('Order reported')
        ctx.telegram.editMessageText(ctx.update.callback_query.message.chat.id, ctx.update.callback_query.message.message_id, undefined, `${ctx.update.callback_query.message.text}\n \n **⚠ORDER REPORTED BY @${driver_username} (ID: ${ctx.update.callback_query.from.id})**`,)
      }
      if (err) throw err;
    })
  }
  else {
    pool.query("SELECT * FROM orders WHERE order_id = ?", [order_id], (err, results) => {
      const db_res = results[0]
      //order availability => status => driver_chat_id

      if (db_res.status == "taken") {
        return ctx.answerCbQuery('Matching failed - order taken')
      }
      if (db_res.status == "report") {
        return ctx.answerCbQuery('Matching failed - order reported')
      }
      else if (db_res.status == "sent2Driver") {
        pool.query("UPDATE orders SET driver_chat_id = ?, status = 'taken' WHERE order_id = ?", [driver_chat_id, order_id], (err, results) => {
          if (err) throw err;
        })
        ctx.telegram.sendMessage(db_res.user_chat_id,
          `HKBeeVanUtd - your order has been accepted by @${driver_username}
  (ID: ${driver_chat_id})`
        )
        ctx.answerCbQuery('Matching successful')
        ctx.telegram.sendMessage(driver_chat_id, `HKBeeVanUtd - You have matched an order! Please contact user ASAP! \n \n ================ \n ${ctx.update.callback_query.message.text} \n ================`)
        ctx.telegram.editMessageText(ctx.update.callback_query.message.chat.id, ctx.update.callback_query.message.message_id, undefined, `${ctx.update.callback_query.message.text}\n \n **✅ORDER TAKEN BY @${driver_username} (ID: ${ctx.update.callback_query.from.id})**`,)
      }
      if (err) throw err;
    })
  }
})

bot.command('cancel', (ctx) => {
  //session not empty
  if (Object.keys(ctx.session).length !== 0) {
    //complete form input
    if (ctx.session.contact !== null && ctx.session.preferred_contact !== null) {
      //not sent out yet
      if (ctx.session.status == 'drafting') {
        ctx.session = null
        ctx.reply("HKBeeVanUtd - your order is cancelled")
      }
      //already sent out
      else if (ctx.session.status == 'sent2Driver') {
        pool.query("SELECT * FROM orders WHERE order_id = ?", [ctx.session.order_id], (err, results) => {
          const db_res = results[0]
          if (db_res.status == "taken") {
            ctx.reply("HKBeeVanUtd - your can't cancel the last order as it is matched, however you can now make a new order");
          }
          else if (db_res.status == "cancel" || db_res.status == "report") {
            ctx.reply("HKBeeVanUtd - your order is cancelled")
          }
          else if (db_res.status == "sent2Driver") {
            pool.query("UPDATE orders SET status = 'cancel' WHERE order_id = ?", [ctx.session.order_id], (err, results) => {
              if (results) {
                ctx.telegram.deleteMessage(`${process.env.DRIVER_CHANNEL_ID}`, ctx.session.broadcastMessageId)
                ctx.reply("HKBeeVanUtd - your order is cancelled")
              }
              if (err) throw err
            })
          }
          if (err) throw err;    
        })
        ctx.session = null;
      }
    }
    //incomplete form input
    else {
      ctx.session = null
      ctx.reply("HKBeeVanUtd - your order has been cancelled");
    }
  }
  //session empty
  else {
    ctx.reply("HKBeeVanUtd - your don't have any order yet")
  }
})

bot.command('confirm', (ctx) => {
  //session not empty
  if (Object.keys(ctx.session).length !== 0) {
    //complete form input
    if (ctx.session.contact !== null && ctx.session.preferred_contact !== null) {
      //not sent out yet
      if (ctx.session.status == 'drafting') {
        //update status
        ctx.session.status = "sent2Driver"
        ctx.reply(
          `HKBeeVanUtd - we are matching your order with our professional drivers, this usually takes 10-15 mins.

If you didn't receive any response in 1 hour, please send us another request.`);
        //save order into db
        pool.query("INSERT INTO orders SET ?", ctx.session, (err, results) => {
          if (err) throw err
          console.log('db saved order ', results)
        })
        //broadcast order to driver according to info
        if (ctx.session.service == "Furniture Delivery and Assembly" || ctx.session.service == "Home Moving") {
          return ctx.telegram.sendMessage(process.env.DRIVER_CHANNEL_ID,
            `【${ctx.session.service}】

OID: ${ctx.session.order_id}

Date: ${ctx.session.order_date}
Time: ${ctx.session.order_time}
Pick-up address: 
${ctx.session.pick_up_address}
Drop-off address: 
${ctx.session.drop_off_address}

Amount: ${ctx.session.items} 
Helpers: ${ctx.session.helpers}
Extra hours: ${ctx.session.extra_hours}
Assemble service: ${ctx.session.assemble_services}
Estimate Charges: £${ctx.session.charges}

Name: ${ctx.session.name}
Contact Number: ${ctx.session.contact}
Username: @${ctx.session.username}
Preferred contact: ${ctx.session.preferred_contact}

Please press Match to take this order, or Report if you find it suspicious
`, Markup.inlineKeyboard([
              Markup.button.callback('Match', `${ctx.session.order_id}`),
              Markup.button.callback('Report', `!${ctx.session.order_id}`)
            ]))
          .then((ctx2) => {
            ctx.session.broadcastChatId = `${ctx2.chat.id}`;
            ctx.session.broadcastMessageId = ctx2.message_id;
            // setTimeout(() => {
            //   bot.telegram.deleteMessage(`${ctx2.chat.id}`, ctx2.message_id)
            //   console.log('deleted in 1 hour')
            // }, 1000 * 60 * 60);
          })
        }
        else if (ctx.session.service == "Manchester Airport Transfer") {
          return ctx.telegram.sendMessage(process.env.DRIVER_CHANNEL_ID,
            `【${ctx.session.service}】

OID: ${ctx.session.order_id}

Date: ${ctx.session.order_date}
Time: ${ctx.session.order_time}
Flight number : ${ctx.session.flightNumber}
Pick-up address: 
${ctx.session.pick_up_address}
Drop-off address: 
${ctx.session.drop_off_address}

Amount: ${ctx.session.items} 
Helpers: ${ctx.session.helpers}
Extra hours: ${ctx.session.extra_hours}
Estimate Charges: £${ctx.session.charges}

Name: ${ctx.session.name}
Contact Number: ${ctx.session.contact}
Username: @${ctx.session.username}
Preferred contact: ${ctx.session.preferred_contact}

Please press Match to take this order, or Report if you find it suspicious
`, Markup.inlineKeyboard([
              Markup.button.callback('Match', `${ctx.session.order_id}`),
              Markup.button.callback('Report', `!${ctx.session.order_id}`)
            ]))
          .then((ctx2) => {
            ctx.session.broadcastChatId = `${ctx2.chat.id}`;
            ctx.session.broadcastMessageId = ctx2.message_id;
            // setTimeout(() => {
            //   bot.telegram.deleteMessage(`${ctx2.chat.id}`, ctx2.message_id)
            //   console.log('deleted in 1 hour')
            // }, 1000 * 60 * 60);
          })
        }
        else if (ctx.session.service == "Goods Delivery") {
          return ctx.telegram.sendMessage(process.env.DRIVER_CHANNEL_ID,
            `【${ctx.session.service}】

OID: ${ctx.session.order_id}

Date: ${ctx.session.order_date}
Time: ${ctx.session.order_time}
Pick-up address: 
${ctx.session.pick_up_address}
Drop-off address: 
${ctx.session.drop_off_address}

Amount: ${ctx.session.items} 
Helpers: ${ctx.session.helpers}
Extra hours: ${ctx.session.extra_hours}
Estimate Charges: £${ctx.session.charges}

Name: ${ctx.session.name}
Contact Number: ${ctx.session.contact}
Username: @${ctx.session.username}
Preferred contact: ${ctx.session.preferred_contact}

Please press Match to take this order, or Report if you find it suspicious
`, Markup.inlineKeyboard([
              Markup.button.callback('Match', `${ctx.session.order_id}`),
              Markup.button.callback('Report', `!${ctx.session.order_id}`)
            ]))
          .then((ctx2) => {
            ctx.session.broadcastChatId = `${ctx2.chat.id}`;
            ctx.session.broadcastMessageId = ctx2.message_id;
            // setTimeout(() => {
            //   bot.telegram.deleteMessage(`${ctx2.chat.id}`, ctx2.message_id)
            //   console.log('deleted in 1 hour')
            // }, 1000 * 60 * 60);
          })
        }
      }
      //already sent out
      else if (ctx.session.status == 'sent2Driver') {
        return ctx.reply("HKBeeVanUtd - your order has already sent to our professional drivers, please be patient for any response");
      }
    }
    //incomplete form input
    else {
      ctx.reply("HKBeeVanUtd - please complete the order first");
    }
  }
})

bot.command('status', (ctx) => {
  if (Object.keys(ctx.session).length !== 0) {
    ctx.reply(`
HKBeeVanUtd - you have already filed an order: 

Username: ${ctx.session.username}
Service: ${ctx.session.service}
OrderID: ${ctx.session.order_id}

/cancel it if you want to make a new order`)
  } else {
    ctx.reply("HKBeeVanUtd - your don't have any order yet")
  }
  console.log('session', ctx.session)
})

bot.on('message', (ctx) => {
  //session has stored your order
  if (Object.keys(ctx.session).length !== 0) {
    //put answer into obj.service => ask date
    if (ctx.session.service == null) {
      if (ctx.message.text == "Manchester Airport Transfer" || ctx.message.text == "Home Moving" || ctx.message.text == "Furniture Delivery and Assembly" || ctx.message.text == "Goods Delivery") {
        ctx.session.service = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please identify your booking date (e.g. 2022-04-22)");
        if (ctx.message.text == "Manchester Airport Transfer") {
          ctx.session.pick_up_address = "Manchester Airport, Manchester M90 1QX, UK";
          ctx.session.pick_up_postcode = "M90 1QX"
        }
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please selected the choices as stated");
        console.log(ctx.message.text);
        return;
      }
    }

    //put answer into ctx.session.date => ask time
    if (ctx.session.service !== null && ctx.session.order_date == null) {
      if (ApplyRegex("order_date", ctx.message.text)) {
        ctx.session.order_date = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please identify your booking time (e.g. 0930)");
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please follow the exact format entering your booking date");
        return;
      }
    }

    //put answer into ctx.session.time => ask pick-up address
    if (ctx.session.order_date !== null && ctx.session.order_time == null) {
      if (ApplyRegex("order_time", ctx.message.text)) {
        ctx.session.order_time = ctx.message.text.slice(0, 2) + ':' + ctx.message.text.slice(2) + ':00';
        if (ctx.session.service == "Manchester Airport Transfer") {
          ctx.reply("HKBeeVanUtd - please enter your drop-off address postcode (e.g. M60 7RA)");
          return;
        } else {
          ctx.reply("HKBeeVanUtd - please enter your pick-up address postcode (e.g. M60 7RA)");
          return;
        }
      } else {
        ctx.reply("HKBeeVanUtd - please follow the exact format entering your booking time");
        return;
      }
    }

    //put answer into ctx.session.pick_up => ask drop-off address
    if (ctx.session.order_time !== null && ctx.session.pick_up_postcode == null) {
      if (ApplyRegex("postcode", ctx.message.text)) {
        ctx.session.pick_up_postcode = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please enter your drop-off address postcode (e.g. M60 7RA)");
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please follow the exact format entering your pick-up address postcode")
        return;
      }
    }

    //put answer into ctx.session.drop_off => ask number of items
    if (ctx.session.pick_up_postcode !== null && ctx.session.drop_off_postcode == null) {
      if (ApplyRegex("postcode", ctx.message.text)) {
        ctx.session.drop_off_postcode = ctx.message.text;
        return axios.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${ctx.session.pick_up_postcode}&destination=${ctx.session.drop_off_postcode}&key=${process.env.GOOGLE_MAP_API_KEY}`)
          .then((res) => {
            if (ctx.session.service == "Manchester Airport Transfer") {
              ctx.session.distance = res.data.routes[0].legs[0].distance.value;
              ctx.session.charges = Math.round(res.data.routes[0].legs[0].distance.value / 1609.344 * 3);
              ctx.session.drop_off_address = res.data.routes[0].legs[0].end_address;
              ctx.reply("HKBeeVanUtd - please specify how many items you like to relocate(e.g. 5)");
            } else {
              ctx.session.distance = res.data.routes[0].legs[0].distance.value;
              ctx.session.charges = Math.round(res.data.routes[0].legs[0].distance.value / 1609.344 * 3);
              ctx.session.drop_off_address = res.data.routes[0].legs[0].end_address;
              ctx.session.pick_up_address = res.data.routes[0].legs[0].start_address;
              ctx.reply("HKBeeVanUtd - please specify how many items you like to relocate(e.g. 5)");
            }
          })
        //   .catch((err) => {
        //     console.log(err)
        //   })
      } else {
        ctx.reply("HKBeeVanUtd - please follow the exact format entering your drop-off address postcode")
        return;
      }
    }

    //put answer into obj.items => ask extra helper needed
    if (ctx.session.drop_off_postcode !== null && ctx.session.drop_off_address !== null && ctx.session.items == null) {
      if (ApplyRegex("items", ctx.message.text)) {
        ctx.session.items = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please specifiy how many additional helpers needed (i.e. £45 for 3 hours)",
          Markup.keyboard([["0", "1", "2", "3"]]).resize());
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please identify the amount in number (e.g. 1)")
        return;
      }
    }

    //put answer into ctx.session.helpers => ask extra hour needed
    if (ctx.session.items !== null && ctx.session.helpers == null) {
      if (ApplyRegex("numberinclude0", ctx.message.text)) {
        ctx.session.helpers = ctx.message.text;
        ctx.session.charges = ctx.session.charges + ctx.message.text * 45
        ctx.reply("HKBeeVanUtd - please identify if you need any additional hours (e.g. £20 for 1 hour )",
          Markup.keyboard([["0", "1", "2", "3"]]).resize().oneTime());
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please identify the extra helper you need in number (e.g. 1)");
        return;
      }
    }

    //put answer into ctx.session.extra_hours => 
    //ask "Furniture Delivery and Assembly" and "Home Moving" assemble serivce
    //ask "Manchester Airport Transfer" flight number
    //ask "Goods Delivery"  name
    if (ctx.session.helpers !== null && ctx.session.extra_hours == null) {
      if (ApplyRegex("numberinclude0", ctx.message.text)) {
        ctx.session.extra_hours = ctx.message.text;
        ctx.session.charges = ctx.session.charges + ctx.message.text * 20
        if (ctx.session.service == "Furniture Delivery and Assembly" || ctx.session.service == "Home Moving") {
          ctx.reply("HKBeeVanUtd - please state the number of funiture needed to be assemble (i.e. £50 each, if no press 0)",
            Markup.keyboard([["0", "1", "2", "3"]]).resize().oneTime());
          return;
        }
        else if (ctx.session.service == "Manchester Airport Transfer") {
          ctx.reply("HKBeeVanUtd - please identify your flight number (e.g. BA175)");
          return;
        }
        else if (ctx.session.service == "Goods Delivery") {
          ctx.reply("HKBeeVanUtd - please enter your name (e.g. Martin Barnes)");
          return;
        }
      } else {
        ctx.reply("HKBeeVanUtd - please identify the extra hour you need in number (e.g. 6)")
        return;
      }
    }

    //put answer into ctx.session.assemble_services => ask name
    if (ctx.session.service == "Furniture Delivery and Assembly" && ctx.session.extra_hours !== null && ctx.session.assemble_services == null || ctx.session.service == "Home Moving" && ctx.session.extra_hour !== null && ctx.session.assemble_services == null) {
      if (ApplyRegex("numberinclude0", ctx.message.text)) {
        ctx.session.assemble_services = ctx.message.text;
        ctx.session.charges = ctx.session.charges + ctx.message.text * 50
        ctx.reply("HKBeeVanUtd - please enter your name (e.g. Martin Barnes)");
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please enter your answer with numbers (i.e. if no, press 0)");
        return;
      }
    }

    //put answer into ctx.session.flightNumber => ask name
    if (ctx.session.service == "Manchester Airport Transfer" && ctx.session.extra_hours !== null && ctx.session.flightNumber == null) {
      if (ApplyRegex("flightNumber", ctx.message.text)) {
        ctx.session.flightNumber = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please enter your name (e.g. Martin Barnes)");
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please follow the exact format entering your flight number");
        return;
      }
    }

    //put answer into ctx.session.name => ask contact
    if (ctx.session.service == "Furniture Delivery and Assembly" && ctx.session.assemble_services !== null && ctx.session.name == null || ctx.session.service == "Home Moving" && ctx.session.assemble_services !== null && ctx.session.name == null) {
      if (ApplyRegex("name", ctx.message.text)) {
        ctx.session.name = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please enter your contact number (e.g. 07882590546)");
        return;
      } else {
        ctx.reply("HKBeeVanUtd - your name should not include number or symbol");
        return;
      }
    }
    //put answer into ctx.session.name => ask contact
    if (ctx.session.service == "Manchester Airport Transfer" && ctx.session.flightNumber !== null && ctx.session.name == null) {
      if (ApplyRegex("name", ctx.message.text)) {
        ctx.session.name = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please enter your contact number (e.g. 07882590546)");
        return;
      } else {
        ctx.reply("HKBeeVanUtd - your name should not include number or symbol");
        return;
      }
    }
    //put answer into ctx.session.name => ask contact
    if (ctx.session.service == "Goods Delivery" && ctx.session.extra_hours !== null && ctx.session.name == null) {
      if (ApplyRegex("name", ctx.message.text)) {
        ctx.session.name = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please enter your contact number (e.g. 07882590546)");
        return;
      } else {
        ctx.reply("HKBeeVanUtd - your name should not include number or symbol");
        return;
      }
    }

    if (ctx.session.name !== null && ctx.session.contact == null) {
      if (ApplyRegex("contact", ctx.message.text)) {
        ctx.session.contact = ctx.message.text;
        ctx.reply("HKBeeVanUtd - please identify your preferred contact method",
          Markup.keyboard([["Whatsapp", "Signal", "Telegram"]]).resize());
        return;
      } else {
        ctx.reply("HKBeeVanUtd - please follow the exact format entering your contact number");
        return;
      }
    }
    //put answer into ctx.session.contactNumber => ask for broadcast permission
    //calculate minimum charges
    if (ctx.session.contact !== null && ctx.session.preferred_contact == null) {
      if (ctx.message.text == 'Signal' || ctx.message.text == 'Whatsapp' || ctx.message.text == 'Telegram') {
        ctx.session.preferred_contact = ctx.message.text;
        if (ctx.session.charges < 100) {
          ctx.session.charges = 100
        }
        if (ctx.session.service == "Furniture Delivery and Assembly" || ctx.session.service == "Home Moving") {
          return ctx.reply(
            `HKBeeVanUtd - Order information overview: 

【${ctx.session.service}】

OID: ${ctx.session.order_id}

Date: ${ctx.session.order_date}
Time: ${ctx.session.order_time}
Pick-up address: 
${ctx.session.pick_up_address}
Drop-off address: 
${ctx.session.drop_off_address}

Amount: ${ctx.session.items} 
Helpers: ${ctx.session.helpers}
Extra hours: ${ctx.session.extra_hours}
Assemble service: ${ctx.session.assemble_services}
Estimate Charges: £${ctx.session.charges}

Name: ${ctx.session.name}
Contact Number: ${ctx.session.contact}
Username: @${ctx.session.username}
Preferred contact: ${ctx.session.preferred_contact}

Please press /confirm to send your order, or /cancel to start a new one
`, Markup.keyboard([["/confirm", "/cancel"]]).resize().oneTime())
        }
        else if (ctx.session.service == "Manchester Airport Transfer") {
          return ctx.reply(
            `HKBeeVanUtd - Order information overview: 

【${ctx.session.service}】

OID: ${ctx.session.order_id}
  
Date: ${ctx.session.order_date}
Time: ${ctx.session.order_time}
Flight number : ${ctx.session.flightNumber}
Pick-up address: 
${ctx.session.pick_up_address}
Drop-off address: 
${ctx.session.drop_off_address}

Amount: ${ctx.session.items} 
Helpers: ${ctx.session.helpers}
Extra hours: ${ctx.session.extra_hours}
Estimate Charges: £${ctx.session.charges}

Name: ${ctx.session.name}
Contact Number: ${ctx.session.contact}
Username: @${ctx.session.username}
Preferred contact: ${ctx.session.preferred_contact}

Please press /confirm to send your order, or /cancel to start a new one
`, Markup.keyboard([["/confirm", "/cancel"]]).resize().oneTime())
        }
        else if (ctx.session.service == "Goods Delivery") {
          return ctx.reply(
            `HKBeeVanUtd - Order information overview: 

【${ctx.session.service}】

OID: ${ctx.session.order_id}

Date: ${ctx.session.order_date}
Time: ${ctx.session.order_time}
Pick-up address: 
${ctx.session.pick_up_address}
Drop-off address: 
${ctx.session.drop_off_address}

Amount: ${ctx.session.items} 
Helpers: ${ctx.session.helpers}
Extra hours: ${ctx.session.extra_hours}
Estimate Charges: £${ctx.session.charges}

Name: ${ctx.session.name}
Contact Number: ${ctx.session.contact}
Username: @${ctx.session.username}
Preferred contact: ${ctx.session.preferred_contact}

Please press /confirm to send your order, or /cancel to start a new one
`, Markup.keyboard([["/confirm", "/cancel"]]).resize().oneTime())
        }
      } else {
        return ctx.reply("HKBeeVanUtd - please select Preferred contact from Whatsapp, Telegram or Signal");
      }
    }
  }
})


bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))


