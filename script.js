const episodesCache = {};
// Cache to avoid fetching episodes twice
let allEpisodes = []; 
async function setup() {
  // access the root element and display loading message
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = `Loading episodes...`;

  // use promise to fetch episodes from the TVMaze API
  // and handle errors gracefully
    await setupShowDropdown(); // Fetch and setup show dropdown
    const defaultShowId = 82;
    document.getElementById("showSelect").value = defaultShowId;


  try {
    // fetch episodes from the TVMaze API
    const response = await fetch(`https://api.tvmaze.com/shows/${defaultShowId}/episodes`);
    // check if the response is ok
    const episodes = await response.json();
    // check if the response contains episodes
    episodesCache[defaultShowId] = episodes;

    allEpisodes = episodes;
    // call the remaining functions to set up the page
    populateEpisodeDropdown(allEpisodes);
    setupEpisodeDropdown(allEpisodes);
    setupSearch(allEpisodes);
    makePageForEpisodes(allEpisodes);
  } catch (error) {
    // handle any errors that occur during the fetch
    rootElem.innerHTML = `Sorry, we couldn't load the episodes. Please try again later.`;
  }
}
async function setupShowDropdown() {
  const showSelect = document.getElementById("showSelect");
  const rootElem = document.getElementById("root");

  try {
    const response = await fetch("https://api.tvmaze.com/shows");
    const shows = await response.json();

    // Sort alphabetically (case-insensitive)
    shows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    // Clear loading text
    showSelect.innerHTML = `<option value="">Select a show...</option>`;

    for (const show of shows) {
      const option = document.createElement("option");
      option.value = show.id;
      option.textContent = show.name;
      showSelect.appendChild(option);
    }

    // Listen for changes
    showSelect.addEventListener("change", async () => {
      const selectedId = showSelect.value;

      if (!selectedId) return;
      const rootElem = document.getElementById("root");
      rootElem.innerHTML = `Loading episodes...`;
      document.getElementById("searchInput").value = "";

      if (!episodesCache[selectedId]) {
        const response = await fetch(`https://api.tvmaze.com/shows/${selectedId}/episodes`);
        const episodes = await response.json();
        episodesCache[selectedId] = episodes;
      }

      allEpisodes = episodesCache[selectedId]; // Update global

      populateEpisodeDropdown(allEpisodes);
      setupEpisodeDropdown(allEpisodes);
      setupSearch(allEpisodes);
      makePageForEpisodes(allEpisodes);
    });

  } catch (error) {
    rootElem.innerHTML = "Sorry, we couldn't load the shows.";
  }
}


function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  const countElem = document.getElementById("episodeCount");
  countElem.textContent = `Displaying ${episodeList.length} / ${allEpisodes.length} episodes`;

  function episodeCard({ name, season, number, image, summary }) {
    const card = document.createElement("section");
    card.innerHTML = `
      <h3 class="episode-name">${name} - S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}</h3>
      <img class="episode-image" src="${image.medium}" alt="${name}">
      <p class="episode-summary">${summary}</p>
    `;
    return card;
  }

  const episodeCards = episodeList.map(episodeCard);
  rootElem.append(...episodeCards);

  const footer = document.createElement("footer");
  footer.innerHTML = `
    <p>Episode data provided by <a href="https://www.tvmaze.com" target="_blank">TVMaze.com</a></p>
  `;
  rootElem.appendChild(footer);
}

function populateEpisodeDropdown(episodes){
  const select = document.getElementById("episodeSelect");
  episodes.forEach((ep) => {
    const option = document.createElement("option");
    const code = `S${zeroPad(ep.season)}E${zeroPad(ep.number)}`;
    option.value = ep.id;
    option.textContent = `${code} - ${ep.name}`;
    select.appendChild(option);
  });
}

function setupEpisodeDropdown(episodes) {
  const select = document.getElementById("episodeSelect");
  select.addEventListener("change", () => {
    const value = select.value;
    if (value === "all") {
      makePageForEpisodes(allEpisodes);
    } else {
      const selected = episodes.find((ep) => ep.id === Number(value));
      makePageForEpisodes([selected]);
    }
  });
}

function setupSearch(episodes) {
  const input = document.getElementById("searchInput");
  input.addEventListener("input", () => {
    const query = input.value.toLowerCase();
    const filtered = episodes.filter((ep) => {
      return (
        ep.name.toLowerCase().includes(query) ||
        ep.summary.toLowerCase().includes(query)
      );
    });
    makePageForEpisodes(filtered);
  });
}

function zeroPad(num) {
  return String(num).padStart(2, "0");
}

window.onload = setup;
