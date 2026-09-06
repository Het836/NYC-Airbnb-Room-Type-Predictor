const BOROUGH_NEIGHBOURHOODS = {
    "Manhattan": ["Harlem","East Harlem","Upper West Side","Upper East Side","Midtown","Chelsea","Greenwich Village","East Village","Lower East Side","SoHo","Financial District","Washington Heights","Inwood","Hell's Kitchen"],
    "Brooklyn": ["Williamsburg","Bushwick","Bedford-Stuyvesant","Crown Heights","Park Slope","Greenpoint","Sunset Park","Flatbush","Brooklyn Heights","Fort Greene","Bay Ridge","Canarsie"],
    "Queens": ["Astoria","Long Island City","Flushing","Jamaica","Ridgewood","Sunnyside","Forest Hills","Elmhurst","Jackson Heights","Rockaway Beach"],
    "Bronx": ["Mott Haven","Fordham","Riverdale","Concourse","Kingsbridge","Melrose","Highbridge"],
    "Staten Island": ["St. George","Tompkinsville","Stapleton","Great Kills","Tottenville"]
  };

  const LAT_MIN = 40.49, LAT_MAX = 40.92;
  const LNG_MIN = -74.26, LNG_MAX = -73.68;

  const form = document.getElementById('predict-form');
  const boroughEl = document.getElementById('borough');
  const neighbourhoodEl = document.getElementById('neighbourhood');
  const neighbourhoodOtherEl = document.getElementById('neighbourhood-other');
  const submitBtn = document.getElementById('submit-btn');
  const errorBanner = document.getElementById('error-banner');
  const marker = document.getElementById('map-marker');

  // ---- Borough -> neighbourhood dependent select ----
  boroughEl.addEventListener('change', () => {
    const list = BOROUGH_NEIGHBOURHOODS[boroughEl.value] || [];
    neighbourhoodEl.innerHTML = '<option value="" disabled selected>Choose a neighbourhood</option>';
    list.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n; opt.textContent = n;
      neighbourhoodEl.appendChild(opt);
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__'; otherOpt.textContent = 'Other (type it in)';
    neighbourhoodEl.appendChild(otherOpt);
    neighbourhoodEl.disabled = false;
    neighbourhoodOtherEl.style.display = 'none';
    neighbourhoodOtherEl.value = '';
    validateForm();
  });

  neighbourhoodEl.addEventListener('change', () => {
    neighbourhoodOtherEl.style.display = neighbourhoodEl.value === '__other__' ? 'block' : 'none';
    validateForm();
  });
  neighbourhoodOtherEl.addEventListener('input', validateForm);

  // ---- Slider <-> value label sync ----
  function bindSlider(id, format){
    const el = document.getElementById(id);
    const label = document.getElementById(id + '-val');
    const update = () => { label.textContent = format(el.value); };
    el.addEventListener('input', update);
    update();
    return el;
  }

  const latEl = bindSlider('latitude', v => Number(v).toFixed(3));
  const lngEl = bindSlider('longitude', v => Number(v).toFixed(3));
  bindSlider('price', v => '$' + v);
  bindSlider('minimum_nights', v => v);
  bindSlider('availability_365', v => v);

  function updateMarker(){
    const lat = parseFloat(latEl.value);
    const lng = parseFloat(lngEl.value);
    const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 260 + 20;
    const y = (1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 220 + 15;
    marker.setAttribute('cx', x.toFixed(1));
    marker.setAttribute('cy', y.toFixed(1));
  }
  latEl.addEventListener('input', updateMarker);
  lngEl.addEventListener('input', updateMarker);
  updateMarker();

  // ---- Form validation ----
  const numberFields = ['calculated_host_listings_count','number_of_reviews','reviews_per_month'];
  numberFields.forEach(id => document.getElementById(id).addEventListener('input', validateForm));

  function getNeighbourhoodValue(){
    if (neighbourhoodEl.value === '__other__') return neighbourhoodOtherEl.value.trim();
    return neighbourhoodEl.value;
  }

  function validateForm(){
    const boroughOk = !!boroughEl.value;
    const neighbourhoodOk = getNeighbourhoodValue().length > 0;
    let numbersOk = true;
    numberFields.forEach(id => {
      const el = document.getElementById(id);
      if (el.value === '' || Number(el.value) < 0) numbersOk = false;
    });
    const valid = boroughOk && neighbourhoodOk && numbersOk;
    submitBtn.disabled = !valid;
    return valid;
  }
  validateForm();

  // ---- Result rendering helpers ----
  const ICONS = {
    entire: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0e18" stroke-width="2"><path d="M3 11.5L12 4l9 7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    private: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0e18" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M8 10V7a4 4 0 018 0v3" stroke-linecap="round"/></svg>`,
    shared: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0e18" stroke-width="2"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-1a5 5 0 015-5h1a5 5 0 015 5v1" stroke-linecap="round"/><path d="M15 20v-1a4 4 0 014-4" stroke-linecap="round"/></svg>`,
    default: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0e18" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2" stroke-linecap="round"/></svg>`
  };

  function classInfo(name){
    const n = (name || '').toLowerCase();
    if (n.includes('entire')) return { color: 'var(--teal)', dim: 'var(--teal-dim)', icon: ICONS.entire };
    if (n.includes('private')) return { color: 'var(--amber)', dim: 'var(--amber-dim)', icon: ICONS.private };
    if (n.includes('shared')) return { color: 'var(--coral)', dim: 'var(--coral-dim)', icon: ICONS.shared };
    return { color: 'var(--blue)', dim: 'var(--blue-dim)', icon: ICONS.default };
  }

  const CLASS_LABELS_3 = ['Entire home/apt', 'Private room', 'Shared room'];
  function labelForIndex(i, total){
    if (total === 3) return CLASS_LABELS_3[i];
    return 'Class ' + (i + 1);
  }

  function showState(id){
    document.querySelectorAll('.result-state').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function renderResult(data){
    const predicted = data.Predicted_room_type;
    const probs = data.Probability || [];
    const info = classInfo(predicted);

    document.getElementById('result-icon').innerHTML = info.icon;
    document.getElementById('result-icon').style.background = info.color;
    document.getElementById('result-title').textContent = predicted;

    const maxProb = probs.length ? Math.max(...probs) : 0;
    const pct = Math.round(maxProb * 100);
    document.getElementById('confidence-num').textContent = pct + '%';
    document.getElementById('confidence-num').style.color = info.color;
    const fill = document.getElementById('confidence-fill');
    fill.style.background = info.color;
    requestAnimationFrame(() => { fill.style.width = pct + '%'; });

    const list = document.getElementById('breakdown-list');
    list.innerHTML = '';
    const indexed = probs.map((p, i) => ({ p, label: labelForIndex(i, probs.length) }));
    indexed.sort((a, b) => b.p - a.p);
    indexed.forEach(item => {
      const rowInfo = classInfo(item.label);
      const rowPct = Math.round(item.p * 100);
      const row = document.createElement('div');
      row.className = 'breakdown-row';
      row.innerHTML = `
        <div class="breakdown-top">
          <span class="breakdown-name">${item.label}</span>
          <span class="breakdown-pct">${rowPct}%</span>
        </div>
        <div class="breakdown-track"><div class="breakdown-fill" style="background:${rowInfo.color}"></div></div>
      `;
      list.appendChild(row);
      requestAnimationFrame(() => {
        row.querySelector('.breakdown-fill').style.width = rowPct + '%';
      });
    });

    showState('state-result');
  }

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    errorBanner.classList.remove('show');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    showState('state-loading');

    const payload = {
      latitude: parseFloat(latEl.value),
      longitude: parseFloat(lngEl.value),
      price: parseFloat(document.getElementById('price').value),
      minimum_nights: parseInt(document.getElementById('minimum_nights').value, 10),
      number_of_reviews: parseInt(document.getElementById('number_of_reviews').value, 10),
      reviews_per_month: parseFloat(document.getElementById('reviews_per_month').value),
      calculated_host_listings_count: parseInt(document.getElementById('calculated_host_listings_count').value, 10),
      availability_365: parseInt(document.getElementById('availability_365').value, 10),
      neighbourhood_group: boroughEl.value,
      neighbourhood: getNeighbourhoodValue()
    };

    try {
      const res = await fetch('https://nyc-airbnb-room-type-predictor-backend.onrender.com', {
      // const res = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded with ${res.status}: ${text}`);
      }
      const data = await res.json();
      renderResult(data);
    } catch (err) {
      showState('state-empty');
      errorBanner.textContent = "Couldn't reach the prediction server. Make sure the FastAPI backend is running on http://localhost:8000 — " + err.message;
      errorBanner.classList.add('show');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      validateForm();
    }
  });