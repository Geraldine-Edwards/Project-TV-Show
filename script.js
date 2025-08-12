// Caches to avoid fetching shows/episodes twice
const showsCache = {};
const episodesCache = {};

// set up the initial variable states when page loads
let allShows = [];
let allEpisodes = [];
let currentShowName = "";

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
  return `${stripHTML(ep.name)} (S${zeroPad(ep.season)}E${zeroPad(ep.number)})`;
}

// helper function to sanitize HTML content into plain text to prevent XSS attacks
function stripHTML(html) {
  // if the html is empty, return an empty string to prevent errors
  if (!html) return "";
  // create a temporary div to use the browser's HTML parser
  const div = document.createElement("div");
  // set the text content of the div to the HTML string
  div.textContent = html;
  // return the innerHTML of the div, which will be safe
  return div.innerHTML;
}

// helper function to sanitize HTML while preserving content formatting
function sanitizeHTML(html) {
  // if the html is empty, return an empty string to prevent errors
  if (!html) return "";
  // create a temporary div to use the browser's HTML parser
  const temp = document.createElement("div");
  // set the text content of the div to the HTML string
  temp.innerHTML = html;

  // access the HTML in the temporary div to remove all dangerous elements to prevent XSS (using the "*" selector)
  const allElements = temp.querySelectorAll("*");
  // loop through all elements and if the tag is one of the dangerous ones, remove it
  allElements.forEach((el) => {
    if (
      [
        "SCRIPT",
        "STYLE",
        "IFRAME",
        "OBJECT",
        "EMBED",
        "FORM",
        "INPUT",
        "BUTTON",
        "LINK",
        "META",
      ].includes(el.tagName)
    ) {
      el.remove();
    } else {
      // otherwise check all attributes of the element (using a spread operator to convert to an array)
      [...el.attributes].forEach((attr) => {
        // remove any attributes that start with "on" (like onclick, onload, etc.), or href attributes that start with "javascript:"
        if (
          // onclick, onload ,etc
          attr.name.startsWith("on") ||
          // javascript: links
          (attr.name === "href" && attr.value.startsWith("javascript:")) ||
          // src attributes that start with "javascript:"
          (attr.name === "src" && attr.value.startsWith("javascript:")) ||
          // CSS injection
          attr.name === "style" ||
          // HTML injection
          attr.name === "srcdoc" ||
          // iframe 'sandboxing'
          attr.name === "sandbox" ||
          // form hijacking
          attr.name === "formaction" ||
          // data URIs
          (attr.name === "data" && attr.value.startsWith("data:"))
        ) {
          // use the removeAttribute method to remove the particular attribute
          el.removeAttribute(attr.name);
        }
      });
    }
  });
  // return the innerHTML of the temporary div, which will be safe
  return temp.innerHTML;
}

// helper function to sanitize image URLs
function sanitizeImageUrl(url) {
  // if there is no URL, return a placeholder image
  if (!url)
    return "https://placehold.co/210x295/333/fff?text=No+Image+Available";
  try {
    // create a new URL object to validate the URL
    new URL(url);
    // if the URL is valid, check if it starts with "http" or "https"
    return url.startsWith("http") ? url : "";
  } catch {
    // if the URL is invalid, return a placeholder image
    return "https://placehold.co/210x295/333/fff?text=No+Image+Available";
  }
}

// helper function to create the show card
function createShowCard(show) {
  const card = document.createElement("section");
  card.className = "show-card";
  card.innerHTML = `
     <h3 class="show-title">${stripHTML(show.name)}</h3>
  <img class="show-image" src="${sanitizeImageUrl(show.image?.medium)}" alt="${stripHTML(show.name)}">
  <p class="show-genres"><strong>Genres:</strong> ${stripHTML(show.genres.join(", "))}</p>
  <p class="show-status"><strong>Status:</strong> ${stripHTML(show.status)}</p>
  <p class="show-rating"><strong>Rating:</strong> ${stripHTML(show.rating?.average || "N/A")}</p>
  <p class="show-runtime"><strong>Runtime:</strong> ${stripHTML(show.runtime)} min</p>
  <p class="show-summary">${sanitizeHTML(show.summary)}</p> 
`;
  //  click the show card to view the episodes of the show
  card.addEventListener("click", () => handleShowSelect(show.id));
  return card;
}

// For the episode list (grid)
function createEpisodesCards(ep) {
  const card = document.createElement("section");
  card.className = "episode-card";
  card.innerHTML = `
    <img class="episode-image" src="${sanitizeImageUrl(ep.image?.medium)}" alt="${stripHTML(ep.name)}">
    <h3 class="episode-title">${stripHTML(ep.name)} - S${zeroPad(ep.season)}E${zeroPad(ep.number)}</h3>
    <p class="episode-summary">${sanitizeHTML(ep.summary)}</p>
  `;
  card.addEventListener("click", () => {
    // when episode is clicked, render the single episode view
    renderCards([ep], "single-episode");
    // update the count display and pass in "1" (the current episode), number of eps and the type "episode"
    updateDisplayCount(1, allEpisodes.length, "episode");
    // show the "Back to Shows" button
    showBackToShows();
  });
  return card;
}

// For the individual episodes grid view
function createSingleEpisodeCard(ep) {
  const card = document.createElement("section");
  card.className = "episode-card single-episode-card";
  card.innerHTML = `
    <div class="episode-card-flex">
      <img class="episode-image" src="${sanitizeImageUrl(ep.image?.medium)}" alt="${stripHTML(ep.name)}">
      <div class="episode-info">
        <h3 class="episode-title">${stripHTML(ep.name)} - S${zeroPad(ep.season)}E${zeroPad(ep.number)}</h3>
        <p class="episode-summary">${sanitizeHTML(ep.summary)}</p>
      </div>
    </div>
  `;
  return card;
}

// function to render the cards for shows or episodes
function renderCards(data, type) {
  const rootElem = document.getElementById("root");
  clearElement(rootElem);
  // if the card type is either for a show or an episode, use the appropriate template
  let cardTemplate;
  // for the page of "shows"
  if (type === "show") {
    cardTemplate = createShowCard;
    //  for the page of episodes
  } else if (type === "episode") {
    cardTemplate = createEpisodesCards;
    // for the single episode page
  } else if (type === "single-episode") {
    cardTemplate = createSingleEpisodeCard;
  }
  // call the CardTemplate function for each item in the data array
  const cards = data.map(cardTemplate);
  // append the created cards to the root element
  rootElem.append(...cards);
}

// Populates the show dropdown with all shows
function populateShowDropdown(shows) {
  // get the select element by its ID
  const select = document.getElementById("showSelect");
  // clear the select element using the helper function
  clearElement(select);
  // create the default option in the dropdown
  select.innerHTML = `<option value="">Select a show...</option>`;
  // loop through the shows array and create a dropdown option with each show
  shows.forEach((show) => {
    const option = document.createElement("option");
    option.value = show.id;
    option.textContent = show.name;
    select.appendChild(option);
  });
}

// Populates the episode dropdown with episodes from the selected show
function populateEpisodeDropdown(episodes) {
  // clear the episode select element
  const select = document.getElementById("episodeSelect");
  // clear the select element using the helper function
  clearElement(select);
  // create the default option in the dropdown
  select.innerHTML = `<option value="all">All Episodes</option>`;
  // loop through the episodes array and create a dropdown option with each episode
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
  // get the episode select element by its ID
  const select = document.getElementById("episodeSelect");
  // listen for the change event on the select element
  select.addEventListener("change", () => {
    // get the selected value from the dropdown
    const value = select.value;
    // get the display count element
    const countElem = document.getElementById("displayCount");
    // if the value is "all", render all episodes and update the count
    if (value === "all") {
      renderCards(episodes, "episode");
      // update the count to show all episodes
      updateDisplayCount(episodes.length, episodes.length, "episode");
    } else {
      // otherwise, find the selected episode by its ID and render it
      const selected = episodes.find((ep) => ep.id === Number(value));
      renderCards([selected], "single-episode");
      // set the count to "1" (the current episode) and the total number of episodes
      updateDisplayCount(1, episodes.length, "episode");
      // render the button to go back to the shows
      showBackToShows();
    }
  });
}

// helper function to update the episode count display
function updateDisplayCount(displayed, total, type) {
  const countElem = document.getElementById("displayCount");
  // if the type is "show", set the text content to show the number of shows displayed and total
  const showOrEpisodeType = type === "show" ? "shows" : "episodes";
  // update the count element with the number of displayed and total shows/episodes
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
  // listen for the input event on the search input
  input.addEventListener("input", () => {
    // get the query from the input and convert it to lowercase for case-insensitive search
    const query = input.value.toLowerCase();
    // set the filtered variable to hold the filtered results
    let filtered;
    // if the type is "show", filter the shows data based on the queries by matching words in the name, genres, or summary
    if (type === "show") {
      filtered = data.filter(
        (show) =>
          // covert the show name, genres, and summary to lowercase and check if they include the query
          show.name.toLowerCase().includes(query) ||
          show.genres.join(" ").toLowerCase().includes(query) ||
          (show.summary && show.summary.toLowerCase().includes(query))
      );
      // if no shows match the query, show a "no matches" message
      if (filtered.length === 0) {
        showNoMatches("show");
        // update the count to match no shows
        updateDisplayCount(0, data.length, "show");
      } else {
        // otherwise, render the filtered shows and update the count
        renderCards(filtered, "show");
        // pass in the length of the filtered shows, total shows, and type "show"
        updateDisplayCount(filtered.length, data.length, "show");
      }
    } else {
      // otherwise if the type is "episode", filter the episodes data based on the queries by matching words in the name or summary the the same ways as shows
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
  // get the nav elemet
  const nav = document.getElementById("navigation");
  // set the text of the button element
  nav.innerHTML = `<button id="backToShowsBtn">Back to Shows</button>`;
  // listen for the click event on the button
  document.getElementById("backToShowsBtn").onclick = () => {
    // clear the navigation element
    nav.innerHTML = "";
    // set the style of the display to none
    document.getElementById("showSelect").style.display = "";
    document.getElementById("episodeSelect").style.display = "none";
    document.getElementById("displayCount").textContent = "";
    document.getElementById("showTitle").textContent = "";
    // render the cards, populate the dropdown, set up the search bar for shows and update the display
    renderCards(allShows, "show");
    populateShowDropdown(allShows);
    setupSearch(allShows, "show");
    updateDisplayCount(allShows.length, allShows.length, "show");
  };
}

// add "Back to All Episodes" link when viewing a single episode
function showBackToEpisodes() {
  // get the nav element
  const nav = document.getElementById("navigation");
  // set the text of the button element
  nav.innerHTML = `<button id="backToEpisodesBtn">Back to All Episodes</button>`;
  // listen for the click event on the button
  document.getElementById("backToEpisodesBtn").onclick = () => {
    // set the stye of the display to none
    nav.innerHTML = "";
    // then render the episodes cards and update the display count
    renderCards(allEpisodes, "episode");
    updateDisplayCount(allEpisodes.length, allEpisodes.length, "episode");
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
    try {
      // fetch the episodes from the TVmaze API
      const response = await fetch(
        `https://api.tvmaze.com/shows/${showId}/episodes`
      );
      // check if the response is ok (status in the range 200-299)
      if (!response.ok) {
        // if not, throw an error with the status code
        throw new Error(
          `HTTP Error! Failed to fetch episodes. Status: ${response.status}`
        );
      }
      // parse the response as a JSON and assign it to the episodesCache for the showId
      episodesCache[showId] = await response.json();
    } catch (error) {
      console.error("Error fetching episodes:", error);
      // log a message in the root element
      const rootElem = document.getElementById("root");
      rootElem.innerHTML = `<p>Error loading episodes. Please try again later.</p>`;
      return;
    }
  }
  // cache the episodes
  allEpisodes = episodesCache[showId];
  // get the show name for the display by finding the show in the allShows array
  const selectedShow = allShows.find((show) => show.id === Number(showId));
  //  if the show is not found, set the name to "Unknown Show" otherwise set it to then name of the show
  const currentShowName = selectedShow ? selectedShow.name : "Unknown Show";
  // render the episodes in the root element
  renderCards(allEpisodes, "episode");
  // populate the episode dropdown with all episodes of the selected show
  populateEpisodeDropdown(allEpisodes);
  // set the dropdown to show all episodes
  setupEpisodeDropdown(allEpisodes);
  // set the search input to filter episodes
  setupSearch(allEpisodes, "episode");
  // update the display count for episodes
  updateDisplayCount(allEpisodes.length, allEpisodes.length, "episode");
  // update the show title display
  document.getElementById("showTitle").textContent = currentShowName;
}

// main setup function to initialize the page when it loads
async function setup() {
  const rootElem = document.getElementById("root");
  // display a loading message while fetching shows
  rootElem.innerHTML = `Loading TV Data...`;

  // fetch shows (cache) using an try/catch block to handle HTTP and network errors
  if (!allShows.length) {
    try {
      // fetch the shows from the TVmaze API
      const response = await fetch("https://api.tvmaze.com/shows");
      // check if the response is ok (status in the range 200-299)
      if (!response.ok) {
        // if not, throw an error with the status code
        throw new Error(
          `HTTP Error! Failed to fetch shows. Status: ${response.status}`
        );
      }
      // parse the response as JSON and assign it to the allShows variable
      allShows = await response.json();
    } catch (error) {
      // if an error occurs (network error, HTTP error, etc.), log the error and display a message
      console.error("Error fetching shows:", error);
      rootElem.innerHTML = `<p>Error loading shows. Please try again later.</p>`;
      return;
    }
    // sort the shows alphabetically by name
    allShows.sort((a, b) =>
      // use localeCompare to sort by name, ignoring case sensitivity ("base" sensitivity)
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }

  // hide episode controls initially
  document.getElementById("episodeSelect").style.display = "none";
  document.getElementById("displayCount").textContent = "";
  document.getElementById("navigation").innerHTML = "";
  // populate the show dropdown with all shows
  populateShowDropdown(allShows);
  // set up the show select dropdown to handle show selection
  const showSelect = document.getElementById("showSelect");
  // add an event listener to the show select dropdown to handle show selection
  showSelect.addEventListener("change", () => {
    // if the selected value is not empty, handle the show selection
    const selectedId = showSelect.value;
    // if the selectedId is not empty, call handleShowSelect with the selectedId
    if (selectedId) {
      handleShowSelect(selectedId);
    }
  });
  // render the shows in the root element
  renderCards(allShows, "show");
  // set up the search input to filter shows
  setupSearch(allShows, "show");
  // update the display count for shows
  updateDisplayCount(allShows.length, allShows.length, "show");
}

window.onload = setup;
