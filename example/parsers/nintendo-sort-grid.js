// parsing gameElement
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

  // add to json array
  games.push(game);
});
