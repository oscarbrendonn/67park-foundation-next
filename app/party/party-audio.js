// Original 67Park effects. One audio graph; bounded voices; no animation-loop ownership.
export function createPartyAudio({settings, saveSettings, gameMuted, host = window}) {
  let ctx, master, compressor, noise, resuming, hornVoice, hornWanted = false, blocked = false;
  const voices = new Set(), last = new Map(), counts = {};
  const limits = {step: 90, jump: 140, double: 140, land: 100, 'skate-ollie':110, 'skate-flip':140, 'skate-land':100, horn:120, swing: 150, hit: 100, pad: 250, grab: 150, throw: 150, click: 60, stars: 350, note:80, bell:1800};
  const audible = () => ctx?.state === 'running' && !host.document.hidden && !blocked && !gameMuted() && settings.sfx > 0;
  const volume = () => {
    if (ctx && master) master.gain.setTargetAtTime(audible() ? Math.min(1, Math.max(0, Number(settings.sfx) || 0)) * 0.65 : 0, ctx.currentTime, 0.025);
  };
  function ensure() {
    try {
      if (!ctx) {
        const AC = host.AudioContext || host.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC({latencyHint: 'interactive'});
        master = ctx.createGain(); compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -16; compressor.knee.value = 16;
        compressor.ratio.value = 5; compressor.attack.value = 0.003; compressor.release.value = 0.12;
        master.connect(compressor); compressor.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        ctx.addEventListener?.('statechange', () => { if (ctx.state !== 'running') stopHorn(); });
      }
      if ((ctx.state === 'suspended' || ctx.state === 'interrupted') && !resuming) resuming = ctx.resume().then(volume).catch(() => {}).finally(() => { resuming = null; });
      volume();
      return ctx;
    } catch { return null; } // Audio failure must never disable gameplay or the party pack.
  }
  function stopHorn() {
    hornWanted = false;
    const v = hornVoice; hornVoice = null;
    if (!v) return;
    try {
      // Preserve the instantaneous attack level on a very quick tap. A short
      // release removes the click without imposing an artificial hold limit.
      const t = ctx.currentTime;
      const level = Math.min(.2,.2*Math.max(0,t-v.started)/.012);
      v.envelope.gain.cancelScheduledValues(t);
      if (t < v.started+.012) v.envelope.gain.linearRampToValueAtTime(level,t);
      else v.envelope.gain.setValueAtTime(level,t);
      v.envelope.gain.linearRampToValueAtTime(0,t+.04);
      v.source.stop(t+.045);
    } catch { try { v.source.stop(); } catch {} }
  }
  function soundHeldHorn() {
    if (!hornWanted || hornVoice || !audible() || voices.size >= 24) return;
    let source, envelope;
    try {
      source = ctx.createOscillator(); envelope = ctx.createGain();
      source.type = 'triangle'; source.frequency.setValueAtTime(440,ctx.currentTime);
      envelope.gain.setValueAtTime(0,ctx.currentTime);
      envelope.gain.linearRampToValueAtTime(.2,ctx.currentTime+.012);
      source.connect(envelope); envelope.connect(master); voices.add(source);
      const v = hornVoice = {source,envelope,started:ctx.currentTime};
      source.onended = () => { voices.delete(source); source.disconnect(); envelope.disconnect(); if(hornVoice===v)hornVoice=null; };
      source.start(); counts.horn = (counts.horn || 0) + 1;
    } catch {
      voices.delete(source); if(hornVoice?.source===source)hornVoice=null;hornWanted=false;
      try { source?.stop(); source?.disconnect(); envelope?.disconnect(); } catch {}
    }
  }
  function startHorn() {
    if (hornWanted || host.document.hidden || blocked || gameMuted() || !(settings.sfx > 0)) return;
    hornWanted = true;
    if (!ensure()) { hornWanted = false; return; }
    if (audible()) soundHeldHorn();
    else resuming?.then(soundHeldHorn); // release before iOS unlock cancels this start
  }
  function voice({noiseBand, type = 'sine', from = 400, to = 200, duration = 0.09, gain = 0.15, delay = 0, pitch = 1}) {
    if (!audible() || voices.size >= 24) return;
    const start = ctx.currentTime + delay, end = start + duration;
    const source = noiseBand ? ctx.createBufferSource() : ctx.createOscillator();
    const envelope = ctx.createGain(), filter = noiseBand ? ctx.createBiquadFilter() : null;
    if (noiseBand) {
      source.buffer = noise; source.playbackRate.value = pitch;
      filter.type = noiseBand; filter.frequency.value = from; filter.Q.value = 0.7;
      source.connect(filter); filter.connect(envelope);
    } else {
      source.type = type; source.frequency.setValueAtTime(from * pitch, start);
      source.frequency.exponentialRampToValueAtTime(Math.max(30, to * pitch), end);
      source.connect(envelope);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + Math.min(0.008, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    envelope.connect(master); voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); envelope.disconnect(); filter?.disconnect(); };
    source.start(start); source.stop(end + 0.01);
  }
  const recipes = {
    // Same plain pitch as the held horn; finite fallback for assistive clicks.
    horn(){voice({type:'triangle',from:440,to:440,duration:.18,gain:.2});},
    bell(){voice({from:660,to:660,duration:.3,gain:.16});voice({from:520,to:520,duration:.45,delay:.22,gain:.13});},
    note(index) {
      const f=[261.63,293.66,329.63,392,440,523.25][index];if(!f)return;
      voice({type:'sine',from:f,to:f,duration:.42,gain:.16});
      voice({type:'sine',from:f*2,to:f*2,duration:.20,gain:.025});
    },
    step(left, p) {
      voice({noiseBand:'lowpass', from:left ? 750 : 640, duration:0.065, gain:0.13, pitch:p});
      voice({from:left ? 145 : 130, to:65, duration:0.055, gain:0.08, pitch:p});
    },
    jump(_, p) {
      voice({from:260, to:610, duration:0.16, gain:0.22, pitch:p});
      voice({type:'triangle', from:520, to:920, duration:0.10, delay:0.025, gain:0.045, pitch:p});
      voice({noiseBand:'bandpass', from:1200, duration:0.07, gain:0.035});
    },
    double(_, p) {
      voice({from:420, to:1050, duration:0.18, gain:0.20, pitch:p});
      voice({from:840, to:1320, duration:0.10, delay:0.06, gain:0.055, pitch:p});
    },
    land(hard, p) {
      voice({noiseBand:'lowpass', from:hard ? 750 : 450, duration:hard ? 0.14 : 0.09, gain:hard ? 0.25 : 0.15, pitch:p});
      voice({from:hard ? 155 : 100, to:45, duration:0.13, gain:hard ? 0.22 : 0.12, pitch:p});
    },
    'skate-ollie'(_, p) {
      // Compact wooden tail pop, rather than the walking jump's rising chime.
      voice({noiseBand:'highpass', from:1450, duration:.045, gain:.20, pitch:p});
      voice({type:'triangle', from:190, to:68, duration:.075, gain:.14, pitch:p});
      voice({noiseBand:'bandpass', from:780, duration:.055, delay:.012, gain:.075, pitch:p});
    },
    'skate-flip'(_, p) {
      // Shoe flick followed by a short airy board rotation; landing is separate.
      voice({noiseBand:'highpass', from:2350, duration:.055, gain:.14, pitch:p});
      voice({noiseBand:'bandpass', from:1500, duration:.22, delay:.018, gain:.16, pitch:p});
      voice({type:'triangle', from:370, to:150, duration:.075, gain:.045, pitch:p});
    },
    'skate-land'(hard, p) {
      // Two quick truck/wheel contacts, with a low deck thump underneath.
      voice({noiseBand:'highpass', from:1100, duration:.06, gain:hard ? .23 : .15, pitch:p});
      voice({noiseBand:'bandpass', from:850, duration:.065, delay:.028, gain:hard ? .16 : .10, pitch:p});
      voice({type:'triangle', from:hard ? 150 : 115, to:48, duration:.11, gain:hard ? .20 : .12, pitch:p});
    },
    swing(_, p) { voice({noiseBand:'bandpass', from:1100, duration:0.15, gain:0.17, pitch:p}); },
    hit(_, p) {
      voice({noiseBand:'lowpass', from:950, duration:0.09, gain:0.28, pitch:p});
      voice({type:'triangle', from:230, to:65, duration:0.12, gain:0.25, pitch:p});
      voice({from:620, to:280, duration:0.07, gain:0.08, pitch:p});
    },
    pad(_, p) {
      voice({from:160, to:85, duration:0.09, gain:0.21, pitch:p});
      voice({type:'triangle', from:220, to:1150, duration:0.28, delay:0.06, gain:0.16, pitch:p});
      voice({from:750, to:1500, duration:0.18, delay:0.16, gain:0.07, pitch:p});
    },
    grab(_, p) { voice({from:440, to:280, duration:0.10, gain:0.18, pitch:p}); voice({from:660, to:520, duration:0.08, delay:0.04, gain:0.07, pitch:p}); },
    throw(_, p) { voice({noiseBand:'bandpass', from:1400, duration:0.21, gain:0.18, pitch:p}); voice({from:330, to:760, duration:0.18, gain:0.10, pitch:p}); },
    click(_, p) { voice({from:750, to:570, duration:0.045, gain:0.10, pitch:p}); },
    stars(_, p) { [880,1100,1320].forEach((f,i)=>voice({from:f,to:f*1.02,duration:0.15,delay:i*0.08,gain:0.065,pitch:p})); }
  };
  function play(name, arg) {
    try {
      if (!audible() || !recipes[name]) return;
      if (name === 'horn' && hornWanted) return;
      const now = ctx.currentTime * 1000;
      const rateKey=name==='note'?'note:'+Math.max(0,Math.min(5,Math.trunc(Number(arg)||0))):name;
      if (now - (last.get(rateKey) ?? -Infinity) < (limits[name] ?? 80)) return;
      last.set(rateKey, now); volume();
      recipes[name](arg, 0.96 + Math.random() * 0.08);
      counts[name] = (counts[name] || 0) + 1;
    } catch {} // Sound synthesis never escapes into the simulation.
  }
  function quiet() {
    volume();
    if (host.document.hidden || blocked || gameMuted() || !(settings.sfx > 0)) stopHorn();
    if (host.document.hidden || blocked || gameMuted()) for (const source of voices) { try { source.stop(); } catch {} }
  }
  // Board mode bypasses the walking controller used by __partyVisual. Listen
  // to its accepted trick events instead; never add polling or another graph.
  host.addEventListener('candy:skate-trick', event => {
    if (event.detail?.trick === 'ollie') play('skate-ollie');
    else if (event.detail?.trick === 'kickflip') play('skate-flip');
  });
  host.addEventListener('candy:skate-land', event => {
    const p = event.detail;
    if (p && [p.x, p.y, p.z].every(Number.isFinite)) play('skate-land', p.hard === true);
  });
  // Muted gameplay must not pay a first-input AudioContext initialization.
  // A later audible gesture still unlocks the graph normally.
  const gesture = () => {
    if (!host.document.hidden && !blocked && !gameMuted() && settings.sfx > 0) ensure();
    quiet();
  };
  for (const event of ['pointerdown','pointerup','touchend','keydown']) host.addEventListener(event, gesture, {passive:true,capture:true});
  host.document.addEventListener('visibilitychange', quiet);
  host.addEventListener('pagehide', () => { blocked = true; quiet(); });
  host.addEventListener('pageshow', () => { blocked = false; volume(); });
  host.addEventListener('storage', quiet);
  host.addEventListener('park:settings-change',quiet);
  host.addEventListener('park:audio-mute-change',quiet);
  host.addEventListener('blur',stopHorn);
  return {
    ensure, play, startHorn, stopHorn,
    state: () => ctx?.state || 'none',
    setVolume(value) { settings.sfx = Math.min(1, Math.max(0, Number(value) || 0)); quiet(); saveSettings(); },
    stats: () => ({voices:voices.size, maxVoices:24, counts:{...counts}, hornActive:!!hornVoice, state:ctx?.state || 'none'})
  };
}
