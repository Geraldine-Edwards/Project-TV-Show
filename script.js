//You can edit ALL of the code here
function setup() {
  const allEpisodes = getAllEpisodes();
  makePageForEpisodes(allEpisodes);
}

function makePageForEpisodes(episodeList) {
  // access the element with ID of "root" in the HTML
  const rootElem = document.getElementById("root");

  // create a card for each episode
  function episodeCard({ name, season, number, image, summary }) {
    //create a section element as the card container
    const card = document.createElement("section");
    card.innerHTML = `
      <h3 class="episode-name">${name} - ${String(season).padStart(
      2,
      "0"
    )}E${String(number).padStart(2, "0")}</h3>
      <img class="episode-image" src="${image.medium}" alt="${name}">
      <p class="episode-summary">${summary}</p>
    `;
    return card;
  }

  // iterate through the array of episode objects using the map method
  const episodeCards = episodeList.map((episode) => {
    return episodeCard(episode);
  });

  rootElem.append(...episodeCards); // append all episode cards to the root element

  // Add attribution footer
  const footer = document.createElement("footer");
  footer.innerHTML = `
      <p>Episode data provided by <a href="https://www.tvmaze.com" target="_blank">TVMaze.com</a></p>
    `;
  rootElem.appendChild(footer);
}

window.onload = setup;
