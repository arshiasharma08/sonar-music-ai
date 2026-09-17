/* ============================================================================
   SONAR · MUSIC INTELLIGENCE PLATFORM
   Interactive JavaScript
   ========================================================================== */

// ============================================================================
// STATE
// ============================================================================
const state = {
  currentSong: null,
  recommendations: [],
  moods: {},
  analytics: null,
  songs: []
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================
const elements = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  suggestions: document.querySelectorAll('.suggestion'),
  resultsList: document.getElementById('resultsList'),
  resultsSection: document.getElementById('resultsSection'),
  resultsCount: document.getElementById('resultsCount'),
  selectedSongCard: document.getElementById('selectedSongCard'),
  selectedSection: document.getElementById('selectedSection'),
  recommendationsList: document.getElementById('recommendationsList'),
  recommendationsSection: document.getElementById('recommendations'),
  moodsList: document.getElementById('moodsList'),
  song1Input: document.getElementById('song1Input'),
  song2Input: document.getElementById('song2Input'),
  compareBtn: document.getElementById('compareBtn'),
  comparisonResult: document.getElementById('comparisonResult'),
  comparisonCharts: document.getElementById('comparisonCharts'),
  navToggle: document.getElementById('navToggle'),
  navMenu: document.getElementById('navMenu'),
  exploreBtn: document.getElementById('exploreBtn'),
  analyticsBtn: document.getElementById('analyticsBtn')
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSearch();
  initSuggestions();
  loadMoods();
  loadAnalytics();
  setupScrollAnimation();
  setupButtonNavigation();
});

// ============================================================================
// NAVIGATION
// ============================================================================
function initNavigation() {
  // Mobile menu toggle
  elements.navToggle?.addEventListener('click', () => {
    elements.navMenu?.classList.toggle('active');
  });

  // Close mobile menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      elements.navMenu?.classList.remove('active');
    });
  });

  // Sticky header effect
  window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
      header?.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.3)';
    } else {
      header?.style.boxShadow = 'none';
    }
  });
}

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================
function initSearch() {
  elements.searchBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    performSearch();
  });

  elements.searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });
}

function performSearch() {
  const query = elements.searchInput?.value.trim();
  if (!query) return;

  fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
    .then(res => res.json())
    .then(data => {
      displaySearchResults(data.results || []);
      showSection('resultsSection');
      elements.searchInput.value = '';
    })
    .catch(err => console.error('Search error:', err));
}

function displaySearchResults(results) {
  if (results.length === 0) {
    elements.resultsList.innerHTML = '<p class="empty-state">No results found. Try another search.</p>';
    elements.resultsCount.textContent = '0 songs';
    return;
  }

  elements.resultsList.innerHTML = results.map((song, idx) => `
    <div class="song-card" data-song-id="${song.id}">
      <span class="song-rank">#${idx + 1}</span>
      <div class="song-title">${escapeHtml(song.title)}</div>
      <div class="song-artist">${escapeHtml(song.artist)}</div>
      <div class="song-features">
        ${createFeatureRow('Energy', song.energy)}
        ${createFeatureRow('Danceability', song.danceability)}
        ${createFeatureRow('Valence', song.valence)}
        ${createFeatureRow('Tempo', song.tempo, 'bpm')}
      </div>
    </div>
  `).join('');

  elements.resultsCount.textContent = `${results.length} song${results.length !== 1 ? 's' : ''}`;

  // Add click handlers
  document.querySelectorAll('.song-card').forEach(card => {
    card.addEventListener('click', () => {
      const songId = card.getAttribute('data-song-id');
      const song = results.find(s => s.id == songId);
      selectSong(song);
    });
  });
}

function createFeatureRow(label, value, unit = '') {
  const displayValue = typeof value === 'number' ? (value > 10 ? Math.round(value) : value.toFixed(2)) : value;
  const normalized = typeof value === 'number' && value <= 1 ? value : value / 100;
  const percentage = (normalized * 100).toFixed(0);
  
  return `
    <div class="feature-row">
      <span class="feature-label">${label}</span>
      <span class="feature-value">${displayValue}${unit}</span>
    </div>
  `;
}

// ============================================================================
// SONG SELECTION & DETAILS
// ============================================================================
function selectSong(song) {
  state.currentSong = song;
  displaySongDetails(song);
  loadRecommendations(song.id);
  showSection('selectedSection');
  smoothScroll('selectedSection');
}

function displaySongDetails(song) {
  const audioMetrics = [
    { name: 'Energy', value: song.energy, unit: '%' },
    { name: 'Danceability', value: song.danceability, unit: '%' },
    { name: 'Valence', value: song.valence, unit: '%' },
    { name: 'Acousticness', value: song.acousticness, unit: '%' },
    { name: 'Instrumentalness', value: song.instrumentalness, unit: '%' },
    { name: 'Tempo', value: song.tempo, unit: 'BPM' }
  ];

  elements.selectedSongCard.innerHTML = `
    <div class="song-header">
      <div class="song-name">${escapeHtml(song.title)}</div>
      <div class="song-meta">
        <span>Artist: ${escapeHtml(song.artist)}</span>
        <span>Popularity: ${song.popularity}/100</span>
      </div>
    </div>

    <div class="audio-profile">
      ${audioMetrics.map(metric => `
        <div class="audio-metric">
          <div class="metric-name">${metric.name}</div>
          <div class="metric-value">${metric.value}${metric.unit}</div>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${metric.value}%"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================
function loadRecommendations(songId) {
  fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_id: songId, count: 6 })
  })
    .then(res => res.json())
    .then(data => {
      state.recommendations = data.recommendations || [];
      displayRecommendations(state.recommendations);
      showSection('recommendations');
    })
    .catch(err => console.error('Recommendation error:', err));
}

function displayRecommendations(recommendations) {
  if (recommendations.length === 0) {
    elements.recommendationsList.innerHTML = '<p class="empty-state">No recommendations found.</p>';
    return;
  }

  elements.recommendationsList.innerHTML = recommendations.map((rec, idx) => `
    <div class="recommendation-card">
      <span class="recommendation-rank">Match #${idx + 1}</span>
      <div class="recommendation-title">${escapeHtml(rec.title)}</div>
      <div class="recommendation-artist">${escapeHtml(rec.artist)}</div>
      <div class="match-score">
        <span class="match-label">Similarity</span>
        <span class="match-value">${Math.round(rec.similarity * 100)}%</span>
      </div>
    </div>
  `).join('');
}

// ============================================================================
// MOODS
// ============================================================================
function loadMoods() {
  fetch('/api/moods')
    .then(res => res.json())
    .then(data => {
      state.moods = data.moods || {};
      displayMoods(state.moods);
    })
    .catch(err => console.error('Moods error:', err));
}

function displayMoods(moods) {
  elements.moodsList.innerHTML = Object.entries(moods).map(([mood, songs]) => `
    <div class="mood-card" data-mood="${mood}">
      <div class="mood-name">${mood}</div>
      <div class="mood-count">${songs.length} tracks</div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.mood-card').forEach(card => {
    card.addEventListener('click', () => {
      const mood = card.getAttribute('data-mood');
      const songs = state.moods[mood];
      displayMoodSongs(mood, songs);
    });
  });
}

function displayMoodSongs(mood, songs) {
  const moodDisplay = `
    <div class="mood-section">
      <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">${mood.toUpperCase()}</h3>
      <div class="results-grid">
        ${songs.map((song, idx) => `
          <div class="song-card" data-song-id="${song.id}">
            <span class="song-rank">#${idx + 1} in ${mood}</span>
            <div class="song-title">${escapeHtml(song.title)}</div>
            <div class="song-artist">${escapeHtml(song.artist)}</div>
            <div class="song-features">
              ${createFeatureRow('Energy', song.energy)}
              ${createFeatureRow('Danceability', song.danceability)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Replace moods section with songs
  const moodsSection = document.getElementById('moods');
  const temp = document.createElement('div');
  temp.innerHTML = moodDisplay;
  moodsSection.replaceChild(temp.firstElementChild, elements.moodsList);

  // Re-add click handlers
  document.querySelectorAll('.song-card').forEach(card => {
    card.addEventListener('click', () => {
      const songId = card.getAttribute('data-song-id');
      const song = songs.find(s => s.id == songId);
      if (song) selectSong(song);
    });
  });
}

// ============================================================================
// SONG COMPARISON
// ============================================================================
function initSongComparison() {
  elements.compareBtn?.addEventListener('click', performComparison);
  
  [elements.song1Input, elements.song2Input].forEach(input => {
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performComparison();
    });
  });
}

function performComparison() {
  const song1Query = elements.song1Input?.value.trim();
  const song2Query = elements.song2Input?.value.trim();

  if (!song1Query || !song2Query) {
    alert('Please enter both song titles');
    return;
  }

  // Search for both songs
  Promise.all([
    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: song1Query })
    }).then(res => res.json()),
    fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: song2Query })
    }).then(res => res.json())
  ])
    .then(([results1, results2]) => {
      const song1 = results1.results?.[0];
      const song2 = results2.results?.[0];

      if (!song1 || !song2) {
        alert('One or both songs not found');
        return;
      }

      displayComparison(song1, song2);
    })
    .catch(err => console.error('Comparison error:', err));
}

function displayComparison(song1, song2) {
  const metrics = ['energy', 'danceability', 'valence', 'tempo', 'acousticness', 'instrumentalness'];
  
  elements.song1Name.textContent = escapeHtml(song1.title);
  elements.song1Artist.textContent = escapeHtml(song1.artist);
  elements.song2Name.textContent = escapeHtml(song2.title);
  elements.song2Artist.textContent = escapeHtml(song2.artist);

  elements.comparisonCharts.innerHTML = metrics.map(metric => {
    const value1 = song1[metric] || 0;
    const value2 = song2[metric] || 0;
    const maxValue = metric === 'tempo' ? 200 : 100;
    const percent1 = (value1 / maxValue) * 100;
    const percent2 = (value2 / maxValue) * 100;
    const label = metric.charAt(0).toUpperCase() + metric.slice(1);

    return `
      <div class="comparison-row">
        <div class="comparison-label">${label}</div>
        <div class="comparison-bar-container">
          <div class="comparison-bar song1">
            <div class="comparison-fill" style="width: ${percent1}%"></div>
          </div>
          <span class="comparison-value">${value1}${metric === 'tempo' ? '' : '%'}</span>
        </div>
        <div class="comparison-bar-container">
          <div class="comparison-bar song2">
            <div class="comparison-fill" style="width: ${percent2}%"></div>
          </div>
          <span class="comparison-value">${value2}${metric === 'tempo' ? '' : '%'}</span>
        </div>
      </div>
    `;
  }).join('');

  elements.comparisonResult.classList.remove('hidden');
  showSection('compare');
  smoothScroll('compare');
}

// ============================================================================
// ANALYTICS
// ============================================================================
function loadAnalytics() {
  fetch('/api/analytics')
    .then(res => res.json())
    .then(data => {
      state.analytics = data;
      displayAnalytics(data);
    })
    .catch(err => console.error('Analytics error:', err));
}

function displayAnalytics(data) {
  const summary = data.summary || {};
  const distributions = data.distributions || {};
  const extremes = data.extremes || {};

  // Stats
  document.getElementById('statTotalSongs').textContent = summary.total_songs || '—';
  document.getElementById('statAvgEnergy').textContent = (summary.avg_energy || 0).toFixed(2);
  document.getElementById('statAvgDance').textContent = (summary.avg_danceability || 0).toFixed(2);
  document.getElementById('statAvgTempo').textContent = Math.round(summary.avg_tempo || 0);

  // Distributions
  const totalSongs = summary.total_songs || 1;
  
  const energy = distributions.energy || {};
  setDistributionBar('energyLow', energy.low || 0, totalSongs);
  setDistributionBar('energyMed', energy.medium || 0, totalSongs);
  setDistributionBar('energyHigh', energy.high || 0, totalSongs);
  document.getElementById('energyLowCount').textContent = energy.low || 0;
  document.getElementById('energyMedCount').textContent = energy.medium || 0;
  document.getElementById('energyHighCount').textContent = energy.high || 0;

  const tempo = distributions.tempo || {};
  setDistributionBar('tempoSlow', tempo.slow || 0, totalSongs);
  setDistributionBar('tempoMod', tempo.moderate || 0, totalSongs);
  setDistributionBar('tempoFast', tempo.fast || 0, totalSongs);
  document.getElementById('tempoSlowCount').textContent = tempo.slow || 0;
  document.getElementById('tempoModCount').textContent = tempo.moderate || 0;
  document.getElementById('tempoFastCount').textContent = tempo.fast || 0;

  // Extremes
  document.getElementById('extremeDanceable').textContent = extremes.most_danceable 
    ? `${escapeHtml(extremes.most_danceable.title)} • ${escapeHtml(extremes.most_danceable.artist)}`
    : '—';
  document.getElementById('extremeEnergy').textContent = extremes.highest_energy
    ? `${escapeHtml(extremes.highest_energy.title)} • ${escapeHtml(extremes.highest_energy.artist)}`
    : '—';
  document.getElementById('extremeFastest').textContent = extremes.fastest
    ? `${escapeHtml(extremes.fastest.title)} • ${escapeHtml(extremes.fastest.artist)}`
    : '—';
}

function setDistributionBar(elementId, count, total) {
  const bar = document.getElementById(elementId);
  const percentage = (count / total) * 100;
  if (bar) {
    bar.style.width = percentage + '%';
  }
}

// ============================================================================
// SUGGESTIONS
// ============================================================================
function initSuggestions() {
  elements.suggestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-query');
      elements.searchInput.value = query;
      performSearch();
    });
  });
}

// ============================================================================
// BUTTON NAVIGATION
// ============================================================================
function setupButtonNavigation() {
  elements.exploreBtn?.addEventListener('click', () => {
    smoothScroll('resultsSection');
  });

  elements.analyticsBtn?.addEventListener('click', () => {
    smoothScroll('analytics');
  });
}

// ============================================================================
// UI UTILITIES
// ============================================================================
function showSection(sectionId) {
  // Hide all sections except hero and moods
  document.querySelectorAll('.results-section, .discovery-section, .recommendations-section, .compare-section, .analytics-section').forEach(section => {
    if (section.id !== sectionId) {
      section.classList.add('hidden');
    }
  });

  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
}

function smoothScroll(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// SCROLL ANIMATIONS
// ============================================================================
function setupScrollAnimation() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, {
    threshold: 0.1
  });

  // Observe cards for fade-in
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.song-card, .recommendation-card, .mood-card, .stat-card').forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'all 0.5s ease-out';
      observer.observe(card);
    });
  });
}

// Initialize comparison handlers
initSongComparison();
