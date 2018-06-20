const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

const openBrowser = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1000 });
  return { browser, page };
};

const getHtml = async (page, genre) => {
  await page.goto(
    `https://www.nintendo.com/games/game-guide/?pv=true#filter/-|-|-|${genre}|-|-|-|-|-|-|-|-|-|-|title|asc|-|-`,
    { waitUntil: 'networkidle0' }
  );

  // wait for page to load and get list view
  await page.click('#btn-sort-list');

  let btnIsActive = await page.$eval(
    '#btn-load-more',
    node => node.className.match('active') !== null
  );

  while (btnIsActive) {
    console.log('getting more games...');
    await page.click('#btn-load-more');
    await page.waitFor(2000);
    btnIsActive = await page.$eval(
      '#btn-load-more',
      node => node.className.match('active') !== null
    );
  }

  await page.waitForSelector('ul.games li');

  const html = await page.evaluate(() =>
    Array.from(document.querySelectorAll('ul.games li'))
      .map(item => item.innerHTML)
      .join('')
  );

  return html;
};

const scrape = async page => {
  const genres = [
    'action_adventure',
    'first_person',
    'role_playing',
    'puzzle_strategy',
    'party',
    'music_fitness',
    'sports_racing',
    'simulation',
    'education',
    'application'
  ];

  const now = moment();
  const games = [];

  for (let i = 0; i < genres.length; i++) {
    // Console.log current spot in the scraping process
    const genre = genres[i]
      .split('_')
      .map(el => el.slice(0, 1).toUpperCase() + el.slice(1).toLowerCase())
      .join(' ');
    console.log(`Scraping ${genre} games...`);

    // loading html
    const html = await getHtml(page, genres[0]);
    const $ = cheerio.load(html);

    // parsing gameElement
    $('div.row:not(".game-info")').each((i, elem) => {
      const gameElem = $(elem);
      const [, , , , numPlayers] = Array.from(gameElem.find('.col12').contents()).map(
        el => (el.innerText ? el.innerText.trim() : el.nodeValue ? el.nodeValue.trim() : '')
      );

      const game = {
        _id: gameElem.find('div.boxart a.main-link').data('game-id'),
        gameUrl: 'https:' + gameElem.find('div.boxart a.main-link').attr('href'),
        imgUrl: 'https:' + gameElem.find('div.boxart img').attr('src'),
        purchaseUrl: gameElem.find('a.btn-orange-filled')
          ? gameElem.find('a.btn-orange-filled').attr('href')
          : null,
        title: gameElem.find('h3.b3').text(),
        status:
          gameElem
            .find('.row-date strong')
            .text()
            .toLowerCase() === 'releases'
            ? 'Coming Soon'
            : gameElem.find('.row-date strong').text(),
        releaseDate: moment(
          gameElem
            .find('.row-date')
            .text()
            .replace(/released|releases/i, '')
            .trim(),
          ['MMM D, YYYY', 'MMM YYYY', 'YYYY']
        ),
        sale: gameElem.find('.row-price strong').hasClass('sale-price')
          ? parseInt(
              gameElem
                .find('.row-price strong')
                .text()
                .replace(/$|\./g, ''),
              10
            )
          : null,
        price: gameElem.find('.row-price strong').hasClass('sale-price')
          ? parseInt(
              gameElem
                .find('.row-price s.strike')
                .text()
                .replace(/\$|\./g, ''),
              10
            )
          : gameElem
              .find('.row-date strong')
              .text()
              .toLowerCase() === 'released'
            ? parseInt(
                gameElem
                  .find('.row-price strong')
                  .text()
                  .replace(/\$|\./g, ''),
                10
              )
            : null,
        system:
          gameElem.find('p.b4:not(".row-date")').data('system') ||
          gameElem.find('p.b4:not(".row-date")').text(),
        numPlayers: numPlayers || 'Unknown',
        genre,
        asOfDate: now
      };

      // add to json array
      games.push(game);
    });
  }

  // write out to json file
  fs.writeFileSync(
    path.join(__dirname, `./out/nintendo-${now.format('MM-DD-YYYY')}.json`),
    JSON.stringify({ games }, null, 2)
  );
  console.log('Done!');
};

// Main Function
(async () => {
  try {
    const { browser, page } = await openBrowser();
    await scrape(page);
    await browser.close();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
  process.exit(0);
})();
