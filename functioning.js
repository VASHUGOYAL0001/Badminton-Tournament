let currentMode = 'singles';
let groupingMode = 'random';
let groupA = [];
let groupB = [];
let stats = {};

let fixtureListA = [];
let fixtureListB = [];
let currentMatchIdxA = 0;
let currentMatchIdxB = 0;

let tieMatchesQueue = [];
let quarterMatches = [];
let bronzeSemiMatch = null;
let grandFinalMatch = null;
let podium = { first: "", second: "", third: "" };

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
}

function setTournamentMode(mode) {
  currentMode = mode;
  document.getElementById('btnSingles').classList.toggle('active', mode === 'singles');
  document.getElementById('btnDoubles').classList.toggle('active', mode === 'doubles');
  renderInputs();
}

function setGroupingMode(mode) {
  groupingMode = mode;
  document.getElementById('btnRandom').classList.toggle('active', mode === 'random');
  document.getElementById('btnCustom').classList.toggle('active', mode === 'custom');
  renderInputs();
}

function renderInputs() {
  let html = "";
  let labelText = currentMode === 'singles' ? 'Player' : 'Team';
  let placeholderText = currentMode === 'singles' ? 'Enter Name' : 'P1 & P2';
  let btn = document.getElementById("mainSetupBtn");

  if (groupingMode === 'random') {
    btn.innerText = "Randomize & Start";
    html = `<div class="grid-inputs">`;
    for(let i = 1; i <= 8; i++) {
      html += `
        <div class="input-card">
          <label>${labelText} ${i}</label>
          <input type="text" class="player-input" placeholder="${placeholderText}">
        </div>`;
    }
    html += `</div>`;
  } else {
    btn.innerText = "Lock Roster & Custom Matchmaking";
    html = `
      <div class="grid-tables" style="margin-bottom: 10px;">
        <div>
          <h3 style="color: var(--primary-color); margin-bottom:4px;">Group A</h3>
          <div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="${placeholderText}"></div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="${placeholderText}"></div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="${placeholderText}"></div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="${placeholderText}"></div>
          </div>
        </div>
        <div>
          <h3 style="color: var(--primary-color); margin-bottom:4px;">Group B</h3>
          <div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="${placeholderText}"></div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="${placeholderText}"></div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="${placeholderText}"></div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="${placeholderText}"></div>
          </div>
        </div>
      </div>`;
  }
  document.getElementById("inputs").innerHTML = html;
}

renderInputs();

function shuffleArray(arr) {
  for(let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function processSetupStage() {
  if (groupingMode === 'random') {
    let inputs = [...document.querySelectorAll(".player-input")].map(x => x.value.trim());
    if(inputs.some(x => !x)) { alert("Please fill out all 8 fields."); return; }
    if (new Set(inputs).size !== inputs.length) { alert("Names must be unique."); return; }

    shuffleArray(inputs);
    groupA = inputs.slice(0, 4);
    groupB = inputs.slice(4, 8);
    
    initializeTournamentBackend(false);
  } else {
    groupA = [...document.querySelectorAll(".player-input-a")].map(x => x.value.trim());
    groupB = [...document.querySelectorAll(".player-input-b")].map(x => x.value.trim());
    if(groupA.some(x => !x) || groupB.some(x => !x)) { alert("Please complete both group rosters."); return; }
    
    let combined = groupA.concat(groupB);
    if (new Set(combined).size !== combined.length) { alert("Names must be unique."); return; }

    document.getElementById("setup").classList.add("hidden");
    document.getElementById("customMatchmakingWrapper").classList.remove("hidden");
    buildCustomDropdowns();
  }
}

function buildCustomDropdowns() {
  function makeOptions(list) {
    return list.map(p => `<option value="${p}">${p}</option>`).join("");
  }
  let optsA = makeOptions(groupA);
  let optsB = makeOptions(groupB);

  let htmlA = "", htmlB = "";
  for (let i = 1; i <= 6; i++) {
    htmlA += `
      <div class="custom-match-line">
        <span style="font-weight:bold; width:22px; font-size:0.8rem;">M${i}:</span>
        <select class="c-select-a1-${i}">${optsA}</select>
        <span style="font-size:0.75rem; opacity:0.5;">vs</span>
        <select class="c-select-a2-${i}">${optsA}</select>
      </div>`;
    htmlB += `
      <div class="custom-match-line">
        <span style="font-weight:bold; width:22px; font-size:0.8rem;">M${i}:</span>
        <select class="c-select-b1-${i}">${optsB}</select>
        <span style="font-size:0.75rem; opacity:0.5;">vs</span>
        <select class="c-select-b2-${i}">${optsB}</select>
      </div>`;
  }
  document.getElementById("customMatchSlotsA").innerHTML = htmlA;
  document.getElementById("customMatchSlotsB").innerHTML = htmlB;
}

function launchCustomTournament() {
  fixtureListA = [];
  fixtureListB = [];
  
  for (let i = 1; i <= 6; i++) {
    let pA1 = document.querySelector(`.c-select-a1-${i}`).value;
    let pA2 = document.querySelector(`.c-select-a2-${i}`).value;
    let pB1 = document.querySelector(`.c-select-b1-${i}`).value;
    let pB2 = document.querySelector(`.c-select-b2-${i}`).value;

    if (pA1 === pA2 || pB1 === pB2) {
      alert(`Slot M${i} has overlapping identical configurations. Selections must be separate.`);
      return;
    }
    fixtureListA.push({ p1: pA1, p2: pA2, done: false, winText: '' });
    fixtureListB.push({ p1: pB1, p2: pB2, done: false, winText: '' });
  }

  document.getElementById("customMatchmakingWrapper").classList.add("hidden");
  initializeTournamentBackend(true);
}

function initializeTournamentBackend(isCustomSchedule) {
  stats = {};
  groupA.concat(groupB).forEach(n => { 
    stats[n] = { wins: 0, losses: 0, draws: 0, pts: 0 }; 
  });

  if (!isCustomSchedule) {
    let formula = [
      [0, 1], [2, 3],
      [0, 2], [1, 3],
      [0, 3], [1, 2]
    ];
    fixtureListA = formula.map(pair => ({ p1: groupA[pair[0]], p2: groupA[pair[1]], done: false, winText: '' }));
    fixtureListB = formula.map(pair => ({ p1: groupB[pair[0]], p2: groupB[pair[1]], done: false, winText: '' }));
  }

  currentMatchIdxA = 0;
  currentMatchIdxB = 0;

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("main").classList.remove("hidden");

  renderScheduleGrids();
  renderLiveScoringBlock('A');
  renderLiveScoringBlock('B');
  updateTables();
}

function renderScheduleGrids() {
  function fillGrid(id, list) {
    document.getElementById(id).innerHTML = list.map((m, idx) => {
      let statusStr = m.done ? `✅ ${m.winText}` : "⏳ Queued";
      let rowClass = m.done ? "schedule-row-done" : "";
      return `
        <tr class="${rowClass}">
          <td style="font-weight:bold;">M${idx + 1}</td>
          <td style="font-weight:600;">${m.p1} <span style="opacity:0.4; font-weight:normal;">vs</span> ${m.p2}</td>
          <td style="font-weight:bold; font-size:0.8rem;">${statusStr}</td>
        </tr>`;
    }).join("");
  }
  fillGrid("scheduleTableA", fixtureListA);
  fillGrid("scheduleTableB", fixtureListB);
}

function renderLiveScoringBlock(groupName) {
  let containerId = groupName === 'A' ? 'liveControlCardA' : 'liveControlCardB';
  let list = groupName === 'A' ? fixtureListA : fixtureListB;
  let activeIdx = groupName === 'A' ? currentMatchIdxA : currentMatchIdxB;

  if (activeIdx >= list.length) {
    document.getElementById(containerId).innerHTML = `<div class="center status-badge saved">Court Stage Clear</div>`;
    checkGroupCompletion();
    return;
  }

  let m = list[activeIdx];
  document.getElementById(containerId).innerHTML = `
    <div class="match-item" style="border-left: 4px solid var(--primary-color);">
      <div style="font-size:0.75rem; font-weight:bold; color:var(--text-muted); margin-bottom:4px; text-align:center;">
        Active Court Match (${activeIdx + 1} / 6)
      </div>
      <div class="match-row">
        <div class="team-action-block">
          <span class="match-team-name">${m.p1}</span>
        </div>
        <div class="match-vs-box">VS</div>
        <div class="team-action-block">
          <span class="match-team-name">${m.p2}</span>
        </div>
      </div>
      
      <div class="outcome-action-row">
        <button class="btn-success" onclick="processOutcomeClick('${groupName}', 1)">P1 Win</button>
        <button class="btn-warning" onclick="processOutcomeClick('${groupName}', 'draw')">Draw</button>
        <button class="btn-success" onclick="processOutcomeClick('${groupName}', 2)">P2 Win</button>
      </div>
    </div>`;
}

function processOutcomeClick(groupName, outcome) {
  let list = groupName === 'A' ? fixtureListA : fixtureListB;
  let idx = groupName === 'A' ? currentMatchIdxA : currentMatchIdxB;
  let m = list[idx];

  m.done = true;

  if (outcome === 'draw') {
    m.winText = "Draw Match";
    stats[m.p1].draws++;
    stats[m.p1].pts += 1;
    stats[m.p2].draws++;
    stats[m.p2].pts += 1;
  } else if (outcome === 1) {
    m.winText = `${m.p1} Won`;
    stats[m.p1].wins++;
    stats[m.p1].pts += 2;
    stats[m.p2].losses++;
  } else {
    m.winText = `${m.p2} Won`;
    stats[m.p2].wins++;
    stats[m.p2].pts += 2;
    stats[m.p1].losses++;
  }

  if (groupName === 'A') currentMatchIdxA++; else currentMatchIdxB++;

  updateTables();
  renderScheduleGrids();
  renderLiveScoringBlock(groupName);
}

function checkGroupCompletion() {
  if (currentMatchIdxA >= fixtureListA.length && currentMatchIdxB >= fixtureListB.length) {
    document.getElementById("groupLiveControlSection").classList.add("hidden");
    document.getElementById("schedulesContainer").classList.add("hidden");
    document.getElementById("standings-container").classList.remove("hidden");
    
    evaluateGroupTies();
  }
}

// ⚠️ Dynamic Tie-Breaker Scanner Engine (Handles B vs C scenario)
function evaluateGroupTies() {
  let A = sortGroupEntries(groupA);
  let B = sortGroupEntries(groupB);
  tieMatchesQueue = [];

  // Check Group A qualification boundary tie (2nd vs 3rd)
  if (stats[A[1]].pts === stats[A[2]].pts && stats[A[1]].wins === stats[A[2]].wins) {
    tieMatchesQueue.push({ id: 'A_qual', title: "Group A 2nd Place Qualification Tie-Breaker", p1: A[1], p2: A[2], group: 'A' });
  } 
  // Check Group A seeding priority boundary tie (1st vs 2nd)
  else if (stats[A[0]].pts === stats[A[1]].pts && stats[A[0]].wins === stats[A[1]].wins) {
    tieMatchesQueue.push({ id: 'A_seed', title: "Group A 1st Place Seeding Priority Tie-Breaker", p1: A[0], p2: A[1], group: 'A' });
  }

  // Check Group B qualification boundary tie (2nd vs 3rd)
  if (stats[B[1]].pts === stats[B[2]].pts && stats[B[1]].wins === stats[B[2]].wins) {
    tieMatchesQueue.push({ id: 'B_qual', title: "Group B 2nd Place Qualification Tie-Breaker", p1: B[1], p2: B[2], group: 'B' });
  }
  // Check Group B seeding priority boundary tie (1st vs 2nd)
  else if (stats[B[0]].pts === stats[B[1]].pts && stats[B[0]].wins === stats[B[1]].wins) {
    tieMatchesQueue.push({ id: 'B_seed', title: "Group B 1st Place Seeding Priority Tie-Breaker", p1: B[0], p2: B[1], group: 'B' });
  }

  if (tieMatchesQueue.length > 0) {
    document.getElementById("tieBreakerSection").classList.remove("hidden");
    renderTieBreakersUI();
  } else {
    initQuarterFinals();
  }
}

function renderTieBreakersUI() {
  let html = "";
  tieMatchesQueue.forEach(m => {
    html += `
      <div class="match-item" style="border: 1px solid #ef4444;" id="tie_card_${m.id}">
        <div class="center" style="font-size:0.8rem; font-weight:bold; color:#ef4444; margin-bottom:4px;">${m.title}</div>
        <div class="match-row">
          <div class="team-action-block">
            <span class="match-team-name">${m.p1}</span>
            <button class="btn-success" style="margin-top:6px; padding:6px 12px; min-height:34px;" onclick="resolveTieMatch('${m.id}', 1)">Wins Match</button>
          </div>
          <div class="match-vs-box">VS</div>
          <div class="team-action-block">
            <span class="match-team-name">${m.p2}</span>
            <button class="btn-success" style="margin-top:6px; padding:6px 12px; min-height:34px;" onclick="resolveTieMatch('${m.id}', 2)">Wins Match</button>
          </div>
        </div>
      </div>`;
  });
  document.getElementById("tieBreakerMatchesContainer").innerHTML = html;
}

function resolveTieMatch(id, winnerSide) {
  let m = tieMatchesQueue.find(x => x.id === id);
  let winner = winnerSide === 1 ? m.p1 : m.p2;
  let loser = winnerSide === 1 ? m.p2 : m.p1;

  // Award an incremental decimal bonus point to instantly resolve the matrix sort rank
  stats[winner].pts += 0.1;
  stats[winner].wins++;
  stats[loser].losses++;

  // Hide the resolved option card node cleanly
  document.getElementById(`tie_card_${id}`).innerHTML = `
    <div class="center status-badge saved" style="background:#ef4444;">
      Resolved: ${winner} Advanced higher via Playoff
    </div>`;

  // Filter the queue map dynamically
  tieMatchesQueue = tieMatchesQueue.filter(x => x.id !== id);

  updateTables();

  if (tieMatchesQueue.length === 0) {
    document.getElementById("tieBreakerSection").classList.add("hidden");
    initQuarterFinals();
  }
}

function sortGroupEntries(group) {
  return [...group].sort((a, b) => {
    if (stats[b].pts !== stats[a].pts) return stats[b].pts - stats[a].pts;
    return stats[b].wins - stats[a].wins;
  });
}

function updateTables() {
  let sortedA = sortGroupEntries(groupA);
  let sortedB = sortGroupEntries(groupB);

  function fillHTML(id, list) {
    document.getElementById(id).innerHTML = list.map(p => `
      <tr>
        <td style="font-weight:700; text-align:left;">${p}</td>
        <td>${stats[p].wins}</td>
        <td>${stats[p].losses}</td>
        <td>${stats[p].draws}</td>
        <td style="font-weight:bold; color:var(--primary-color);">${Math.floor(stats[p].pts)}</td>
      </tr>
    `).join("");
  }
  fillHTML("tableA", sortedA);
  fillHTML("tableB", sortedB);
}

function initQuarterFinals() {
  let A = sortGroupEntries(groupA);
  let B = sortGroupEntries(groupB);

  quarterMatches = [
    { id: 0, title: "Quarter Final 1 (A1 vs B2)", p1: A[0], p2: B[1], winner: null, loser: null },
    { id: 1, title: "Quarter Final 2 (B1 vs A2)", p1: B[0], p2: A[1], winner: null, loser: null }
  ];

  document.getElementById("quarterSection").classList.remove("hidden");
  renderQuarterUI();
}

function renderQuarterUI() {
  let html = "";
  quarterMatches.forEach((m, idx) => {
    if (m.winner) {
      html += `
        <div class="match-item center">
          <div style="font-size:0.75rem; font-weight:bold; color:var(--text-muted);">${m.title} Completed</div>
          <span class="status-badge saved">Winner: ${m.winner}</span>
        </div>`;
    } else {
      html += `
        <div class="match-item">
          <div class="center" style="font-size:0.75rem; font-weight:bold; color:var(--primary-color); margin-bottom:5px;">${m.title}</div>
          <div class="match-row">
            <div class="team-action-block">
              <span class="match-team-name">${m.p1}</span>
              <button class="btn-success" style="width:100%; margin-top:6px; padding:8px;" onclick="saveQuarterResult(${idx}, 1)">Winner</button>
            </div>
            <div class="match-vs-box">VS</div>
            <div class="team-action-block">
              <span class="match-team-name">${m.p2}</span>
              <button class="btn-success" style="width:100%; margin-top:6px; padding:8px;" onclick="saveQuarterResult(${idx}, 2)">Winner</button>
            </div>
          </div>
        </div>`;
    }
  });
  document.getElementById("quarters").innerHTML = html;
}

function saveQuarterResult(idx, winnerSide) {
  let m = quarterMatches[idx];
  m.winner = winnerSide === 1 ? m.p1 : m.p2;
  m.loser = winnerSide === 1 ? m.p2 : m.p1;

  stats[m.winner].wins++;
  stats[m.loser].losses++;

  renderQuarterUI();

  if (quarterMatches.every(x => x.winner !== null)) {
    document.getElementById("path-line-qf1").innerText = `QF1 Result: ${quarterMatches[0].winner} beat ${quarterMatches[0].loser}`;
    document.getElementById("path-line-qf2").innerText = `QF2 Result: ${quarterMatches[1].winner} beat ${quarterMatches[1].loser}`;
    initBronzeSemifinal();
  }
}

function initBronzeSemifinal() {
  bronzeSemiMatch = { p1: quarterMatches[0].loser, p2: quarterMatches[1].loser, winner: null };
  document.getElementById("semiSection").classList.remove("hidden");

  document.getElementById("semis").innerHTML = `
    <div class="match-item" id="bronzeSemiCard">
      <div class="center" style="font-size:0.75rem; font-weight:bold; color:var(--warning-color); margin-bottom:5px;">Semifinal (Bronze Track)</div>
      <div class="match-row">
        <div class="team-action-block">
          <span class="match-team-name">${bronzeSemiMatch.p1}</span>
          <button class="btn-warning" style="width:100%; margin-top:6px; padding:8px;" onclick="saveBronzeSemiResult(1)">Win Bronze</button>
        </div>
        <div class="match-vs-box">VS</div>
        <div class="team-action-block">
          <span class="match-team-name">${bronzeSemiMatch.p2}</span>
          <button class="btn-warning" style="width:100%; margin-top:6px; padding:8px;" onclick="saveBronzeSemiResult(2)">Win Bronze</button>
        </div>
      </div>
    </div>`;
}

function saveBronzeSemiResult(winnerSide) {
  document.getElementById("bronzeSemiCard").innerHTML = `<div class="center status-badge saved">Bronze Winner Decided</div>`;
  podium.third = winnerSide === 1 ? bronzeSemiMatch.p1 : bronzeSemiMatch.p2;
  let playoffLoser = winnerSide === 1 ? bronzeSemiMatch.p2 : bronzeSemiMatch.p1;

  stats[podium.third].wins++;
  stats[playoffLoser].losses++;
  
  document.getElementById("path-line-bsf").innerText = `Bronze SF: ${podium.third} earned 3rd Place over ${playoffLoser}`;
  initGrandFinal();
}

function initGrandFinal() {
  grandFinalMatch = { p1: quarterMatches[0].winner, p2: quarterMatches[1].winner };
  document.getElementById("finalSection").classList.remove("hidden");

  document.getElementById("final").innerHTML = `
    <div class="match-item" id="finalCard">
      <div class="center" style="font-size:0.75rem; font-weight:bold; color:var(--success-color); margin-bottom:5px;">Championship Grand Final Match</div>
      <div class="match-row">
        <div class="team-action-block">
          <span class="match-team-name">${grandFinalMatch.p1}</span>
          <button class="btn-success" style="width:100%; margin-top:6px; padding:8px;" onclick="saveFinalResult(1)">Crown Winner</button>
        </div>
        <div class="match-vs-box">VS</div>
        <div class="team-action-block">
          <span class="match-team-name">${grandFinalMatch.p2}</span>
          <button class="btn-success" style="width:100%; margin-top:6px; padding:8px;" onclick="saveFinalResult(2)">Crown Winner</button>
        </div>
      </div>
    </div>`;
}

function saveFinalResult(winnerSide) {
  document.getElementById("finalCard").innerHTML = `<div class="center status-badge saved">Tournament Concluded</div>`;
  
  podium.first = winnerSide === 1 ? grandFinalMatch.p1 : grandFinalMatch.p2;
  podium.second = winnerSide === 1 ? grandFinalMatch.p2 : grandFinalMatch.p1;

  stats[podium.first].wins++;
  stats[podium.second].losses++;

  document.getElementById("path-line-gf").innerText = `Grand Final: ${podium.first} won Gold vs ${podium.second}`;

  // Populate explicit Rank board textual values
  document.getElementById("lbl-rank-1").innerText = podium.first;
  document.getElementById("lbl-rank-2").innerText = podium.second;
  document.getElementById("lbl-rank-3").innerText = podium.third;

  // Add the total no. of matches won, lost, and drawn directly onto the summary board card
  document.getElementById("stats-rank-1").innerText = `(${stats[podium.first].wins}W - ${stats[podium.first].losses}L - ${stats[podium.first].draws}D)`;
  document.getElementById("stats-rank-2").innerText = `(${stats[podium.second].wins}W - ${stats[podium.second].losses}L - ${stats[podium.second].draws}D)`;
  document.getElementById("stats-rank-3").innerText = `(${stats[podium.third].wins}W - ${stats[podium.third].losses}L - ${stats[podium.third].draws}D)`;

  // Populate lower graphic podium
  document.getElementById("p-first").innerText = podium.first;
  document.getElementById("p-second").innerText = podium.second;
  document.getElementById("p-third").innerText = podium.third;
  
  document.getElementById("summary-timestamp").innerText = new Date().toLocaleDateString() + " | Final Summary Board";

  document.getElementById("screenshot-summary-area").classList.remove("hidden");
  document.getElementById("screenshot-summary-area").scrollIntoView({ behavior: 'smooth' });
}