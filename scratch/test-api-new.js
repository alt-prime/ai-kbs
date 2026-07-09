const https = require('https');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';

const query = '九州 サウナ';
const dataString = JSON.stringify({ textQuery: query, languageCode: 'ja' });

const options = {
  hostname: 'places.googleapis.com',
  path: '/v1/places:searchText',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.formattedAddress',
    'Referer': 'http://localhost:3000',
    'Content-Length': Buffer.byteLength(dataString)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(dataString);
req.end();
