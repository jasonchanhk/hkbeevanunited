const { Telegraf, Markup } = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN)
// const session = new RedisSession({
//   store: {
//     host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
//     port: process.env.TELEGRAM_SESSION_PORT || 6379
//   },
//   ttl: 10
// })

// bot.use(session)



bot.hears('message', (ctx) => {
  ctx.session = {
    id: ctx.message.chat.id,
    username: ctx.message.chat.username,
    text: ctx.message.text
  }
  console.log('Session', ctx.session)
})

bot.command('checksession', (ctx) => {
  console.log('Session', ctx.session)
})
const storage = [] //temp storage

const ApplyRegex = (item, text) => {
  //library for imput regex
  const pattern = {
    date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
    time: /^(0[0-9]|1[0-9]|2[0-3])([012345][0-9])$/,
    flightNumber: /^[a-zA-Z]{2,3}\d{2,4}$/gm,
    name: /^[a-zA-Z\s]*$/gm,
    contactNumber: /(((\+44)? ?(\(0\))? ?)|(0))( ?[0-9]{3,4}){3}/gm,
    numberofitems: /^[1-9]\d*$/gm,
    numberinclude0: /^[0-9]\d*$/gm
  };
  //return true/false to see if it match
  const targerPattern = pattern[item]
  const result = targerPattern.test(text)
  console.log(result)
  return result
}

//set expiration as 30mins 
const DeleteExpiredOrder = () => {
  for (var i = storage.length - 1; i >= 0; i--) {
    const orderInputTime = parseInt(storage[i].inputTime.toString().slice(0, -3));
    const orderExpireTime = orderInputTime + 60 * 30
    const currentTime = parseInt(new Date().getTime().toString().slice(0, -3))
    if (orderExpireTime < currentTime) {
      storage.splice(i, 1);
      console.log("order has been expired")
    }
    else {
      console.log("order is still alive")
    }
  }
  console.log(storage)
}

// delete expired order every 10 mins
setInterval(DeleteExpiredOrder, 1000 * 60 * 10)

bot.start((ctx) => {
  const username = ctx.message.chat.username
  ctx.reply(`
Welcome onboard, @${username}!

Thank you for chosing ManNVan. Our team of professional drivers are dedicated to provide flexible and qaulity service on your demand. Send us a message to know how we can help you!

/callvan Send order to our team
/status Check order status
/cancel Cancel existing order
  `)
})

bot.command('callvan', (ctx) => {
  const chatId = ctx.message.chat.id;
  const chatUsername = ctx.message.chat.username;
  const inputTime = new Date().getTime()
  const orderinfo = {
    chatId: chatId,
    username: chatUsername,
    service: "",
    inputTime: inputTime,
    status: "drafting",
    date: "",
    time: "",
    pick_up_address: "",
    pick_up: "",
    drop_off_address: "",
    drop_off: "",
    distance: "",
    charge: "",
    numberofitems: "",
    helpers: "",
    stairs: "",
    assembleservice: "",
    extrahour: "",
    flightNumber: "",
    name: "",
    contactNumber: ""
  }

  console.log(orderinfo)
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
    storage.push(orderinfo)
    ctx.reply("ManNVan - please select your service", 
    Markup
    .keyboard([["Manchester Airport Transfer"], ["Home Moving"], ["Furniture Delivery and Assembly"], ["Goods Delivery"]])
  )}
})

// bot.command('broadcast', (ctx) => {
//   console.log(ctx.message)
//   ctx.telegram.sendMessage(process.env.DRIVER_CHANNEL_ID, "ManNVan - please select your service", {
//     "reply_markup": JSON.stringify({
//       "inline_keyboard": [
//         [
//           { text: 'match', callback_data: '187241595' },
//           { text: 'skip', callback_data: 'dislike' }
//         ]
//       ]
//     })
//   })
// })
// "ManNVan - please identify your arrival date (e.g. 2022-04-22)")

bot.action(/(.*?)/, (ctx) => {
  const clientId = ctx.update.callback_query.data
  const checkResult = checkStorage(clientId)
  //check if storage have this order
  if (checkResult) {
    ctx.telegram.sendMessage(clientId, `
ManNVan - your order has been accepted by @${ctx.update.callback_query.from.username}
(ID: ${ctx.update.callback_query.from.id})
`)
    ctx.answerCbQuery('Matching request sent!')
    ctx.reply("ManNVan - matching successful, please contact the client with the information below")
    //delete server storage copy
    for (var i = 0; i < storage.length; i++) {
      if (storage[i].chatId == clientId) {
        storage.splice(i, 1);
        break
      }
    }
    //store driver info in database
  }
  else {
    ctx.answerCbQuery('Matching request sent!')
    ctx.reply("ManNVan - matching unsuccessful as this order may have been taken or cancelled")
  }
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

bot.on('message', (ctx) => {
  const chatId = ctx.message.chat.id;
  for (const obj of storage) {
    //search storage for order created
    if (obj.chatId == chatId) {

      //put answer into obj.service => ask date
      if (obj.service == "" ) {
        if ( ctx.message.text == "Manchester Airport Transfer" || "Home Moving" || "Furniture Delivery and Assembly" || "Goods Delivery") {
          obj.service = ctx.message.text;
          ctx.reply("ManNVan - please identify your booking date (e.g. 2022-04-22)");
          if(ctx.message.text == "Manchester Airport Transfer"){
            obj.pick_up_address = "Manchester Airport, Manchester M90 1QX, UK";
            obj.pick_up = "53.3618129,-2.2706634"
          }
        } else {
          ctx.reply("ManNVan - please selected the choices as stated");
          console.log(ctx.message.text)
        }
        break;
      }

      //put answer into obj.date => ask time
      if (obj.service !== "" && obj.date == "" ) {
        if (ApplyRegex("date", ctx.message.text)) {
          obj.date = ctx.message.text;
          ctx.reply("ManNVan - please identify your booking time (e.g. 0930)");
        } else {
          ctx.reply("ManNVan - please follow the exact format entering your booking date");
        }
        break;
      }

      //put answer into obj.time => ask pick-up address
      if (obj.date !== "" && obj.time == "" ) {
        if (ApplyRegex("time", ctx.message.text)) {
          obj.time = ctx.message.text;
          if(obj.service == "Manchester Airport Transfer"){
            ctx.reply("ManNVan - please enter your drop-off address (press 📎, select location, search postcode at top right 🔍)"); 
          }else{
            ctx.reply("ManNVan - please enter your pick-up address (press 📎, select location, search postcode at top right 🔍)");
          }         
        } else {
          ctx.reply("ManNVan - please follow the exact format entering your booking time");
        }
        break;
      }

      //put answer into obj.pick_up => ask drop-off address
      if (obj.time !== "" && obj.pick_up == "" ) {
        if(ctx.message.location){
          obj.pick_up = `${ctx.message.location.latitude},${ctx.message.location.longitude}`;
          ctx.reply("ManNVan - please enter your drop-off address (press 📎, select location, search postcode at top right 🔍)");     
        }else{
          ctx.reply("ManNVan - please press 📎 below, select location, search your address with postcode at the top right 🔍")
        }
        break; 
      }

      //put answer into obj.drop_off => ask number of items
      if (obj.pick_up !== "" && obj.drop_off == "" ) {
        if(ctx.message.location){
          obj.drop_off = `${ctx.message.location.latitude},${ctx.message.location.longitude}`;
          axios.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${obj.pick_up}&destination=${obj.drop_off}&key=${process.env.GOOGLE_MAP_API_KEY}`)
            .then((res) => {
              obj.distance = res.data.routes[0].legs[0].distance.value;
              obj.charge = Math.round(res.data.routes[0].legs[0].distance.value/1609.344*3);
              obj.drop_off_address = res.data.routes[0].legs[0].end_address;
            })
            .catch((err) => {
              console.log(err)
            })
          ctx.reply("ManNVan - please specify how many items you like to relocate(e.g. 5)");
        }else{
          ctx.reply("ManNVan - please press 📎 below, select location, search your address with postcode at the top right 🔍")
        }
        break;
      }

      //put answer into obj.numberofitems => ask extra helper needed
      if (obj.drop_off !== "" && obj.numberofitems == ""){
        if (ApplyRegex("numberofitems", ctx.message.text)){
          obj.numberofitems = ctx.message.text;
          ctx.reply("ManNVan - please specifiy any additional helper needed (e.g. 1)",
          Markup.keyboard([["0", "1", "2", "3"]]).resize());
        }else{
          ctx.reply("ManNVan - please identify the amount in number (e.g. 1)")
        }
        break;
      }

      //put answer into obj.helpers => ask extra hour needed
      if (obj.numberofitems !== "" && obj.helpers == ""){
        if (ApplyRegex("numberinclude0", ctx.message.text)){
          obj.helpers = ctx.message.text;
          ctx.reply("ManNVan - please identify if you need any extra hour (e.g. 1)",
          Markup.keyboard([["0", "1", "2", "3"]]).resize());
        }else{
          ctx.reply("ManNVan - please identify the extra helper you need in number (e.g. 1)")
        }
        break;
      }

      //put answer into obj.extrahour => 
      //ask "Furniture Delivery and Assembly" and "Home Moving" assemble serivce
      //ask "Manchester Airport Transfer" flight number
      //ask "Goods Delivery"  name
      if (obj.helpers !== "" && obj.extrahour == ""){
        if (ApplyRegex("numberinclude0", ctx.message.text)){
          obj.extrahour = ctx.message.text;
          if(obj.service == "Furniture Delivery and Assembly" || obj.service == "Home Moving"){
            ctx.reply("ManNVan - please state the number of funiture needed to be assemble (i.e. if no, press 0)",
            Markup.keyboard([["0", "1", "2", "3"]]).resize())
          }
          else if(obj.service == "Manchester Airport Transfer"){
            ctx.reply("ManNVan - please identify your flight number (e.g. BA175)")
          }
          else if(obj.service == "Goods Delivery"){
            ctx.reply("ManNVan - please enter your name (e.g. Martin Barnes)")
          }
        }else{
          ctx.reply("ManNVan - please identify the extra hour you need in number (e.g. 6)")
        }
        break;
      }

      //put answer into obj.assembleservice => ask name
      if (obj.service == "Furniture Delivery and Assembly" || obj.service == "Home Moving" && obj.extrahour !== "" && obj.assembleservice == ""){
        if (ApplyRegex("numberinclude0", ctx.message.text)){
          obj.assembleservice = ctx.message.text;
          ctx.reply("ManNVan - please enter your name (e.g. Martin Barnes)")
        }else{
          ctx.reply("ManNVan - please enter your answer with numbers (i.e. if no, press 0)")
        }
        break;
      }
      //put answer into obj.flightNumber => ask name
      if (obj.service == "Manchester Airport Transfer" && obj.extrahour !== "" && obj.flightNumber == ""){
        if (ApplyRegex("flightNumber", ctx.message.text)){
          obj.flightNumber = ctx.message.text;
          ctx.reply("ManNVan - please enter your name (e.g. Martin Barnes)")
        }else{
          ctx.reply("ManNVan - please follow the exact format entering your flight number")
        }
        break;
      }

      //put answer into obj.name => ask contact
      if (obj.service == "Furniture Delivery and Assembly" || obj.service == "Home Moving" && obj.assembleservice !== "" && obj.name == ""){
        if (ApplyRegex("name", ctx.message.text)) {
          obj.name = ctx.message.text;
          ctx.reply("ManNVan - please enter your contact number (e.g. 07882590546)");
        } else {
          ctx.reply("ManNVan - your name should not include number or symbol");
        }
        break;
      }
      //put answer into obj.name => ask contact
      if (obj.service == "Manchester Airport Transfer" && obj.flightNumber !== "" && obj.name == ""){
        if (ApplyRegex("name", ctx.message.text)) {
          obj.name = ctx.message.text;
          ctx.reply("ManNVan - please enter your contact number (e.g. 07882590546)");
        } else {
          ctx.reply("ManNVan - your name should not include number or symbol");
        }
        break;
      }
      //put answer into obj.name => ask contact
      if (obj.service == "Goods Delivery" && obj.extrahour !== "" && obj.name == "") {
        if (ApplyRegex("name", ctx.message.text)) {
          obj.name = ctx.message.text;
          ctx.reply("ManNVan - please enter your contact number (e.g. 07882590546)");
        } else {
          ctx.reply("ManNVan - your name should not include number or symbol");
        }
        break;
      }

      //put answer into obj.contactNumber => ask for broadcast permission
      if (obj.name !== "" && obj.contactNumber == "") {
        if (ApplyRegex("contactNumber", ctx.message.text)) {
        obj.contactNumber = ctx.message.text;
        ctx.reply(`
ManNVan - Order information overview: 

【${obj.service}】
 
Date: ${obj.date}
Time: ${obj.time}
Pick-up address: ${obj.pick_up_address}
Drop-off address: ${obj.drop_off_address}
Estimate Charges: £${obj.charge}

Name: ${obj.name}
Contact Number: ${obj.contactNumber}
Username: @${obj.username}

Please press confirm to send your order, or press cancel to create your new order
`, Markup.keyboard([["Confirm", "Cancel"]]).resize().oneTime())
      }else{        
        ctx.reply("ManNVan - please follow the exact format entering your contact number");
      }
        break;
      }

      //watch answer from respond => broadcast to driver group
      if (obj.name !== "" && obj.contactNumber !== "") {
        if (ctx.message.text == "Confirm") {
          if (obj.status == "sent2Driver") {
            ctx.reply("ManNVan - your order has been sent to our professional drivers, please be patient for any response");
          }
          //send order to driver channel (action: limited to 1 time)
          if (obj.status == "drafting") {
            ctx.telegram.sendMessage(process.env.DRIVER_CHANNEL_ID, `
ManNVan - Order information overview: 

【${obj.service} ${obj.date}】

Date: ${obj.date}
Time: ${obj.time}
Flight Number: ${obj.flightNumber}
Pick-up airport: ${obj.pick_up}
Drop-off destination: ${obj.drop_off}

Name: ${obj.name}
Contact Number: ${obj.contactNumber}
Username: @${obj.username}

Please press Match to take this order, or Skip to tell us you are not interested
// `, Markup.inlineKeyboard([
  Markup.button.callback('Match', `${obj.chatId}`),
  Markup.button.callback('Report', `r${obj.chatId}`)
]))
            obj.status = "sent2Driver"
            ctx.reply("ManNVan - we are matching your order with our professional drivers, this usually takes 10-15 mins");
            //Requirement: send order record to database
          }
        }
        if (ctx.message.text == "Cancel") {
          for (var i = 0; i < storage.length; i++) {
            if (storage[i].chatId == chatId) {
              storage.splice(i, 1);
            }
          }
          ctx.reply("ManNVan - your order has been cancelled");
        }
        break;
      }
    }
  }
})


bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))