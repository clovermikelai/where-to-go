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
  const OVERPASS_URLS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];

  // ISO 3166-1 numeric -> { zh: 中文名, region: 區域 id, iso2: alpha-2 (用於 Overpass area query) }
  const COUNTRY_INFO = {
    '158':{zh:'台灣',region:'taiwan',iso2:'TW'},
    '392':{zh:'日本',region:'east-asia',iso2:'JP'},
    '410':{zh:'南韓',region:'east-asia',iso2:'KR'},
    '408':{zh:'北韓',region:'east-asia',iso2:'KP'},
    '156':{zh:'中國',region:'east-asia',iso2:'CN'},
    '344':{zh:'香港',region:'east-asia',iso2:'HK'},
    '446':{zh:'澳門',region:'east-asia',iso2:'MO'},
    '496':{zh:'蒙古',region:'east-asia',iso2:'MN'},
    '764':{zh:'泰國',region:'southeast-asia',iso2:'TH'},
    '704':{zh:'越南',region:'southeast-asia',iso2:'VN'},
    '116':{zh:'柬埔寨',region:'southeast-asia',iso2:'KH'},
    '418':{zh:'寮國',region:'southeast-asia',iso2:'LA'},
    '104':{zh:'緬甸',region:'southeast-asia',iso2:'MM'},
    '702':{zh:'新加坡',region:'southeast-asia',iso2:'SG'},
    '458':{zh:'馬來西亞',region:'southeast-asia',iso2:'MY'},
    '360':{zh:'印尼',region:'southeast-asia',iso2:'ID'},
    '608':{zh:'菲律賓',region:'southeast-asia',iso2:'PH'},
    '096':{zh:'汶萊',region:'southeast-asia',iso2:'BN'},
    '626':{zh:'東帝汶',region:'southeast-asia',iso2:'TL'},
    '356':{zh:'印度',region:'south-asia',iso2:'IN'},
    '524':{zh:'尼泊爾',region:'south-asia',iso2:'NP'},
    '064':{zh:'不丹',region:'south-asia',iso2:'BT'},
    '050':{zh:'孟加拉',region:'south-asia',iso2:'BD'},
    '144':{zh:'斯里蘭卡',region:'south-asia',iso2:'LK'},
    '462':{zh:'馬爾地夫',region:'south-asia',iso2:'MV'},
    '586':{zh:'巴基斯坦',region:'south-asia',iso2:'PK'},
    '004':{zh:'阿富汗',region:'south-asia',iso2:'AF'},
    '784':{zh:'阿聯',region:'middle-east',iso2:'AE'},
    '792':{zh:'土耳其',region:'middle-east',iso2:'TR'},
    '376':{zh:'以色列',region:'middle-east',iso2:'IL'},
    '400':{zh:'約旦',region:'middle-east',iso2:'JO'},
    '275':{zh:'巴勒斯坦',region:'middle-east',iso2:'PS'},
    '422':{zh:'黎巴嫩',region:'middle-east',iso2:'LB'},
    '760':{zh:'敘利亞',region:'middle-east',iso2:'SY'},
    '368':{zh:'伊拉克',region:'middle-east',iso2:'IQ'},
    '364':{zh:'伊朗',region:'middle-east',iso2:'IR'},
    '682':{zh:'沙烏地阿拉伯',region:'middle-east',iso2:'SA'},
    '414':{zh:'科威特',region:'middle-east',iso2:'KW'},
    '634':{zh:'卡達',region:'middle-east',iso2:'QA'},
    '048':{zh:'巴林',region:'middle-east',iso2:'BH'},
    '512':{zh:'阿曼',region:'middle-east',iso2:'OM'},
    '887':{zh:'葉門',region:'middle-east',iso2:'YE'},
    '250':{zh:'法國',region:'europe',iso2:'FR'},
    '276':{zh:'德國',region:'europe',iso2:'DE'},
    '826':{zh:'英國',region:'europe',iso2:'GB'},
    '372':{zh:'愛爾蘭',region:'europe',iso2:'IE'},
    '380':{zh:'義大利',region:'europe',iso2:'IT'},
    '724':{zh:'西班牙',region:'europe',iso2:'ES'},
    '620':{zh:'葡萄牙',region:'europe',iso2:'PT'},
    '300':{zh:'希臘',region:'europe',iso2:'GR'},
    '528':{zh:'荷蘭',region:'europe',iso2:'NL'},
    '056':{zh:'比利時',region:'europe',iso2:'BE'},
    '442':{zh:'盧森堡',region:'europe',iso2:'LU'},
    '756':{zh:'瑞士',region:'europe',iso2:'CH'},
    '040':{zh:'奧地利',region:'europe',iso2:'AT'},
    '203':{zh:'捷克',region:'europe',iso2:'CZ'},
    '703':{zh:'斯洛伐克',region:'europe',iso2:'SK'},
    '348':{zh:'匈牙利',region:'europe',iso2:'HU'},
    '616':{zh:'波蘭',region:'europe',iso2:'PL'},
    '208':{zh:'丹麥',region:'europe',iso2:'DK'},
    '752':{zh:'瑞典',region:'europe',iso2:'SE'},
    '578':{zh:'挪威',region:'europe',iso2:'NO'},
    '246':{zh:'芬蘭',region:'europe',iso2:'FI'},
    '352':{zh:'冰島',region:'europe',iso2:'IS'},
    '233':{zh:'愛沙尼亞',region:'europe',iso2:'EE'},
    '428':{zh:'拉脫維亞',region:'europe',iso2:'LV'},
    '440':{zh:'立陶宛',region:'europe',iso2:'LT'},
    '643':{zh:'俄羅斯',region:'europe',iso2:'RU'},
    '804':{zh:'烏克蘭',region:'europe',iso2:'UA'},
    '112':{zh:'白俄羅斯',region:'europe',iso2:'BY'},
    '498':{zh:'摩爾多瓦',region:'europe',iso2:'MD'},
    '642':{zh:'羅馬尼亞',region:'europe',iso2:'RO'},
    '100':{zh:'保加利亞',region:'europe',iso2:'BG'},
    '688':{zh:'塞爾維亞',region:'europe',iso2:'RS'},
    '191':{zh:'克羅埃西亞',region:'europe',iso2:'HR'},
    '705':{zh:'斯洛維尼亞',region:'europe',iso2:'SI'},
    '070':{zh:'波士尼亞',region:'europe',iso2:'BA'},
    '499':{zh:'蒙特內哥羅',region:'europe',iso2:'ME'},
    '008':{zh:'阿爾巴尼亞',region:'europe',iso2:'AL'},
    '807':{zh:'北馬其頓',region:'europe',iso2:'MK'},
    '470':{zh:'馬爾他',region:'europe',iso2:'MT'},
    '196':{zh:'賽普勒斯',region:'europe',iso2:'CY'},
    '492':{zh:'摩納哥',region:'europe',iso2:'MC'},
    '336':{zh:'梵蒂岡',region:'europe',iso2:'VA'},
    '504':{zh:'摩洛哥',region:'africa',iso2:'MA'},
    '012':{zh:'阿爾及利亞',region:'africa',iso2:'DZ'},
    '788':{zh:'突尼西亞',region:'africa',iso2:'TN'},
    '434':{zh:'利比亞',region:'africa',iso2:'LY'},
    '818':{zh:'埃及',region:'africa',iso2:'EG'},
    '729':{zh:'蘇丹',region:'africa',iso2:'SD'},
    '231':{zh:'衣索比亞',region:'africa',iso2:'ET'},
    '404':{zh:'肯亞',region:'africa',iso2:'KE'},
    '834':{zh:'坦尚尼亞',region:'africa',iso2:'TZ'},
    '800':{zh:'烏干達',region:'africa',iso2:'UG'},
    '646':{zh:'盧安達',region:'africa',iso2:'RW'},
    '108':{zh:'蒲隆地',region:'africa',iso2:'BI'},
    '180':{zh:'剛果民主共和國',region:'africa',iso2:'CD'},
    '178':{zh:'剛果',region:'africa',iso2:'CG'},
    '120':{zh:'喀麥隆',region:'africa',iso2:'CM'},
    '566':{zh:'奈及利亞',region:'africa',iso2:'NG'},
    '288':{zh:'加納',region:'africa',iso2:'GH'},
    '384':{zh:'象牙海岸',region:'africa',iso2:'CI'},
    '686':{zh:'塞內加爾',region:'africa',iso2:'SN'},
    '710':{zh:'南非',region:'africa',iso2:'ZA'},
    '716':{zh:'辛巴威',region:'africa',iso2:'ZW'},
    '454':{zh:'馬拉威',region:'africa',iso2:'MW'},
    '894':{zh:'尚比亞',region:'africa',iso2:'ZM'},
    '516':{zh:'納米比亞',region:'africa',iso2:'NA'},
    '072':{zh:'波札那',region:'africa',iso2:'BW'},
    '450':{zh:'馬達加斯加',region:'africa',iso2:'MG'},
    '480':{zh:'模里西斯',region:'africa',iso2:'MU'},
    '690':{zh:'塞席爾',region:'africa',iso2:'SC'},
    '840':{zh:'美國',region:'north-america',iso2:'US'},
    '124':{zh:'加拿大',region:'north-america',iso2:'CA'},
    '484':{zh:'墨西哥',region:'latin-america',iso2:'MX'},
    '320':{zh:'瓜地馬拉',region:'latin-america',iso2:'GT'},
    '084':{zh:'貝里斯',region:'latin-america',iso2:'BZ'},
    '222':{zh:'薩爾瓦多',region:'latin-america',iso2:'SV'},
    '340':{zh:'宏都拉斯',region:'latin-america',iso2:'HN'},
    '558':{zh:'尼加拉瓜',region:'latin-america',iso2:'NI'},
    '188':{zh:'哥斯大黎加',region:'latin-america',iso2:'CR'},
    '591':{zh:'巴拿馬',region:'latin-america',iso2:'PA'},
    '192':{zh:'古巴',region:'latin-america',iso2:'CU'},
    '388':{zh:'牙買加',region:'latin-america',iso2:'JM'},
    '214':{zh:'多明尼加',region:'latin-america',iso2:'DO'},
    '332':{zh:'海地',region:'latin-america',iso2:'HT'},
    '630':{zh:'波多黎各',region:'latin-america',iso2:'PR'},
    '170':{zh:'哥倫比亞',region:'latin-america',iso2:'CO'},
    '862':{zh:'委內瑞拉',region:'latin-america',iso2:'VE'},
    '218':{zh:'厄瓜多',region:'latin-america',iso2:'EC'},
    '604':{zh:'秘魯',region:'latin-america',iso2:'PE'},
    '068':{zh:'玻利維亞',region:'latin-america',iso2:'BO'},
    '076':{zh:'巴西',region:'latin-america',iso2:'BR'},
    '152':{zh:'智利',region:'latin-america',iso2:'CL'},
    '032':{zh:'阿根廷',region:'latin-america',iso2:'AR'},
    '600':{zh:'巴拉圭',region:'latin-america',iso2:'PY'},
    '858':{zh:'烏拉圭',region:'latin-america',iso2:'UY'},
    '328':{zh:'蓋亞那',region:'latin-america',iso2:'GY'},
    '740':{zh:'蘇利南',region:'latin-america',iso2:'SR'},
    '036':{zh:'澳洲',region:'oceania',iso2:'AU'},
    '554':{zh:'紐西蘭',region:'oceania',iso2:'NZ'},
    '598':{zh:'巴布亞紐幾內亞',region:'oceania',iso2:'PG'},
    '242':{zh:'斐濟',region:'oceania',iso2:'FJ'},
    '882':{zh:'薩摩亞',region:'oceania',iso2:'WS'},
    '776':{zh:'東加',region:'oceania',iso2:'TO'},
    '548':{zh:'萬那杜',region:'oceania',iso2:'VU'},
    '090':{zh:'索羅門群島',region:'oceania',iso2:'SB'},
    '258':{zh:'法屬玻里尼西亞',region:'oceania',iso2:'PF'},
    '184':{zh:'庫克群島',region:'oceania',iso2:'CK'},
    '031':{zh:'亞塞拜然',region:'middle-east',iso2:'AZ'},
    '051':{zh:'亞美尼亞',region:'middle-east',iso2:'AM'},
    '268':{zh:'喬治亞',region:'middle-east',iso2:'GE'},
    '398':{zh:'哈薩克',region:'east-asia',iso2:'KZ'},
    '417':{zh:'吉爾吉斯',region:'east-asia',iso2:'KG'},
    '860':{zh:'烏茲別克',region:'east-asia',iso2:'UZ'},
    '795':{zh:'土庫曼',region:'east-asia',iso2:'TM'},
    '762':{zh:'塔吉克',region:'east-asia',iso2:'TJ'}
  };

  function lookupCountry(feature) {
    const id = String(feature.id || '').padStart(3, '0');
    const info = COUNTRY_INFO[id];
    const enName = feature.properties?.name || '此國家';
    return {
      name: info?.zh || enName,
      enName,
      region: info?.region || guessRegionByLatLon(feature),
      iso2: info?.iso2 || null
    };
  }

  function guessRegionByLatLon(feature) {
    // Fallback: estimate region from feature's centroid lat/lon
    const bb = bboxOfFeature(feature);
    const lat = (bb.minLat + bb.maxLat) / 2;
    const lon = (bb.minLon + bb.maxLon) / 2;
    if (lat > 35 && lon > -10 && lon < 60) return 'europe';
    if (lat < 35 && lat > -35 && lon > -20 && lon < 50) return 'africa';
    if (lat > 25 && lon > 60 && lon < 150) return 'east-asia';
    if (lat < 25 && lat > -10 && lon > 90 && lon < 145) return 'southeast-asia';
    if (lat > 0 && lat < 40 && lon > 60 && lon < 100) return 'south-asia';
    if (lat > 15 && lat < 45 && lon > 25 && lon < 65) return 'middle-east';
    if (lat > 15 && lon > -170 && lon < -50) return 'north-america';
    if (lat < 15 && lon > -120 && lon < -30) return 'latin-america';
    if (lat < 0 && lon > 110) return 'oceania';
    return 'any';
  }

  const state = {
    destinations: [],
    filtered: [],
    filters: { region: 'any', type: 'any', distance: 'any', country: 'any' },
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
    const { region, type, distance, country } = state.filters;

    // Explore 模式：融合內建（該國的）+ OSM 抓回來的
    let base;
    if (state.exploreMode && state.selectedCountry) {
      const cn = state.selectedCountry.name;
      const enName = state.selectedCountry.enName;
      const builtin = state.destinations.filter(d => d.country === cn || d.country === enName);
      const osm = state.explorePool || [];
      // 去重：同名 + 經緯度 0.005 內視為同點
      const seen = new Set();
      base = [];
      for (const d of [...builtin, ...osm]) {
        const k = (d.name || '') + '@' + Math.round(d.lat * 200) / 200 + ',' + Math.round(d.lon * 200) / 200;
        if (seen.has(k)) continue;
        seen.add(k);
        base.push(d);
      }
    } else {
      base = state.destinations;
    }

    state.filtered = base.filter(d => {
      if (!state.exploreMode && region !== 'any' && d.region !== region) return false;
      if (!state.exploreMode && country && country !== 'any' && d.country !== country) return false;
      if (type !== 'any' && d.type !== type) return false;
      if (distance !== 'any' && state.userPos) {
        const km = haversineKm(state.userPos.lat, state.userPos.lon, d.lat, d.lon);
        if (km > Number(distance)) return false;
      }
      return true;
    });
    const countEl = $('#filter-count');
    if (countEl) {
      let prefix = '符合條件：';
      if (state.exploreMode && state.selectedCountry) {
        prefix = `${state.selectedCountry.name}：`;
      }
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

    // 國家下拉：依當前 region 篩選顯示
    function rebuildCountrySelect() {
      const sel = $('#filter-country');
      if (!sel) return;
      const region = state.filters.region;
      const candidates = state.destinations.filter(d => region === 'any' || d.region === region);
      const counts = {};
      for (const d of candidates) counts[d.country] = (counts[d.country] || 0) + 1;
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const cur = state.filters.country;
      sel.innerHTML = '<option value="any">全部國家</option>' +
        sorted.map(([c, n]) => `<option value="${escapeHtml(c)}">${escapeHtml(c)} (${n})</option>`).join('');
      // 若目前選的國家不在新清單，重置
      if (cur !== 'any' && !counts[cur]) {
        state.filters.country = 'any';
        saveFilters();
      }
      sel.value = state.filters.country;
    }
    rebuildCountrySelect();
    $('#filter-country').addEventListener('change', e => {
      state.filters.country = e.target.value;
      applyFilters(); saveFilters();
    });
    // region 變更要連動國家清單
    const origRegionHandler = $$('#filter-region .chip');
    origRegionHandler.forEach(b => {
      b.addEventListener('click', () => {
        setTimeout(rebuildCountrySelect, 0);
      });
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
    const r = await fetch('./data/destinations.json?v=8');
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
    const info = lookupCountry(feature);
    state.selectedCountry = { feature, layer, ...info };

    state.map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 6 });

    $('#explore-banner-text').textContent = `${info.name} · 抓取景點中…（首次可能 30 秒）`;
    toast(`正在抓取 ${info.name} 的景點…`);
    try {
      const pool = await fetchCountrySpots(feature, info);
      if (!pool.length) {
        $('#explore-banner-text').textContent = `${info.name} · 沒抓到景點，再點一次或換國家`;
        toast('該國沒抓到景點，可改換其他國家');
        state.explorePool = null;
        return;
      }
      state.explorePool = pool;
      applyFilters();
      $('#explore-banner-text').textContent = `${info.name} · ${pool.length} 個景點，按下方射飛鏢`;
      toast(`抓到 ${pool.length} 個景點，可以射飛鏢了`);
    } catch (e) {
      $('#explore-banner-text').textContent = `${info.name} · 抓取失敗：${e.message || '請再試一次'}`;
      toast('抓取失敗，可能 Overpass 太忙了，可再試一次');
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

  function buildOverpassQuery(info, bb) {
    // 優先用 area query（伺服器負擔小、結果精準）
    if (info.iso2) {
      return `
        [out:json][timeout:60];
        area["ISO3166-1"="${info.iso2}"][admin_level=2]->.country;
        (
          node["tourism"~"^(attraction|viewpoint|theme_park|zoo|aquarium)$"](area.country);
          node["historic"~"^(castle|monument|memorial|ruins|archaeological_site|fort|monastery)$"](area.country);
          node["natural"~"^(peak|volcano|waterfall|beach|hot_spring|cape)$"](area.country);
          node["leisure"="nature_reserve"](area.country);
        );
        out center 300;
      `;
    }
    // fallback: bbox
    const bbox = `${bb.minLat.toFixed(3)},${bb.minLon.toFixed(3)},${bb.maxLat.toFixed(3)},${bb.maxLon.toFixed(3)}`;
    return `
      [out:json][timeout:60];
      (
        node["tourism"~"^(attraction|viewpoint|theme_park|zoo|aquarium)$"](${bbox});
        node["historic"~"^(castle|monument|memorial|ruins|archaeological_site|fort|monastery)$"](${bbox});
        node["natural"~"^(peak|volcano|waterfall|beach|hot_spring|cape)$"](${bbox});
        node["leisure"="nature_reserve"](${bbox});
      );
      out center 300;
    `;
  }

  async function fetchOverpass(query) {
    let lastErr = null;
    for (const url of OVERPASS_URLS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });
        if (!r.ok) {
          lastErr = new Error('Overpass ' + r.status);
          continue;
        }
        return await r.json();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('All Overpass endpoints failed');
  }

  async function fetchCountrySpots(feature, info) {
    const cacheKey = (info.iso2 || info.name) + '|' + (feature.id || '');
    const cached = state.countryCache[cacheKey];
    const ONE_DAY = 24 * 3600 * 1000;
    if (cached && (Date.now() - cached.t) < 7 * ONE_DAY) {
      return cached.pool;
    }

    const bb = bboxOfFeature(feature);
    const query = buildOverpassQuery(info, bb);
    const j = await fetchOverpass(query);

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
        country: info.name,
        region: info.region,
        type,
        lat, lon,
        wiki: tags['wikipedia']?.replace(/^[a-z]+:/, '') || tags['name:zh'] || tags['name:en'] || tags.name,
        source: 'osm'
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
