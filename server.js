// express
const path = require("path");
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const bodyParser = require("body-parser");
process.stdin.setEncoding("utf8");
// mongo
require("dotenv").config({ path: path.resolve(__dirname, '.env') })

if (process.argv.length != 2 || process.argv.le) {
    console.log("Usage server.js");
    process.exit(0);
}

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (request, response) => {
    response.render("home.ejs");
});

app.get("/search", async (request, response) => {
    let stores = await fetch("https://www.cheapshark.com/api/1.0/stores");
    stores = await stores.json();
    
    const title = request.query.title ?? "";
    let gamesObjects = await fetch(`https://www.cheapshark.com/api/1.0/deals?title=${title}`);
    gamesObjects = await gamesObjects.json();
    let games = "";
    gamesObjects.forEach(game => {
        const store = stores.find(x => x.storeID === game.storeID);
        if (game.isOnSale === "1") {
            games += `<form class='game' action='/saveGame' method='post'><h2>${game.title}</h2><h3>Sale on: ${store.storeName}</h3><p class='onSale'>Is on sale</p><p>Original Price: ${game.normalPrice}$</p><p>Sale Price: ${game.salePrice}$$</p><input type="text" name="gameID" value="${game.gameID}" hidden><input type='submit' value='Save'></form><br>`
        } else {
            games += `<form class='game' action='/saveGame' method='post'><h2>${game.title}</h2><h3>Sold on: ${store.storeName}</h3><p class='notOnSale'>Not on sale</p><p>Price: ${game.normalPrice}$</p><input type="text" name="gameID" value="${game.gameID}" hidden><input type='submit' value='Save'></form><br>`

        }
    });
    response.render("search.ejs", { games });
});

app.post("/saveGame", async (request, response) => {
    await saveGame(request.body.gameID);
    response.render("saveConfirmation.ejs");
});

app.get("/savedGames", async (request, response) => {
    let stores = await fetch("https://www.cheapshark.com/api/1.0/stores");
    stores = await stores.json();

    const gameObjects = await getSavedGames();
    let games = "";
    gameObjects.forEach(game => {
        if (game.deals && game.deals !== [] && parseFloat(game.deals[0].savings) !== 0) {
            // console.log(game)
            const store = stores.find(x => x.storeID === game.deals[0].storeID);
            games += `<form class='game' action='/deleteGame' method='post'><h2>${game.info.title}</h2><h3>Sale on: ${store.storeName}</h3><p class='onSale'>Is on sale</p><p>Original Price: ${game.deals[0].retailPrice}$</p><p>Sale Price: ${game.deals[0].price}$</p><input type="text" name="gameID" value="${game.gameID}" hidden><input type="submit" value="delete"></form><br>`;
        } else {
            games += `<form class='game' action='/deleteGame' method='post'><h2>${game.info.title}</h2><p class='notOnSale'>Not on sale right now</p><input type="text" name="gameID" value="${game.gameID}" hidden><input type="submit" value="delete"></form><br>`;
        }
    });
    response.render("savedGames.ejs", { games });
});

app.post("/deleteGame", async (request, response) => {
    await deleteGame(request.body.gameID)
    response.render("deleteConfirmation.ejs");
});

app.listen(4000);

const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.hggvlc9.mongodb.net/?retryWrites=true&w=majority`
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

const { MongoClient, ServerApiVersion } = require('mongodb');

async function saveGame(gameID) {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    let game = {gameID: gameID};
    await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(game);
    await client.close();
}

async function getSavedGames() {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    let result = client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .find({});
    result = await result.toArray()
    await client.close();
    let games = [];
    for (x of result) {
        let game = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${x.gameID}`);
        game = await game.json();
        game.gameID = x.gameID;
        games.push(game);
    }
    return games;
}

async function deleteGame(gameID) {
    // const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    let filter = {gameID: gameID};
    await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteOne(filter);
    await client.close();
}

let prompt = `Web server started. Stop to shutdown the server: `;
process.stdout.write(prompt);
process.stdin.on("readable", function () {
let dataInput = process.stdin.read();
if (dataInput !== null) {
    let command = dataInput.trim();
    if (command === "stop") {
        console.log("Shutting down the server");
        process.exit(0);
    } else {
        console.log(`Invalid command: ${command}`);
    }
    process.stdin.resume();
}
});