(() => {
  'use strict';

  const REGIONS = [
    { id: 'any',            label: '全世界' },
    { id: 'taiwan',         label: '台灣' },
    { id: 'east-asia',      label: '東亞' },
    { id: 'southeast-asia', label: '東南亞' },
    { id: 'south-asia',     label: '南亞' },
    { id: 'middle-east',    label: '中東' },
    { id: 'europe',         label: '歐洲' },
    { id: 'africa',         label: '非洲' },
    { id: 'north-america',  label: '北美' },
    { id: 'latin-america',  label: '中南美' },
    { id: 'oceania',        label: '大洋洲' }
  ];
  const TYPES = [
    { id: 'any',      label: '不限',     emoji: '🌐' },
    { id: 'city',     label: '城市',     emoji: '🏙' },
    { id: 'culture',  label: '人文古蹟', emoji: '🏛' },
    { id: 'nature',   label: '自然景觀', emoji: '🌳' },
    { id: 'mountain', label: '山岳',     emoji: '⛰' },
    { id: 'beach',    label: '海島海邊', emoji: '🏖' },
    { id: 'food',     label: '美食',     emoji: '🍜' }
  ];
  const TYPE_EMOJI = Object.fromEntries(TYPES.map(t => [t.id, t.emoji]));
  const REGION_LABEL = Object.fromEntries(REGIONS.map(r => [r.id, r.label]));
  const TYPE_LABEL = Object.fromEntries(TYPES.map(t => [t.id, t.label]));

  const STORAGE_FAV = 'wtg.favorites.v1';
  const STORAGE_FILTERS = 'wtg.filters.v1';
  const WIKI_CACHE = 'wtg.wikiCache.v1';
  const COUNTRY_CACHE = 'wtg.countryCache.v1';
  const ONBOARD_FLAG = 'wtg.onboardSeen.v1';

  const COUNTRIES_GEOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const TOPOJSON_CLIENT_URL = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

  const state = {
    destinations: [],
    filtered: [],
    filters: { region: 'any', type: 'any', distance: 'any' },
    userPos: null,
    current: null,
    favorites: loadFavorites(),
    wikiCache: loadWikiCache(),
    countryCache: loadCountryCache(),
    map: null,
    pinMarker: null,
    history: [],
    exploreMode: false,
    countriesLayer: null,
    selectedCountry: null,
    explorePool: null
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function loadFavorites() {
    try { return JSON.parse(localStorage.getItem(STORAGE_FAV)) || []; }
    catch { return []; }
  }
  function saveFavorites() {
    localStorage.setItem(STORAGE_FAV, JSON.stringify(state.favorites));
  }
  function loadWikiCache() {
    try { return JSON.parse(localStorage.getItem(WIKI_CACHE)) || {}; }
    catch { return {}; }
  }
  function saveWikiCache() {
    localStorage.setItem(WIKI_CACHE, JSON.stringify(state.wikiCache));
  }
  function loadCountryCache() {
    try { return JSON.parse(localStorage.getItem(COUNTRY_CACHE)) || {}; }
    catch { return {}; }
  }
  function saveCountryCache() {
    try {
      localStorage.setItem(COUNTRY_CACHE, JSON.stringify(state.countryCache));
    } catch {
      state.countryCache = {};
      localStorage.removeItem(COUNTRY_CACHE);
    }
  }
  function loadFilters() {
    try {
      const f = JSON.parse(localStorage.getItem(STORAGE_FILTERS));
      if (f && typeof f === 'object') Object.assign(state.filters, f);
    } catch {}
  }
  function saveFilters() {
    localStorage.setItem(STORAGE_FILTERS, JSON.stringify(state.filters));
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function applyFilters() {
    const { region, type, distance } = state.filters;
    const base = (state.exploreMode && state.explorePool) ? state.explorePool : state.destinations;
    state.filtered = base.filter(d => {
      if (!state.exploreMode && region !== 'any' && d.region !== region) return false;
      if (type !== 'any' && d.type !== type) return false;
      if (distance !== 'any' && state.userPos) {
        const km = haversineKm(state.userPos.lat, state.userPos.lon, d.lat, d.lon);
        if (km > Number(distance)) return false;
      }
      return true;
    });
    const countEl = $('#filter-count');
    if (countEl) {
      const prefix = state.exploreMode && state.selectedCountry ? `${state.selectedCountry.name}：` : '符合條件：';
      countEl.textContent = `${prefix}${state.filtered.length} 個地點`;
    }
  }

  function buildChips() {
    const regionWrap = $('#filter-region');
    regionWrap.innerHTML = '';
    REGIONS.forEach(r => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.dataset.region = r.id;
      b.textContent = r.label;
      b.setAttribute('aria-pressed', String(r.id === state.filters.region));
      b.addEventListener('click', () => {
        state.filters.region = r.id;
        $$('#filter-region .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.region === r.id)));
        applyFilters(); saveFilters();
      });
      regionWrap.appendChild(b);
    });

    const typeWrap = $('#filter-type');
    typeWrap.innerHTML = '';
    TYPES.forEach(t => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.dataset.type = t.id;
      b.textContent = `${t.emoji} ${t.label}`;
      b.setAttribute('aria-pressed', String(t.id === state.filters.type));
      b.addEventListener('click', () => {
        state.filters.type = t.id;
        $$('#filter-type .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.type === t.id)));
        applyFilters(); saveFilters();
      });
      typeWrap.appendChild(b);
    });

    $$('#filter-distance .chip').forEach(c => {
      c.setAttribute('aria-pressed', String(c.dataset.distance === state.filters.distance));
      c.addEventListener('click', async () => {
        const val = c.dataset.distance;
        if (val !== 'any' && !state.userPos) {
          const ok = await requestGeo();
          if (!ok) {
            toast('無法取得你的位置，距離篩選暫時失效');
            return;
          }
        }
        state.filters.distance = val;
        $$('#filter-distance .chip').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.distance === val)));
        applyFilters(); saveFilters();
      });
    });
  }

  function requestGeo() {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) { resolve(false); return; }
      navigator.geolocation.getCurrentPosition(
        pos => {
          state.userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          $('#geo-hint').textContent = `已取得位置（${state.userPos.lat.toFixed(2)}, ${state.userPos.lon.toFixed(2)}）`;
          resolve(true);
        },
        () => resolve(false),
        { timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  function initMap() {
    state.map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true,
      minZoom: 2
    }).setView([20, 30], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(state.map);

    L.control.zoom({ position: 'bottomright' }).addTo(state.map);
  }

  function pickRandom(list) {
    if (!list.length) return null;
    const recent = state.history.slice(-Math.min(5, list.length - 1));
    const candidates = list.filter(d => !recent.includes(d.id));
    const pool = candidates.length ? candidates : list;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async function throwDart() {
    if (!state.filtered.length) {
      toast('沒有符合條件的地點，試試放寬篩選');
      return;
    }
    const target = pickRandom(state.filtered);
    if (!target) return;

    hideResult();
    if (state.pinMarker) { state.map.removeLayer(state.pinMarker); state.pinMarker = null; }
    await delay(260);

    showOverlay(true);
    await spinTowards(target);
    showOverlay(false);

    state.history.push(target.id);
    state.current = target;
    await flyToAndPin(target);
    showResult(target);
  }

  function shortestLonDelta(fromLon, toLon) {
    let d = ((toLon - fromLon + 540) % 360) - 180;
    return d;
  }

  function spinTowards(target) {
    return new Promise(resolve => {
      const m = state.map;
      const start = m.getCenter();
      const dLon = shortestLonDelta(start.lng, target.lon);
      const dLat = target.lat - start.lat;

      const wayLat = start.lat + dLat * 0.45 + (Math.random() * 16 - 8);
      const wayLon = start.lng + dLon * 0.55;
      const previewLat = target.lat + (Math.random() * 14 - 7);
      const previewLon = target.lon + (Math.random() * 14 - 7);

      m.flyTo([wayLat, wayLon], 2, { duration: 0.7, easeLinearity: 0.4 });
      setTimeout(() => {
        m.flyTo([previewLat, previewLon], 3, { duration: 0.7, easeLinearity: 0.4 });
      }, 720);
      setTimeout(resolve, 1450);
    });
  }

  function flyToAndPin(d) {
    return new Promise(resolve => {
      if (state.pinMarker) state.map.removeLayer(state.pinMarker);
      state.map.flyTo([d.lat, d.lon], 6, { duration: 1.2 });

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        state.map.off('moveend', onEnd);
        const icon = L.divIcon({
          className: 'dest-pin-wrap',
          html: `<div class="dest-pin">${TYPE_EMOJI[d.type] || '📍'}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 36]
        });
        state.pinMarker = L.marker([d.lat, d.lon], { icon }).addTo(state.map);
        state.pinMarker.on('click', () => showResult(d));
        setTimeout(resolve, 380);
      };
      const onEnd = () => finish();
      state.map.on('moveend', onEnd);
      setTimeout(finish, 2000);
    });
  }

  function showResult(d) {
    const card = $('#result-card');
    card.classList.add('show');
    card.setAttribute('aria-hidden', 'false');

    $('#card-eyebrow').textContent = `${REGION_LABEL[d.region] || ''} · ${TYPE_LABEL[d.type] || ''}`;
    $('#card-title').textContent = d.name;
    $('#card-subtitle').textContent = `${d.country} · ${d.name_en}`;
    $('#card-extract').textContent = '載入介紹中…';

    const img = $('#card-image');
    img.innerHTML = `<span class="card-image-fallback">${TYPE_EMOJI[d.type] || '📍'}</span>`;

    const mapBtn = $('#btn-open-map');
    mapBtn.href = `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`;

    updateFavBtn(d);
    fetchWiki(d).then(info => {
      if (state.current?.id !== d.id) return;
      if (info?.extract) $('#card-extract').textContent = info.extract;
      if (info?.thumbnail) {
        const el = document.createElement('img');
        el.src = info.thumbnail;
        el.alt = d.name;
        el.loading = 'lazy';
        el.addEventListener('load', () => {
          img.innerHTML = '';
          img.appendChild(el);
        });
        el.addEventListener('error', () => {});
      }
    }).catch(() => {});
  }

  function hideResult() {
    $('#result-card').classList.remove('show');
    $('#result-card').setAttribute('aria-hidden', 'true');
  }

  async function fetchWiki(d) {
    const key = d.wiki || d.name;
    if (state.wikiCache[key]) return state.wikiCache[key];

    try {
      const url = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}?redirect=true`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('wiki ' + r.status);
      const j = await r.json();
      const info = {
        extract: j.extract || '',
        thumbnail: j.thumbnail?.source || j.originalimage?.source || ''
      };
      state.wikiCache[key] = info;
      saveWikiCache();
      return info;
    } catch {
      return { extract: '（離線或維基查無資料，先用內建資訊。）', thumbnail: '' };
    }
  }

  function isFav(id) { return state.favorites.some(f => f.id === id); }
  function toggleFav(d) {
    const i = state.favorites.findIndex(f => f.id === d.id);
    if (i >= 0) state.favorites.splice(i, 1);
    else state.favorites.unshift({ id: d.id, name: d.name, country: d.country, type: d.type, lat: d.lat, lon: d.lon, region: d.region });
    saveFavorites();
    updateFavBtn(d);
    renderFavorites();
    updateFavBadge();
  }
  function updateFavBtn(d) {
    const b = $('#btn-fav-toggle');
    if (isFav(d.id)) {
      b.textContent = '★ 已收藏';
      b.classList.add('fav-on');
    } else {
      b.textContent = '☆ 收藏';
      b.classList.remove('fav-on');
    }
  }
  function updateFavBadge() {
    const n = state.favorites.length;
    const badge = $('#fav-count');
    if (n) {
      badge.hidden = false;
      badge.textContent = String(n);
    } else {
      badge.hidden = true;
    }
  }
  function renderFavorites() {
    const list = $('#favorites-list');
    const empty = $('#favorites-empty');
    list.innerHTML = '';
    if (!state.favorites.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    state.favorites.forEach(f => {
      const li = document.createElement('li');
      li.className = 'fav-item';
      li.innerHTML = `
        <div class="fav-item-info">
          <div class="fav-item-name">${TYPE_EMOJI[f.type] || '📍'} ${escapeHtml(f.name)}</div>
          <div class="fav-item-meta">${escapeHtml(f.country)} · ${REGION_LABEL[f.region] || ''}</div>
        </div>
        <button class="fav-item-remove" aria-label="移除">✕</button>
      `;
      li.addEventListener('click', e => {
        if (e.target.classList.contains('fav-item-remove')) return;
        const full = state.destinations.find(x => x.id === f.id) || f;
        state.current = full;
        flyToAndPin(full);
        showResult(full);
        closePanels();
      });
      li.querySelector('.fav-item-remove').addEventListener('click', e => {
        e.stopPropagation();
        const full = state.destinations.find(x => x.id === f.id) || f;
        toggleFav(full);
      });
      list.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function showOverlay(on) {
    $('#dart-overlay').classList.toggle('show', on);
    $('#dart-overlay').setAttribute('aria-hidden', String(!on));
  }
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  function openPanel(id) {
    closePanels();
    const p = document.getElementById(id);
    p.classList.add('open');
    p.setAttribute('aria-hidden', 'false');
  }
  function closePanels() {
    $$('.panel').forEach(p => {
      p.classList.remove('open');
      p.setAttribute('aria-hidden', 'true');
    });
  }

  async function shareCurrent() {
    if (!state.current) return;
    const d = state.current;
    const text = `來去「${d.name} (${d.country})」吧！`;
    const url = `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`;
    if (navigator.share) {
      try { await navigator.share({ title: d.name, text, url }); return; }
      catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast('已複製到剪貼簿');
    } catch {
      toast('分享失敗');
    }
  }

  function bindEvents() {
    $('#btn-throw').addEventListener('click', throwDart);
    $('#btn-throw-again').addEventListener('click', throwDart);
    $('#btn-close-card').addEventListener('click', hideResult);
    $('#btn-fav-toggle').addEventListener('click', () => state.current && toggleFav(state.current));
    $('#btn-share').addEventListener('click', shareCurrent);

    $('#btn-filters').addEventListener('click', () => openPanel('filter-panel'));
    $('#btn-favorites').addEventListener('click', () => { renderFavorites(); openPanel('favorites-panel'); });
    $('#btn-explore').addEventListener('click', () => {
      if (state.exploreMode) exitExploreMode();
      else enterExploreMode();
    });
    $('#btn-exit-explore').addEventListener('click', exitExploreMode);
    $('#btn-onboard-close').addEventListener('click', dismissOnboard);
    $$('[data-close-panel]').forEach(b => b.addEventListener('click', closePanels));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closePanels(); hideResult(); }
      if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement === document.body) { e.preventDefault(); throwDart(); }
      }
    });
  }

  async function loadDestinations() {
    const r = await fetch('./data/destinations.json?v=6');
    if (!r.ok) throw new Error('destinations load failed');
    state.destinations = await r.json();
  }

  // --- Explore mode: country boundaries + Overpass ---

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('load fail: ' + url));
      document.head.appendChild(s);
    });
  }

  let countriesGeoPromise = null;
  function loadCountriesGeo() {
    if (countriesGeoPromise) return countriesGeoPromise;
    countriesGeoPromise = (async () => {
      if (typeof window.topojson === 'undefined') {
        await loadScript(TOPOJSON_CLIENT_URL);
      }
      const r = await fetch(COUNTRIES_GEOJSON_URL);
      if (!r.ok) throw new Error('countries geo failed');
      const topo = await r.json();
      const obj = topo.objects.countries;
      return window.topojson.feature(topo, obj);
    })();
    return countriesGeoPromise;
  }

  async function enterExploreMode() {
    if (state.exploreMode) return;
    toast('載入國家邊界中…');
    try {
      const geo = await loadCountriesGeo();
      state.exploreMode = true;
      $('#btn-explore').classList.add('active');
      $('#explore-banner').hidden = false;

      state.countriesLayer = L.geoJSON(geo, {
        style: () => ({
          fillColor: '#38bdf8',
          fillOpacity: 0.05,
          color: 'rgba(255,255,255,0.18)',
          weight: 0.6
        }),
        onEachFeature: (feature, layer) => {
          layer.on({
            mouseover: () => {
              if (state.selectedCountry?.layer === layer) return;
              layer.setStyle({ fillOpacity: 0.18, weight: 1.2, color: 'rgba(56,189,248,0.7)' });
            },
            mouseout: () => {
              if (state.selectedCountry?.layer === layer) return;
              state.countriesLayer.resetStyle(layer);
            },
            click: () => selectCountry(feature, layer)
          });
        }
      }).addTo(state.map);

      $('#explore-banner-text').textContent = '點擊地圖上的國家，從該國抓即時景點';
      toast('探索模式已啟用：點選任一國家');
    } catch (e) {
      toast('載入國家邊界失敗，請檢查網路');
    }
  }

  function exitExploreMode() {
    if (!state.exploreMode) return;
    state.exploreMode = false;
    state.selectedCountry = null;
    state.explorePool = null;
    if (state.countriesLayer) {
      state.map.removeLayer(state.countriesLayer);
      state.countriesLayer = null;
    }
    $('#btn-explore').classList.remove('active');
    $('#explore-banner').hidden = true;
    applyFilters();
  }

  async function selectCountry(feature, layer) {
    if (state.selectedCountry?.layer) {
      state.countriesLayer.resetStyle(state.selectedCountry.layer);
    }
    layer.setStyle({
      fillColor: '#38bdf8',
      fillOpacity: 0.32,
      color: '#38bdf8',
      weight: 2.2
    });
    const name = feature.properties.name || '此國家';
    state.selectedCountry = { feature, layer, name };

    state.map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 6 });

    $('#explore-banner-text').textContent = `${name} · 抓取景點中…`;
    toast(`正在抓取 ${name} 的景點…`);
    try {
      const pool = await fetchCountrySpots(feature, name);
      if (!pool.length) {
        $('#explore-banner-text').textContent = `${name} · 沒抓到景點，可關閉探索後再試`;
        toast('該國沒抓到景點，可改換其他國家');
        state.explorePool = null;
        return;
      }
      state.explorePool = pool;
      applyFilters();
      $('#explore-banner-text').textContent = `${name} · ${pool.length} 個景點，按下方按鈕射飛鏢`;
      toast(`抓到 ${pool.length} 個景點，可以射飛鏢了`);
    } catch (e) {
      $('#explore-banner-text').textContent = `${name} · 抓取失敗，請再試一次`;
      toast('抓取失敗，可能 Overpass 太忙了');
    }
  }

  function bboxOfFeature(feature) {
    let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
    const visit = (coords) => {
      if (typeof coords[0] === 'number') {
        const [lon, lat] = coords;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      } else {
        for (const c of coords) visit(c);
      }
    };
    visit(feature.geometry.coordinates);
    return { minLat, minLon, maxLat, maxLon };
  }

  async function fetchCountrySpots(feature, name) {
    const cacheKey = String(feature.id || name);
    const cached = state.countryCache[cacheKey];
    const ONE_DAY = 24 * 3600 * 1000;
    if (cached && (Date.now() - cached.t) < 7 * ONE_DAY) {
      return cached.pool;
    }

    const bb = bboxOfFeature(feature);
    // Cross-antimeridian feature: split is rare; pad slightly
    const bbox = `${bb.minLat.toFixed(3)},${bb.minLon.toFixed(3)},${bb.maxLat.toFixed(3)},${bb.maxLon.toFixed(3)}`;

    const query = `
      [out:json][timeout:30];
      (
        node["tourism"~"^(attraction|viewpoint|theme_park|zoo|museum|aquarium)$"](${bbox});
        node["historic"~"^(castle|monument|memorial|ruins|archaeological_site|fort|monastery)$"](${bbox});
        node["natural"~"^(peak|volcano|waterfall|beach|hot_spring|cape)$"](${bbox});
        node["leisure"="nature_reserve"](${bbox});
      );
      out center 250;
    `;
    const r = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query)
    });
    if (!r.ok) throw new Error('overpass ' + r.status);
    const j = await r.json();

    const pool = [];
    const seen = new Set();
    for (const el of j.elements || []) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;
      const tags = el.tags || {};
      const dispName = tags['name:zh'] || tags['name:zh-Hant'] || tags['name:zh-Hans'] || tags['name:en'] || tags.name;
      if (!dispName) continue;

      const key = dispName + '@' + lat.toFixed(3) + ',' + lon.toFixed(3);
      if (seen.has(key)) continue;
      seen.add(key);

      let type = 'culture';
      if (tags.natural === 'peak' || tags.natural === 'volcano') type = 'mountain';
      else if (tags.natural === 'beach' || tags.natural === 'cape') type = 'beach';
      else if (tags.natural || tags.leisure === 'nature_reserve' || tags.tourism === 'viewpoint') type = 'nature';
      else if (tags.tourism === 'museum' || tags.tourism === 'theme_park' || tags.tourism === 'zoo' || tags.tourism === 'aquarium') type = 'culture';
      else if (tags.historic) type = 'culture';

      pool.push({
        id: 'osm-' + el.id,
        name: dispName,
        name_en: tags['name:en'] || tags.name || dispName,
        country: name,
        region: 'any',
        type,
        lat, lon,
        wiki: tags['wikipedia']?.replace(/^[a-z]+:/, '') || tags['name:zh'] || tags['name:en'] || tags.name
      });
    }

    state.countryCache[cacheKey] = { t: Date.now(), pool };
    saveCountryCache();
    return pool;
  }

  function maybeShowOnboard() {
    if (localStorage.getItem(ONBOARD_FLAG)) return;
    setTimeout(() => {
      $('#onboard-tip').hidden = false;
      $('#btn-explore').classList.add('onboard-glow');
    }, 700);
  }
  function dismissOnboard() {
    $('#onboard-tip').hidden = true;
    $('#btn-explore').classList.remove('onboard-glow');
    localStorage.setItem(ONBOARD_FLAG, '1');
  }

  async function init() {
    loadFilters();
    initMap();
    bindEvents();
    buildChips();
    updateFavBadge();
    try {
      await loadDestinations();
    } catch (e) {
      toast('載入景點清單失敗，請檢查網路');
      return;
    }
    applyFilters();
    maybeShowOnboard();
  }

  // 探索按鈕被按到，也算看過引導
  document.addEventListener('click', e => {
    if (e.target.closest('#btn-explore')) dismissOnboard();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
