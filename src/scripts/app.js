const token = "pk.eyJ1IjoicmFtaW5lbG51bmV6IiwiYSI6ImNreDZzcWt5ZTA1Znkyb254MWZxdGk0ODUifQ.rDi0UeZg7jDeR8_ryr7FuA";
const apiKey = "1vbBsFqGS6MWA0hvpBq0";
const winnipegTransit = "https://api.winnipegtransit.com/v3/";
const mapBox = "https://api.mapbox.com/geocoding/v5/mapbox.places/";

const coords = {
  latitude: 0,
  longitude: 0,

  get log() {
    console.log(`latitde, longitude`)
    console.log(`${this.latitude}, ${this.longitude}`)
  }
};

navigator.geolocation.getCurrentPosition((position) => {
  coords.latitude = position.coords.latitude;
  coords.longitude = position.coords.longitude;
});

const html = {
  originForm: document.getElementsByClassName('origin-form')[0],
  originInput: document.getElementsByTagName('input')[0],
  originsContainer: document.getElementsByClassName('origins')[0],
  destinationForm: document.getElementsByClassName('destination-form')[0],
  destinationInput: document.getElementsByTagName('input')[1],
  destinationContainer: document.getElementsByClassName('destinations')[0],
  planTrip: document.getElementsByClassName('plan-trip')[0],
  myTrip: document.getElementsByClassName('my-trip')[0]
}

const info = {
  origins: [],
  destinations: [],
}

const selected = {
  origin: undefined,
  destination: undefined,
}
let routes = [];

async function getGeocode (qString) {
  const targetURL =`${mapBox}${qString}.json?types=address&access_token=${token}&proximity=${coords.longitude},${coords.latitude}&types=poi`
  const response = await fetch(targetURL);
  const data = await response.json();
  return data.features;
};

async function search(search_text, location) {
  const searchResults = await getGeocode(search_text);
  let results = [];
  for (let item of searchResults) {
    let itemInfo = item.place_name.split(', ')
    let name = itemInfo[0];
    let address = itemInfo[1];
    let coords = item.geometry.coordinates
    let key = await getKey(coords.reverse());
    if (itemInfo.includes('Winnipeg') === true) {
      results.push(new Result(name, address, coords, key))
    }
  }
  if (location === 'origin') {
    info.origins = results;
  }
  if (location === 'destination') {
    info.destinations = results;
  }
  render(location)
}

class Result {
  constructor(name, address, coords, key) {
    this.name = name;
    this.address = address;
    this.coords = coords;
    this.key = key;
  }
}

class Walk {
  constructor(duration, destination) {
    this.message = `Walk for ${duration} minutes to ${destination[0]}${destination[1]}${destination[2]}${destination[3]}`;
    this.icon = 'walking';
  }
}

class Ride {
  constructor (route, duration) {
    this.message = `Ride the ${route} for ${duration} minutes`;
    this.icon = 'bus';
  }
}

class Transfer {
  constructor(origin, destination) {
    this.message = `Transfer from stop #${origin[0]} - ${origin[1]} to stop #${destination[0]} - ${destination[1]}`
    this.icon = 'ticket-alt'
  }
}

async function getKey(coords) {
  const targetURL = `${winnipegTransit}locations.json?api-key=${apiKey}&lat=${coords[0]}&lon=${coords[1]}`;
  const response = await fetch(targetURL);
  const data = await response.json();
  if (data.locations.length > 0) {
    if (data.locations[0].type === "address") {
      return data.locations[0].key;
    }
    if (data.locations[0].type === "monument") {
      return data.locations[0].address.key;
    }
  } else {
    return 'there was some error';
  }
}

async function getRoute(origKey, destKey) {
  const targetURL = `${winnipegTransit}trip-planner.json?api-key=${apiKey}&origin=addresses/${origKey}&destination=addresses/${destKey}&time=12:00`
  const response = await fetch(targetURL);
  const data = await response.json();
  parseRoute(data);
}

async function parseRoute(data) {
  routes = []
  for (let plan of data.plans) {
    let route = [];
    let i = 0
    for (let segment of plan.segments) {
      i++
      if (segment.type === 'walk') {
        if (i === plan.segments.length) {
          route.push(new Walk(segment.times.durations.total, ["your ", "destination.", "", ""] ));
        } else if (i < plan.segments.length) {
          route.push(new Walk(segment.times.durations.total, ["stop #", segment.to.stop.key, " - ",segment.to.stop.name]));
        }
      }
      if (segment.type === 'ride') {
        route.push(new Ride(segment.route.name, segment.times.durations.total));
      }
      if (segment.type === 'transfer') {
        route.push(new Transfer([segment.from.stop.key, segment.from.stop.name], [segment.to.stop.key, segment.to.stop.name] ));
      }
    }
    if (route[0] !== undefined) {
      routes.push(route)
    } 
  }
  return routes;
}

function handleInput(e, calledFunction) {
  e.preventDefault();
  calledFunction;
  render();
} 

html.originForm.addEventListener('submit', (e) => handleInput(e, search(html.originInput.value, 'origin')))
html.destinationForm.addEventListener('submit', (e) => handleInput(e, search(html.destinationInput.value, 'destination')))
html.planTrip.addEventListener('click', (e) => planTrip())

async function planTrip() {
  if (selected.origin !== undefined && selected.destination !== undefined) {
    await getRoute(selected.origin, selected.destination);
    html.myTrip.innerHTML = "";
    for (let segment of routes[0]) {
      html.myTrip.insertAdjacentHTML('beforeend', `
      <li>
        <i class="fas fa-${segment.icon}" aria-hidden="true"></i>
        ${segment.message}
      </li>
      `)
    }
  } else {
    html.myTrip.innerHTML = "";
  }
}

function render(what) {
  if (what === 'origin' || what === 'all') {
    html.originsContainer.innerHTML = "";
    for (let place of info.origins) {
      html.originsContainer.insertAdjacentHTML('beforeend', `
        <li key="${place.key}" class="origin-result">
          <div class="name">${place.name}</div>
          <div>${place.address}</div>
        </li>
      `)
    }
    let originResults = document.getElementsByClassName('origin-result');
    for (let result of originResults) {
      result.addEventListener('click', () => select(result)); //result.setAttribute('class', 'selected'), selected.origin = result.getAttribute('key')
    }
  }

  if (what === 'destination' || what === 'all') {
    html.destinationContainer.innerHTML = "";
    for (let place of info.destinations) {
      html.destinationContainer.insertAdjacentHTML('beforeend', `
        <li key="${place.key}" class="destination-result">
          <div class="name">${place.name}</div>
          <div>${place.address}</div>
        </li>
      `)
    }
    let destinationResults = document.getElementsByClassName('destination-result');
    for (let result of destinationResults) {
      result.addEventListener('click', () => select(result));
    }
  }

  if (what === 'routes' || what === 'all') {
    planTrip();
  }
}

function select(result) {
  if (result.getAttribute('class') === 'origin-result') {
    let selectedOrigins = document.getElementsByClassName('origin-result selected');
    for (let each of selectedOrigins) {
      each.classList.remove("selected")
    }
    selected.origin = result.getAttribute('key');
    result.setAttribute('class', 'origin-result selected');
  }

  if (result.getAttribute('class') === 'destination-result') {
    let selectedDestinations = document.getElementsByClassName('destination-result selected');
    for (let each of selectedDestinations) {
      each.classList.remove("selected")
    }
    selected.destination = result.getAttribute('key');
    result.setAttribute('class', 'destination-result selected');
  }
}

render('all')