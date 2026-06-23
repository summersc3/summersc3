const express = require('express');
const app = express();
var port = process.env.PORT || 8080;
app.use(express.urlencoded({extended: false}));
app.use(express.json());
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
app.use(cors());
app.listen(port, () =>
    console.log("Express server is running on port " + port));

app.get("/", (req, res) => {
    res.send('COIL Project Microservice Gateway by Team 5 (Usage: /question/text)');
});

app.get("/echo.php", (req,res)=>{
    res.send(req.query.data)
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model: "gemini-2.5-flash"});

app.get("/summarize/:text", async (req, res) =>{
    const text = req.params.text;

    if (!text){
        return res.status(400).json({error: "Text is required, please try again"});
    }
    try{
        const result = await model.generateContent(`Answer the following question about the banking app:${text}`)
        const summary = result.response.text();
        res.json({summary});
    }
    catch(err){
        console.error(err);
        res.status(500).json({error: "AI Request Failed"});
    }
});

app.post("/summarize", async (req, res) =>{
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Text is required, please try again"})
    }
    try{
        const result = await model.generateContent(`Summarize the following text: ${text}`);
        const summary = result.response.text();
        res.json({summary});
    }
    catch(err){
        console.error(err);
        res.status(500).json({error: "AI Request Failed"});
    }
});
       

app.post("/convert-currency", async (req, res) => {
    const { senderCur, targetCur, amount } = req.body;

    if (!senderCur || !targetCur || amount == null || isNaN(amount)) {
        return res.status(400).json({ error: "Invalid input parameters" });
    }

    // Use USD as the base reference
    const data = await getLatestRates("USD");
    if (!data || !data.conversion_rates) {
        return res.status(502).json({ error: "Failed to fetch exchange rates" });
    }

    const rates = data.conversion_rates;

    if (!rates[senderCur]) {
        return res.status(400).json({ error: `Unknown base currency: ${senderCur}. Currency should be a 3-letter ISO 4217 code.` });
    }
    if (!rates[targetCur]) {
        return res.status(400).json({ error: `Unknown target currency: ${targetCur}. Currency should be a 3-letter ISO 4217 code.` });
    }

    // Derive exchange rate via USD pivot
    const result = amount * (rates[targetCur] / rates[senderCur]);
    res.json({ result });
});

async function getLatestRates(base) {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        
        return await res.json();
    } catch (err) {
        console.error("Error:", err.message);
        return null;
    }
}