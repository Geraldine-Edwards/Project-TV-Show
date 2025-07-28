// Caches to avoid fetching shows/episodes twice
const showsCache = {};
const episodesCache = {};

let allShows = [];
let allEpisodes = [];

// helper function to clear the content of a given element
function clearElement(element) {
  element.innerHTML = "";
}

// helper function to pad numbers with leading zeros to ensure 2 digits
function zeroPad(num) {
  return String(num).padStart(2, "0");
}

// helper function to create the label for the episodes dropdown options and the episode name in the card
function createEpisodeLabel(ep) {
  return `${ep.name} (S${zeroPad(ep.season)}E${zeroPad(ep.number)})`;
}

// helper function to create the show card
function createShowCard(show) {
  const card = document.createElement("section");
  card.className = "show-card";
  card.innerHTML = `
     <h3 class="show-title">${show.name}</h3>
  <img class="show-image" src="${show.image?.medium || ""}" alt="${show.name}">
  <p class="show-genres"><strong>Genres:</strong> ${show.genres.join(", ")}</p>
  <p class="show-status"><strong>Status:</strong> ${show.status}</p>
  <p class="show-rating"><strong>Rating:</strong> ${show.rating?.average || "N/A"}</p>
  <p class="show-runtime"><strong>Runtime:</strong> ${show.runtime} min</p>
  <p class="show-summary">${show.summary}</p>
`;
  //  click to view the episodes of the show
  card
    .querySelector(".show-title")
    .addEventListener("click", () => handleShowSelect(show.id));
  return card;
}

// helper function to create the episode card
function createEpisodeCard(ep) {
  const card = document.createElement("section");
  card.className = "episode-card";
  card.innerHTML = `
    <h3 lass="episode-title">${ep.name} - S${zeroPad(ep.season)}E${zeroPad(ep.number)}</h3>
    <img class="episode-image" src="${ep.image?.medium || ""}" alt="${ep.name}">
    <p class="episode-summary">${ep.summary}</p>
  `;
  return card;
}

// function to render the cards for shows or episodes
function renderCards(data, type) {
  const rootElem = document.getElementById("root");
  clearElement(rootElem);

  const cardTemplate = type === "show" ? createShowCard : createEpisodeCard;
  const cards = data.map(cardTemplate);
  rootElem.append(...cards);
}

// Populates the show dropdown with all shows
function populateShowDropdown(shows) {
  const select = document.getElementById("showSelect");
  clearElement(select);
  select.innerHTML = `<option value="">Select a show...</option>`;
  shows.forEach((show) => {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    select.appendChild(option);
  });
}

// Populates the episode dropdown with episodes from the selected show
function populateEpisodeDropdown(episodes) {
  const select = document.getElementById("episodeSelect");
  clearElement(select);
  select.innerHTML = `<option value="all">All Episodes</option>`;
  episodes.forEach((ep) => {
    const option = document.createElement("option");
    const code = `S${zeroPad(ep.season)}E${zeroPad(ep.number)}`;
    option.value = ep.id;
    option.textContent = `${code} - ${ep.name}`;
    select.appendChild(option);
  });
}

// Sets up the episode dropdown to filter episodes when an option is selected
function setupEpisodeDropdown(episodes) {
  const select = document.getElementById("episodeSelect");
  select.addEventListener("change", () => {
    const value = select.value;
    const countElem = document.getElementById("displayCount");
    if (value === "all") {
      renderCards(episodes, "episode");
      updateDisplayCount(episodes.length, episodes.length, "episode");
    } else {
      const selected = episodes.find((ep) => ep.id === Number(value));
      renderCards([selected], "episode");
    }
  });
}

// helper function to update the episode count display
function updateDisplayCount(displayed, total, type) {
  const countElem = document.getElementById("displayCount");
  const showOrEpisodeType = type === "show" ? "shows" : "episodes";
  countElem.textContent = `Displaying ${displayed} / ${total} ${showOrEpisodeType}`;
}

// helper function to display message when no matches are found
function showNoMatches(type) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = `<p>No matches found for ${type === "show" ? "shows" : "episodes"}.</p>`;
}

// set up the search input to filter shows or episodes based on user input
function setupSearch(data, type) {
  const input = document.getElementById("searchInput");
  // reset the search box
  input.value = "";
  input.addEventListener("input", () => {
    const query = input.value.toLowerCase();
    let filtered;
    if (type === "show") {
      filtered = data.filter(
        (show) =>
          show.name.toLowerCase().includes(query) ||
          show.genres.join(" ").toLowerCase().includes(query) ||
          (show.summary && show.summary.toLowerCase().includes(query))
      );
      if (filtered.length === 0) {
        showNoMatches("show");
        updateDisplayCount(0, data.length, "show");
      } else {
        renderCards(filtered, "show");
        updateDisplayCount(filtered.length, data.length, "show");
      }
    } else {
      filtered = data.filter(
        (ep) =>
          ep.name.toLowerCase().includes(query) ||
          (ep.summary && ep.summary.toLowerCase().includes(query))
      );
      if (filtered.length === 0) {
        showNoMatches("episode");
        updateDisplayCount(0, data.length, "episode");
      } else {
        renderCards(filtered, "episode");
        updateDisplayCount(filtered.length, data.length, "episode");
      }
    }
  });
}

// add "Back to Shows" link when viewing episodes
function showBackToShows() {
  const nav = document.getElementById("navigation");
  nav.innerHTML = `<button id="backToShowsBtn">Back to Shows</button>`;
  document.getElementById("backToShowsBtn").onclick = () => {
    nav.innerHTML = "";
    document.getElementById("showSelect").style.display = "";
    document.getElementById("episodeSelect").style.display = "none";
    document.getElementById("displayCount").textContent = "";
    renderCards(allShows, "show");
    populateShowDropdown(allShows);
    setupSearch(allShows, "show");
    updateDisplayCount(filtered.length, data.length, "show");
  };
}

// handle the show selection (fetch episodes, show controls, etc.)
async function handleShowSelect(showId) {
  // hide shows listing controls
  document.getElementById("showSelect").style.display = "none";
  document.getElementById("episodeSelect").style.display = "";
  showBackToShows();

  // Fetch episodes (cache)
  if (!episodesCache[showId]) {
    const response = await fetch(
      `https://api.tvmaze.com/shows/${showId}/episodes`
    );
    episodesCache[showId] = await response.json();
  }
  allEpisodes = episodesCache[showId];

  renderCards(allEpisodes, "episode");
  populateEpisodeDropdown(allEpisodes);
  setupEpisodeDropdown(allEpisodes);
  setupSearch(allEpisodes, "episode");
  updateDisplayCount(allEpisodes.length, allEpisodes.length, "episode");
}

// main setup function to initialize the page when it loads
async function setup() {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = `Loading TV Data...`;

  // fetch shows (cache)
  if (!allShows.length) {
    const response = await fetch("https://api.tvmaze.com/shows");
    allShows = await response.json();
    allShows.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }

  // hide episode controls initially
  document.getElementById("episodeSelect").style.display = "none";
  document.getElementById("displayCount").textContent = "";
  document.getElementById("navigation").innerHTML = "";

  populateShowDropdown(allShows);
  const showSelect = document.getElementById("showSelect");
  showSelect.addEventListener("change", () => {
    const selectedId = showSelect.value;
    if (selectedId) {
      handleShowSelect(selectedId);
    }
  });
  renderCards(allShows, "show");
  setupSearch(allShows, "show");
  updateDisplayCount(allShows.length, allShows.length, "show");
}

window.onload = setup;
