const { Telegraf } = require('telegraf')
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN)
const storage = []//storage refresh every 10 mins, previous order will not be saved//

bot.command('callvan', (ctx) => {
  console.log(ctx.message)
  const chatId = ctx.message.chat.id;
  ctx.telegram.sendMessage(chatId, "ManNVan - please select your service", {
    "reply_markup": {
      "keyboard": [["Manchester Airport Transfer"], ["Home Moving"], ["Furniture Delivery and Assembly"], ["Goods Delivery"]]
    }
  })
})

bot.command('cancel', (ctx) => {
  const chatId = ctx.message.chat.id;
  if (checkStorage(chatId)) {
    for (var i = 0; i < storage.length; i++) {
      if (storage[i].chatId == chatId) {
        storage.splice(i, 1);
      }
      ctx.reply("ManNVan - your order is cancelled")
    }
  } else {
    ctx.reply("ManNVan - your don't have any order yet")
  }
})

bot.command('status', (ctx) => {
  const chatId = ctx.message.chat.id;
  if (checkStorage(chatId)) {
    ctx.reply(`
ManNVan - you have already filed an order: 

Username: ${checkStorage(chatId).username}
Service: ${checkStorage(chatId).service}
Order time: ${checkStorage(chatId).inputTime}`)
  } else {
    ctx.reply("ManNVan - your don't have any order yet")
  }
  console.log(storage)
})

//check the storage do you have an order undone recently//
const checkStorage = (chatId) => {
  const searchResult = storage.find((order) => {
    if (order.chatId == chatId) {
      return true
    } else {
      return false
    }
  })
  return searchResult
}

bot.hears('Manchester Airport Transfer', (ctx) => {

  const chatId = ctx.message.chat.id;
  const chatUsername = ctx.message.chat.username;
  const inputTime = new Date()
  const AirportTransfer = {
    chatId: chatId,
    username: chatUsername,
    service: "AirportTransfer",
    inputTime: inputTime,
    date: "",
    time: "",
    flightNumber: "",
    pick_up: "",
    drop_off: "",
    name: "",
    contactNumber: ""
  }

  if (checkStorage(chatId)) {
    ctx.reply(`
ManNVan - you have already filed an order: 

Username: ${checkStorage(chatId).username}
Service: ${checkStorage(chatId).service}
Order time: ${checkStorage(chatId).inputTime}

/cancel it if you want to make a new order
`)
    console.log(checkStorage(chatId))
  } else {
    storage.push(AirportTransfer)
    ctx.reply("ManNVan - please identify your arrival date")
  }

  // ctx.reply('ManNVan - please enter your arrival date')
  // ctx.reply('ManNVan - please enter your arrival time')
  // ctx.reply('ManNVan - please enter your pick-up airport')
  // ctx.reply('ManNVan - please enter your drop-off destination')
  // ctx.reply('ManNVan - please enter your name')  
  // ctx.reply('ManNVan - please enter your contact number (e.g. 07517 360302)')
  // ctx.reply('ManNVan - please confirm your order')
})

bot.on('message', (ctx) => {
  const chatId = ctx.message.chat.id;
  for (const obj of storage) {
    if (obj.chatId == chatId && obj.service == "AirportTransfer") {
      if (obj.date == "" && obj.time == "" && obj.flightNumber == "" && obj.pick_up == "" && obj.drop_off == "" && obj.name == "" && obj.contactNumber == "") {
        obj.date = ctx.message.text;
        bot.\
        6(chatId, "ManNVan - please identify your arrival time");
        break;
      }
      if (obj.date !== "" && obj.time == "" && obj.flightNumber == "" && obj.pick_up == "" && obj.drop_off == "" && obj.name == "" && obj.contactNumber == "") {
        obj.time = ctx.message.text;
        bot.sendMessage(chatId, "ManNVan - please identify your flight number");
        break;
      }
    }
  }

  if (checkStorage(chatId)) {
    if (currentOrder.service == "AirportTransfer") {
     
    }
    if (currentOrder.service == "HomeMoving") {

    }
    if (currentOrder.service == "FurnitureDeliveryNAssembly") {

    }
    if (currentOrder.service == "GoodsDelivery") {

    }
  }



})

bot.hears('Home Moving', (ctx) => {
  ctx.reply('Home Moving')
})

bot.hears('Furniture Delivery and Assembly', (ctx) => {
  ctx.reply('Furniture Delivery and Assembly')
})

bot.hears('Goods Delivery', (ctx) => {
  ctx.reply('Goods Delivery')
})



bot.on('text', (ctx) => {
  // Explicit usage
  ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.state.role}`)
  console.log(ctx)
  // Using context shortcut
  ctx.reply(`Hello ${ctx.state.role}`)
})

bot.on('callback_query', (ctx) => {
  // Explicit usage
  ctx.telegram.answerCbQuery(ctx.callbackQuery.id)

  // Using context shortcut
  ctx.answerCbQuery()
})

bot.on('inline_query', (ctx) => {
  const result = []
  // Explicit usage
  ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result)

  // Using context shortcut
  ctx.answerInlineQuery(result)
})

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))


// require('dotenv').config()
// const TelegramBot = require('node-telegram-bot-api');

// // replace the value below with the Telegram token you receive from @BotFather
// const token = "5074807591:AAEIWNQRdjwJesIt29T6rRD5ijo1K_dw68Q";

// // Create a bot that uses 'polling' to fetch new updates
// const bot = new TelegramBot(token, { polling: true });

// //tempt storage//
// const storage = []
// //

// bot.onText(/Airport pick-up/, (msg) => {
//     const chatId = msg.chat.id;
//     const chatUsername = msg.chat.username
//     let airportOrder = {
//         chatId: `${chatId}`,
//         username: `@${chatUsername}`,
//         date: "",
//         time: "",
//         flightNumber: "",
//         pick_up: "",
//         drop_off: "",
//         name: "",
//         contactNumber: ""
//     }
//     bot.sendMessage(chatId, "ManNVan - please enter your flight number")

//     bot.on("message", (msg) => {
//         const chatId = msg.chat.id;
//         const inputdata = msg.text

//         if (inputdata == "/cancel"){
//             airportOrder = {}
//             bot.sendMessage(chatId, "ManNVan - your order is cancelled")
//         }
//         else{
//             if (airportOrder.flightNumber == "" && airportOrder.pick_up == "" && airportOrder.drop_off == "" && airportOrder.name == "" && airportOrder.contactNumber == "") {
//                 airportOrder.flightNumber = inputdata
//                 bot.sendMessage(chatId, "ManNVan - please identify your pick-up airport")
//                 return
//             }
//             if (airportOrder.flightNumber !== "" && airportOrder.pick_up == "" && airportOrder.drop_off == "" && airportOrder.name == "" && airportOrder.contactNumber == "") {
//                 airportOrder.pick_up = inputdata
//                 bot.sendMessage(chatId, "ManNVan - please enter your drop-off destination")
//                 return
//             }
//             if (airportOrder.flightNumber !== "" && airportOrder.pick_up !== "" && airportOrder.drop_off == "" && airportOrder.name == "" && airportOrder.contactNumber == "") { //previous answer inputed?       
//                 airportOrder.drop_off = inputdata  //set current input
//                 bot.sendMessage(chatId, "ManNVan - please enter your name") //ask for next question
//                 return
//             }
//             if (airportOrder.flightNumber !== "" && airportOrder.pick_up !== "" && airportOrder.drop_off !== "" && airportOrder.name == "" && airportOrder.contactNumber == "") {
//                 airportOrder.name = inputdata
//                 bot.sendMessage(chatId, "ManNVan - please enter your contact number")
//                 return
//             }
//             if (airportOrder.flightNumber !== "" && airportOrder.pick_up !== "" && airportOrder.drop_off !== "" && airportOrder.name !== "" && airportOrder.contactNumber == "") {
//                 airportOrder.contactNumber = inputdata
//                 bot.sendMessage(chatId, `flightNumber: ${airportOrder.flightNumber}\npick_up: ${airportOrder.pick_up}\ndrop_off: ${airportOrder.drop_off}\nname: ${airportOrder.name}\ncontactNumber: ${airportOrder.contactNumber}`)
//                 bot.sendMessage("-1001760273442", `flightNumber: ${airportOrder.flightNumber}\npick_up: ${airportOrder.pick_up}\ndrop_off: ${airportOrder.drop_off}\nname: ${airportOrder.name}\ncontactNumber: ${airportOrder.contactNumber}`)
//                 return
//             }
//         }
//         console.log(airportOrder)
//     })

//     // bot.onText(/\/cancel/, (msg => {
//     //     const chatId = msg.chat.id;
//     //     airportOrder = {
//     //         chatId: `${chatId}`,
//     //         username: `@${chatUsername}`,
//     //         date: "",
//     //         time: "",
//     //         flightNumber: "",
//     //         pick_up: "",
//     //         drop_off: "",
//     //         name: "",
//     //         contactNumber: "",
//     //     }
//     //     bot.sendMessage(chatId, "ManNVan - your order is cancelled")
//     // }))
// })

// bot.onText(/\/broadcast (.+)/, (msg, match) => {
//     const chatId = msg.chat.id;
//     const resp = match[1];

//     bot.sendMessage("-1001760273442", resp)
// })

// // const program = (chatId, inputdata) => {    
// //     if (airportOrder.flightNumber == "" && airportOrder.pick_up == ""  && airportOrder.drop_off == "" && airportOrder.name == "" && airportOrder.contactNumber == ""){
// //         airportOrder.flightNumber = inputdata
// //         bot.sendMessage(chatId, "ManNVan - please identify your pick-up airport")
// //         return
// //     }
// //     if (airportOrder.flightNumber !== "" && airportOrder.pick_up == "" && airportOrder.drop_off == "" && airportOrder.name == "" && airportOrder.contactNumber == "") {
// //         airportOrder.pick_up = inputdata
// //         bot.sendMessage(chatId, "ManNVan - please enter your drop-off destination")
// //         return
// //     }
// //     if (airportOrder.flightNumber !== "" && airportOrder.pick_up !== "" && airportOrder.drop_off == "" && airportOrder.name == "" && airportOrder.contactNumber == ""){ //previous answer inputed?       
// //         airportOrder.drop_off = inputdata  //set current input
// //         bot.sendMessage(chatId, "ManNVan - please enter your name") //ask for next question
// //         return
// //     }
// //     if (airportOrder.flightNumber !== "" && airportOrder.pick_up !== "" && airportOrder.drop_off !== "" && airportOrder.name == "" && airportOrder.contactNumber == ""){
// //         airportOrder.name = inputdata
// //         bot.sendMessage(chatId, "ManNVan - please enter your contact number")
// //         return
// //     }
// //     if (airportOrder.flightNumber !== "" && airportOrder.pick_up !== "" && airportOrder.drop_off !== "" && airportOrder.name !== "" && airportOrder.contactNumber == ""){airportOrder.contactNumber = inputdata
// //         airportOrder.contactNumber = inputdata
// //         bot.sendMessage(chatId, `flightNumber: ${airportOrder.flightNumber}\npick_up: ${airportOrder.pick_up}\ndrop_off: ${airportOrder.drop_off}\nname: ${airportOrder.name}\ncontactNumber: ${airportOrder.contactNumber}`)
// //         bot.sendMessage("-1001760273442", `flightNumber: ${airportOrder.flightNumber}\npick_up: ${airportOrder.pick_up}\ndrop_off: ${airportOrder.drop_off}\nname: ${airportOrder.name}\ncontactNumber: ${airportOrder.contactNumber}`)
// //         return
// //     }
// // }