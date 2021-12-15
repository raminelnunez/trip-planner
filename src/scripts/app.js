const token = "pk.eyJ1IjoicmFtaW5lbG51bmV6IiwiYSI6ImNreDZzcWt5ZTA1Znkyb254MWZxdGk0ODUifQ.rDi0UeZg7jDeR8_ryr7FuA";
const apiKey = "1vbBsFqGS6MWA0hvpBq0";
const winnipegTransit = "https://api.winnipegtransit.com/v3/trip-planner.json?";
const mapBox = "https://api.mapbox.com/geocoding/v5/mapbox.places/";

const coords = {
  latitude: 0,
  longitude: 0,

  get log() {
    console.log(`latitde, longitude`)
    console.log(`${this.latitude}, ${this.longitude}`)
  }
};

let results;

navigator.geolocation.getCurrentPosition((position) => {
  coords.latitude = position.coords.latitude;
  coords.longitude = position.coords.longitude;
});

async function getGeocode (qString) {
  const targetURL =`${mapBox}${qString}.json?types=address&access_token=${token}&proximity=${coords.longitude},${coords.latitude}&types=poi`
  const response = await fetch(targetURL);
  const data = await response.json();
  return data.features;
};

const getDistance = function (arr) {
  const [long, lat] = arr;
  const longDiffKM = Math.abs(long - coords.longitude) * 111.319;
  const latDiffKM = Math.abs(lat - coords.latitude) * 111.319;
  const distance = Math.sqrt(longDiffKM ** 2 + latDiffKM ** 2);

  return distance;
};

async function search(search_text) {
  const searchResults = await getGeocode(search_text);
  console.log(searchResults)
  results = [];
  for (let item of searchResults) {
    let info = item.place_name.split(', ')
    let name = info[0];
    let address = info[1];
    let coords = item.geometry.coordinates
    if (info.includes('Winnipeg') === true) {
      results.push(new SearchResult(name, address, coords))
    }
  }
}

class SearchResult {
  constructor(name, address, coords) {
    this.name = name;
    this.address = address;
    this.coords = coords;
  }
}

async function getBusRoute(origin, destination) {
  let orig = origin.replace(/ /g, '&');
  let dest = destination.replace(/ /g, '&');
  const targetURL = `${winnipegTransit}api-key=${apiKey}&origin=addresses/${orig}&destination=addresses/${dest}`
  const response = await fetch(targetURL);
  const data = await response.json();
  console.log(data)
}