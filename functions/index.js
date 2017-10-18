const cheerio = require('cheerio');
const fetch = require('node-fetch');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment');

const DATE_FORMAT = 'YYYY_MMMM_D'

const header = `
<meta name=viewport content="width=device-width, initial-scale=1.0, minimum-scale=1.0 maximum-scale=1.0">
<link href="https://fonts.googleapis.com/css?family=Source+Serif+Pro" rel="stylesheet">
<link rel="apple-touch-icon" href="//en.wikipedia.org/static/apple-touch/wikipedia.png"/>
<meta name="apple-mobile-web-app-title" content="Current Events">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">

<style>
html, body {
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Source Serif Pro', serif;
  text-rendering: optimizelegibility;
  font-size: 18px;
}
a:link, a:visited{
  color: darkgray;
}
dt {
  font-variant: small-caps;
}
article > ul {
  margin-left: 0;
  padding-left: 0;
  list-style: none;
}
article > ul > li {
  margin-bottom: 12px;
}
ul {
  margin-left: 8px;
  padding-left: 12px;
}
header {
  padding: 12px;
  height: 20px;
  background: #eaecf0;
}
header img {
  height: 20px;
}
article {
  margin: 12px;
}
</style>

<header>
<a href="https://m.wikimediafoundation.org/w/index.php?title=Ways_to_Give&mobileaction=toggle_view_mobile">
<img src="https://en.m.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-en.svg"/>
</a>
</header>

<article>
`
const footer = `</article>`
const WIKI_ROOT =
  'https://en.wikipedia.org/w/index.php?action=render&title=Portal:Current_events/';

admin.initializeApp(functions.config().firebase);

exports.fetchWiki = functions.https.onRequest((req, res) => {
  let date = req.query.date;
  if (!date) {
    date = moment().local().format(DATE_FORMAT);
  }
  const previousDate = moment(date, DATE_FORMAT).local().subtract(1, 'day').format(DATE_FORMAT)
  // Fetch the news for the day. If no news, fetch it for the previous day.
  fetchCurrentEvents(date).then((html, text) => {
    if (text) {
      console.log(`Fetched news for ${date}.`, html)
      formatResponse(res, html, date)
    } else {
      console.log(`No news found for ${date}. Looking for news on ${previousDate}.`)
      fetchCurrentEvents(previousDate).then(html => formatResponse(res, html))
    }
  })
});

function fetchCurrentEvents(date, res) {
  return new Promise((resolve, reject) => {
    const url = WIKI_ROOT + date;
    fetch(url)
      .then(res => res.text())
      .then(body => {
        const $ = cheerio.load(body)
        const html = $('.description').html()
        const text = $('.description').text()
        resolve(html, text)
      }).catch(error => {
        res.send('Error:', error)
      })
  })
}

function formatResponse(res, html, date) {
  res.send(header + html + footer)
}
