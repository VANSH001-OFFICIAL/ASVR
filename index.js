const express = require('express');
const { Telegraf } = require('telegraf');
const bodyParser = require('body-parser');

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN; 
const bot = new Telegraf(BOT_TOKEN);
const ADMIN_ID = 7117775366;

// Memory storage
let activeCodes = new Map(); // { 'CODE': { amount: '10', limit: 5, usedBy: [] } }

app.use(bodyParser.urlencoded({ extended: true }));

// --- MINT THEME WEBSITE ---
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Mint Rewards</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: 'Poppins', sans-serif; background: #e0f2f1; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #ffffff; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,166,147,0.1); width: 90%; max-width: 400px; border-top: 8px solid #4db6ac; }
                h2 { color: #00796b; margin-bottom: 20px; font-size: 24px; text-align: center; }
                input, select { width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #b2dfdb; border-radius: 10px; outline: none; transition: 0.3s; box-sizing: border-box; }
                input:focus { border-color: #4db6ac; }
                button { width: 100%; padding: 15px; background: #4db6ac; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; }
                button:hover { background: #26a69a; }
                .footer { text-align: center; font-size: 12px; color: #80cbc4; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>🍃 Mint Claim</h2>
                <form action="/submit" method="POST">
                    <input type="text" name="code" placeholder="Enter Claim Code" required>
                    <select name="method">
                        <option value="UPI">UPI ID</option>
                        <option value="Ultra Wallet">Ultra Wallet</option>
                    </select>
                    <input type="text" name="address" placeholder="Enter Number / VPA" required>
                    <button type="submit">Claim Now</button>
                </form>
                <div class="footer">Powered by Mint Rewards System</div>
            </div>
        </body>
        </html>
    `);
});

// --- SUBMIT LOGIC ---
app.post('/submit', (req, res) => {
    const { code, method, address } = req.body;
    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const inputCode = code.trim();

    // 1. Check if Code exists
    if (!activeCodes.has(inputCode)) {
        return res.send("<h3 style='color:#00796b; text-align:center;'>❌ Invalid Code!</h3><center><a href='/'>Go Back</a></center>");
    }

    const codeData = activeCodes.get(inputCode);

    // 2. Check if this specific code limit is reached
    if (codeData.limit <= 0) {
        activeCodes.delete(inputCode);
        return res.send("<h3 style='color:#00796b; text-align:center;'>❌ Code Limit Reached!</h3>");
    }

    // 3. Update Code Data (Decrease limit)
    codeData.limit -= 1;
    if (codeData.limit <= 0) {
        activeCodes.delete(inputCode);
    } else {
        activeCodes.set(inputCode, codeData);
    }

    // 4. Send Notification to Admin
    bot.telegram.sendMessage(ADMIN_ID, 
        `🍃 **New Mint Loot!**\n\n` +
        `🎟 **Code:** \`${inputCode}\`\n` +
        `💵 **Amount:** ${codeData.amount}\n` +
        `💳 **Method:** ${method}\n` +
        `📍 **Address:** \`${address}\`\n` +
        `👥 **Remaining Uses:** ${codeData.limit}`,
        { parse_mode: 'Markdown' }
    );

    res.send("<h3 style='color:#00796b; text-align:center;'>✅ Request Sent! Check your wallet soon.</h3>");
});

// --- BOT COMMANDS ---
// Format: /make <amount> <total_users> <code_name>
bot.command('make', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Permission Denied.");

    const args = ctx.message.text.split(' ');
    if (args.length < 4) {
        return ctx.reply("❌ Format: `/make 10 5 mycode` \n(Amount: 10, Users: 5, Code: mycode)", { parse_mode: 'Markdown' });
    }

    const amount = args[1];
    const limit = parseInt(args[2]);
    const codeName = args[3];

    activeCodes.set(codeName, {
        amount: amount,
        limit: limit
    });

    ctx.reply(`✅ **Mint Code Created!**\n\n` +
              `🎟 **Code:** \`${codeName}\`\n` +
              `💰 **Amount:** ${amount}\n` +
              `👥 **Total Users:** ${limit}\n\n` +
              `Ab log website pe \`${codeName}\` daal kar loot sakte hain!`, { parse_mode: 'Markdown' });
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Mint Server Running...");
    bot.launch();
});
