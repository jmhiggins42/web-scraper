const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

const getHtml = async genre => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 1000 });
  await page.goto(
    `https://www.nintendo.com/games/game-guide/?pv=true#filter/-|-|-|${genre}|-|-|-|-|-|-|-|-|-|-|title|asc|-|-`,
    { waitUntil: 'networkidle0' }
  );

  // wait for page to load and get list view
  page.click('#btn-sort-list', { delay: 75 });

  let btnIsActive = await page.$eval(
    '#btn-load-more',
    node => node.className.match('active') !== null
  );

  while (btnIsActive) {
    console.log('getting more games...');
    await page.click('#btn-load-more');
    await page.waitFor(1000);
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

  await browser.close();
  return html;
};

const scrape = async () => {
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

  const now = new Date();
  const games = [];

  for (let i = 0; i < genres.length; i++) {
    const prettyGenre = genres[i]
      .split('_')
      .map(el => el.slice(0, 1).toUpperCase() + el.slice(1).toLowerCase())
      .join(' ');
    console.log(`Scraping ${prettyGenre} games...`);
    const html = await getHtml(genres[0]);
    const $ = cheerio.load(html);

    $('a').each((i, elem) => {
      const gameElem = $(elem);
      const game = {
        _id: gameElem.data('game-id'),
        url: 'https' + gameElem.attr('href'),
        title: gameElem.data('game-title') || gameElem.find('h3.b3').text(),
        nsuid: gameElem.data('game-nsuid'),
        img: 'https' + gameElem.find('img').attr('src'),
        status:
          gameElem
            .find('.row-date strong')
            .text()
            .toLowerCase() === 'releases'
            ? 'Coming Soon'
            : gameElem.find('.row-date strong').text(),
        ReleaseDate: gameElem
          .find('.row-date')
          .text()
          .replace(/released|releases/i, '')
          .trim(),
        sale: gameElem.find('.row-price strong').hasClass('sale-price')
          ? gameElem.find('.row-price strong').text()
          : null,
        price: gameElem.find('.row-price strong').hasClass('sale-price')
          ? gameElem.find('.row-price s.strike').text()
          : gameElem
              .find('.row-date strong')
              .text()
              .toLowerCase() === 'released'
            ? gameElem.find('.row-price strong').text()
            : null,
        system: gameElem
          .children()
          .last()
          .data('system'),
        genre: prettyGenre,
        asOfDate: now
      };
      games.push(game);
    });
  }

  fs.writeFileSync(
    path.join(
      __dirname,
      `./out/nintendo-${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}.json`
    ),
    JSON.stringify(games, null, 2)
  );
  console.log('Done!');
};

try {
  scrape();
} catch (err) {
  console.log(err);
  process.exit(1);
}
