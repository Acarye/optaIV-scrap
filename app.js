const express = require('express');
const puppeteer = require('puppeteer');
const HTMLParser = require('node-html-parser');
const csv = require('csvtojson');
const utils = require('./src/utils');
const timer = ms => new Promise(res => setTimeout(res, ms));

const app = express();
app.use(express.json());


/**
 * ------------------
 * -----STEAM DB-----
 * ------------------
 */

const listBaseUrl = 'https://steamdb.info/graph/';
const priceBaseUrl = 'https://steamdb.info/app';
const inputFile = 'steamdb-info';
const initSteamDb = async () => {
    console.log('initSteamDb');
    let games = [];
    let gamesCount = 0;
    try {
        const file = await csv().fromFile(`./src/input/${inputFile}.csv`);
        gamesCount = file.length;
    } catch (e) {
        console.log('No cuentas con un archivo existente.');
    }

    const browser = await puppeteer.launch({
        headless: true,
    });
    const page = await browser.newPage();

    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 Edg/100.0.1185.50',
    );
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5',
    });

    await page.goto(listBaseUrl);
    await page.screenshot({path: './src/output/jeje.png'});
    await page.waitForSelector('select[name="table-apps_length"]', {timeout: 6000});

    await page.select('select[name="table-apps_length"]', '-1');

    const tableHtml = await page.evaluate(() => {
        return document.querySelector('.dataTable_table_wrap').innerHTML;
    });

    const table = HTMLParser.parse(tableHtml);

    let rows = table.querySelector('tbody').querySelectorAll('tr');
    if (gamesCount !== 0) rows = rows.slice(gamesCount);

    let counter = 0;

    for (const row of rows) {
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');
        await client.send('Network.clearAcceptedEncodingsOverride');

        let withError = false;
        let currentPrice;
        let lowerPrice;
        let description;
        let timeout = 0;
        do {
            try {
                if (timeout !== 0) console.log(timeout);
                await timer(timeout);

                let information = await getGameInformation(browser, row.attributes['data-appid']);
                currentPrice = information.currentPrice;
                lowerPrice = information.lowerPrice;
                description = information.description;
                if (information.banned) throw new Error('BANNED');
                withError = false;
            } catch (e) {
                console.log(e);
                withError = true;
                timeout = Math.floor(Math.random() * (60 - 45 + 1) + 45) * 60000;
            }
        } while (withError);

        const tds = row.querySelectorAll('td');

        games.push({
            index: tds[0].innerText,
            appId: row.attributes['data-appid'],
            image: row.querySelector('img').attributes['src'],
            title: row.querySelectorAll('a')[1].innerText,
            current: tds[3].innerText,
            currentPeak: tds[4].innerText,
            allTimePeak: tds[5].innerText,
            currentPrice,
            lowerPrice,
            description
        });

        if (counter % 10 === 0) {
            await utils.objectToCSV(games, inputFile, true, true);
            games = [];
        }
        counter++;
    }

    await browser.close();

    return {fileName: inputFile};

};

const getGameInformation = async (browser, appId) => {
    const page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 Edg/100.0.1185.50',
    );
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5',
    });

    let description = '';
    let banned = false;
    try {
        await page.goto(`${priceBaseUrl}/${appId}/`);
        await page.waitForSelector('#prices', {timeout: 6000});

        let pageContent = await page.content();
        let bannedText = HTMLParser.parse(pageContent).querySelector('h1').innerText;
        if (bannedText) {
            banned = bannedText.includes('banned');
            if (banned) throw new Error('Banned');
        }
        try {
            description = await page.evaluate(() => {
                return document.querySelector('.header-description').innerText;
            });
        } catch (e) {
            description = 'N/A';
        }
        const tableHtml = await page.evaluate(() => {
            return document.querySelector('[id="prices"]').querySelector('table').innerHTML;
        });

        const price = HTMLParser.parse(tableHtml);
        const rows = price.querySelectorAll('tr');

        const priceRow = rows.filter(el => el.querySelector('td[data-cc="cl"]'));

        await page.close();
        return {
            currentPrice: priceRow[0].querySelectorAll('td')[1].innerText,
            lowerPrice: priceRow[0].querySelectorAll('td')[3].innerText,
            description,
            banned
        };
    } catch (err) {
        let pageContent = await page.content();
        let bannedText = HTMLParser.parse(pageContent).querySelector('h1')?.innerText;
        await page.close();
        return {
            currentPrice: 'N/A',
            lowerPrice: 'N/A',
            description,
            banned: bannedText.includes('banned')
        };
    }

};

/**
 * ------------------
 * -----How Long To Beat-----
 * ------------------
 */

const howLongUrl = 'https://howlongtobeat.com/';

const initHowLongToBeat = async (inputFile) => {
    console.log('initHowLongToBeat');
    const games = await csv().fromFile(`./src/input/${inputFile}.csv`);
    let newGamesInfo = [];
    let browser = await puppeteer.launch({
        headless: false,
    });
    let page = await browser.newPage();
    await page.goto(howLongUrl);
    let counter = 0;

    for (const game of games.slice(4900)) {
        const {exact, mainStory, portrait, description} = await scrapHowLongToBeat(page, game);
        newGamesInfo.push({
            ...game,
            exact,
            mainStory,
            portrait,
        });
        if (counter % 10 === 0) {
            await utils.objectToCSV(newGamesInfo, 'howLongToBeat', false, true);
            newGamesInfo = [];
        }
        if (counter % 200 === 0) {
            await browser.close();
            browser = await puppeteer.launch({
                headless: false,
            });
            page = await browser.newPage();
            await page.goto(howLongUrl);
        }
        counter++;
    }
    await browser.close();

};

const scrapHowLongToBeat = async (page, game) => {

    await page.waitForSelector('.search_container');

    const input = await page.$('.global_search_box');
    await input.click({clickCount: 3});
    await page.focus('.global_search_box');
    await page.keyboard.type(game.title);

    let description = 'N/A';
    let mainStory = 'N/A';
    let portrait = 'N/A';
    let exact = 'false';
    try {
        await page.waitForSelector('.global_padding.shadow_box.back_blue.center', {
            timeout: 5000
        });
        let exists = await page.$('a.text_green');

        if (exists) {
            await page.click('a.text_green');
            exact = 'true';
        } else {
            await page.click('a.text_white');
            exact = 'false';
        }

        await page.waitForSelector('.in.back_primary.shadow_box', {
            timeout: 5000
        });
        await page.waitForSelector('.profile_info', {
            timeout: 5000

        });
        await page.waitForSelector('.in.scrollable.shadow_box.back_primary', {
            timeout: 5000
        });

        const html = await page.content();
        const htmlElement = await HTMLParser.parse(html);

        const table = htmlElement.querySelector('.in.scrollable.shadow_box.back_primary');
        if (table) mainStory = table.querySelector('tbody')?.querySelectorAll('td')[2]?.innerText;
        portrait = htmlElement.querySelectorAll('img[alt="Box Art"]')[1]?.attributes['src'];

        return {
            mainStory,
            portrait,
            exact: exact
        };

    } catch (e) {
        return {
            mainStory: 'N/A',
            portrait: 'N/A',
            exact: 'false',
        };
    }

};

app.listen(5500, async () => {
    console.log('Started in PORT = ', 5500);
    const {fileName} = await initSteamDb();
    await initHowLongToBeat(fileName);
});
