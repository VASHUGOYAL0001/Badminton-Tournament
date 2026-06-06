let groupingMode = 'random';
let groupA = [];
let groupB = [];
let stats = {};
let tournamentName = "Championship Open";

let fixtureListA = [];
let fixtureListB = [];
let currentMatchIdxA = 0;
let currentMatchIdxB = 0;

let actionHistory = []; 
let tieMatchesQueue = [];
let quarterMatches = [];
let bronzeSemiMatch = null;
let grandFinalMatch = null;
let podium = { first: "", second: "", third: "" };

function toggleTheme() {
  document.body.classList.toggle('light-mode');
  saveStateToLocalStorage();
}

// Fixed theme toggle trigger to preserve active state flags correctly
function setGroupingMode(mode) {
  groupingMode = mode;
  document.getElementById('btnRandom').classList.toggle('active', mode === 'random');
  document.getElementById('btnCustom').classList.toggle('active', mode === 'custom');
  renderInputs();
}

function renderInputs() {
  let html = "";
  let btn = document.getElementById("mainSetupBtn");

  if (groupingMode === 'random') {
    btn.innerText = "Randomize Groups & Start";
    html = `<div class="grid-inputs">`;
    for(let i = 1; i <= 8; i++) {
      html += `
        <div class="input-card">
          <label>Player ${i}</label>
          <input type="text" class="player-input" placeholder="Enter Name">
        </div>`;
    }
    html += `</div>`;
  } else {
    btn.innerText = "Lock Roster & Define Custom Pairs";
    html = `
      <div class="grid-tables" style="margin-bottom: 10px;">
        <div>
          <h3 style="color: var(--primary-color); margin-bottom:4px;">Group A Roster</h3>
          <div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="Enter Name"></div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="Enter Name"></div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="Enter Name"></div>
            <div class="input-card"><input type="text" class="player-input-a" placeholder="Enter Name"></div>
          </div>
        </div>
        <div>
          <h3 style="color: var(--primary-color); margin-bottom:4px;">Group B Roster</h3>
          <div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="Enter Name"></div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="Enter Name"></div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="Enter Name"></div>
            <div class="input-card"><input type="text" class="player-input-b" placeholder="Enter Name"></div>
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
  tournamentName = document.getElementById("txtTournamentName").value.trim() || "Championship Open";
  
  if (groupingMode === 'random') {
    let inputs = [...document.querySelectorAll(".player-input")].map(x => x.value.trim());
    if(inputs.some(x => !x)) { alert("Please fill out all 8 fields."); return; }
    if (new Set(inputs).size !== inputs.length) { alert("All names must be completely unique."); return; }

    shuffleArray(inputs);
    groupA = inputs.slice(0, 4);
    groupB = inputs.slice(4, 8);
    
    initializeTournamentBackend(false);
  } else {
    groupA = [...document.querySelectorAll(".player-input-a")].map(x => x.value.trim());
    groupB = [...document.querySelectorAll(".player-input-b")].map(x => x.value.trim());
    if(groupA.some(x => !x) || groupB.some(x => !x)) { alert("Please complete both group rosters."); return; }
    
    let combined = groupA.concat(groupB);
    if (new Set(combined).size !== combined.length) { alert("All names must be unique."); return; }

    document.getElementById("setup").classList.add("hidden");
    document.getElementById("customMatchmakingWrapper").classList.remove("hidden");
    buildCustomDropdowns();
  }
}

function buildCustomDropdowns() {
  function makeOptions(list) { return list.map(p => `<option value="${p}">${p}</option>`).join(""); }
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
  fixtureListA = []; fixtureListB = [];
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
    let formula = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
    fixtureListA = formula.map(pair => ({ p1: groupA[pair[0]], p2: groupA[pair[1]], done: false, winText: '' }));
    fixtureListB = formula.map(pair => ({ p1: groupB[pair[0]], p2: groupB[pair[1]], done: false, winText: '' }));
  }

  currentMatchIdxA = 0; currentMatchIdxB = 0;
  actionHistory = []; document.getElementById("btnUndo").disabled = true;

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("main").classList.remove("hidden");

  document.body.classList.remove('bronze-stage-theme', 'final-stage-theme');

  renderGroupFormations();
  renderTimelineSchedules();
  renderLiveScoringBlock('A');
  renderLiveScoringBlock('B');
  updateTables();
  calculateDashboardMetrics();
  saveStateToLocalStorage();
}

function renderGroupFormations() {
  function fillFormation(id, list) {
    document.getElementById(id).innerHTML = list.map((p, idx) => `
      <tr><td>Slot ${idx+1}</td><td style="font-weight:600; text-align:left;">${p}</td></tr>
    `).join("");
  }
  fillFormation("formationA", groupA);
  fillFormation("formationB", groupB);
}

function renderTimelineSchedules() {
  function generateListHTML(list, currentIdx) {
    return list.map((m, idx) => {
      let statusClass = "status-pending";
      let label = "Pending";
      if (m.done) {
        statusClass = "status-completed";
        label = m.winText;
      } else if (idx === currentIdx) {
        statusClass = "status-ongoing";
        label = "Ongoing";
      }
      return `<div class="timeline-card ${statusClass}"><span>Slot ${idx+1}: ${m.p1} vs ${m.p2}</span><span class="status-badge">${label}</span></div>`;
    }).join("");
  }
  document.getElementById("scheduleTimelineA").innerHTML = generateListHTML(fixtureListA, currentMatchIdxA);
  document.getElementById("scheduleTimelineB").innerHTML = generateListHTML(fixtureListB, currentMatchIdxB);
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
        <div class="team-action-block"><span class="match-team-name">${m.p1}</span></div>
        <div class="match-vs-box">VS</div>
        <div class="team-action-block"><span class="match-team-name">${m.p2}</span></div>
      </div>
      
      <div class="outcome-action-row">
        <button class="btn-success" onclick="processOutcomeClick('${groupName}', 1)">P1 Win</button>
        <button class="btn-warning" onclick="processOutcomeClick('${groupName}', 'draw')">Draw</button>
        <button class="btn-success" onclick="processOutcomeClick('${groupName}', 2)">P2 Win</button>
      </div>
    </div>`;
}

function saveStateToHistory() {
  actionHistory.push({
    currentMatchIdxA, currentMatchIdxB, stats: JSON.parse(JSON.stringify(stats)),
    fixtureListA: JSON.parse(JSON.stringify(fixtureListA)), fixtureListB: JSON.parse(JSON.stringify(fixtureListB)),
    tieMatchesQueue: JSON.parse(JSON.stringify(tieMatchesQueue)), quarterMatches: JSON.parse(JSON.stringify(quarterMatches)),
    bronzeSemiMatch: JSON.parse(JSON.stringify(bronzeSemiMatch)), grandFinalMatch: JSON.parse(JSON.stringify(grandFinalMatch)),
    podium: JSON.parse(JSON.stringify(podium)),
    bodyClasses: Array.from(document.body.classList),
    visibility: {
      schedulesContainer: !document.getElementById("schedulesContainer").classList.contains("hidden"),
      groupLiveControlSection: !document.getElementById("groupLiveControlSection").classList.contains("hidden"),
      "standings-container": !document.getElementById("standings-container").classList.contains("hidden"),
      tieBreakerSection: !document.getElementById("tieBreakerSection").classList.contains("hidden"),
      quarterSection: !document.getElementById("quarterSection").classList.contains("hidden"),
      semiSection: !document.getElementById("semiSection").classList.contains("hidden"),
      finalSection: !document.getElementById("finalSection").classList.contains("hidden"),
      masterLedgerSection: !document.getElementById("masterLedgerSection").classList.contains("hidden"),
      "screenshot-summary-area": !document.getElementById("screenshot-summary-area").classList.contains("hidden")
    }
  });
  document.getElementById("btnUndo").disabled = false;
}

function undoLastAction() {
  if (actionHistory.length === 0) return;
  let prev = actionHistory.pop();

  currentMatchIdxA = prev.currentMatchIdxA; currentMatchIdxB = prev.currentMatchIdxB;
  stats = prev.stats; fixtureListA = prev.fixtureListA; fixtureListB = prev.fixtureListB;
  tieMatchesQueue = prev.tieMatchesQueue; quarterMatches = prev.quarterMatches;
  bronzeSemiMatch = prev.bronzeSemiMatch; grandFinalMatch = prev.grandFinalMatch; podium = prev.podium;

  document.body.className = "";
  prev.bodyClasses.forEach(c => document.body.classList.add(c));

  for (let key in prev.visibility) {
    let el = document.getElementById(key);
    if (el) { if (prev.visibility[key]) el.classList.remove("hidden"); else el.classList.add("hidden"); }
  }

  updateTables(); renderTimelineSchedules(); renderLiveScoringBlock('A'); renderLiveScoringBlock('B'); calculateDashboardMetrics();
  if (!document.getElementById("tieBreakerSection").classList.contains("hidden")) renderTieBreakersUI();
  if (!document.getElementById("quarterSection").classList.contains("hidden")) renderQuarterUI();
  if (!document.getElementById("semiSection").classList.contains("hidden") && bronzeSemiMatch) { if (!podium.third) initBronzeSemifinal(); }
  if (!document.getElementById("finalSection").classList.contains("hidden") && grandFinalMatch) { if (!podium.first) initGrandFinal(); }

  if (actionHistory.length === 0) document.getElementById("btnUndo").disabled = true;
  saveStateToLocalStorage();
}

function resetTournamentKeepPlayers() {
  if (!confirm("Reset all matching score lines? Roster profiles remain intact.")) return;

  actionHistory = []; document.getElementById("btnUndo").disabled = true;
  stats = {}; groupA.concat(groupB).forEach(n => { stats[n] = { wins: 0, losses: 0, draws: 0, pts: 0 }; });

  fixtureListA.forEach(m => { m.done = false; m.winText = ''; });
  fixtureListB.forEach(m => { m.done = false; m.winText = ''; });

  currentMatchIdxA = 0; currentMatchIdxB = 0; tieMatchesQueue = []; quarterMatches = []; bronzeSemiMatch = null; grandFinalMatch = null;
  podium = { first: "", second: "", third: "" };

  document.body.classList.remove('bronze-stage-theme', 'final-stage-theme');

  document.getElementById("schedulesContainer").classList.remove("hidden");
  document.getElementById("groupLiveControlSection").classList.remove("hidden");
  
  document.getElementById("standings-container").classList.add("hidden");
  document.getElementById("tieBreakerSection").classList.add("hidden");
  document.getElementById("quarterSection").classList.add("hidden");
  document.getElementById("semiSection").classList.add("hidden");
  document.getElementById("finalSection").classList.add("hidden");
  document.getElementById("masterLedgerSection").classList.add("hidden");
  document.getElementById("screenshot-summary-area").classList.add("hidden");

  updateTables(); renderTimelineSchedules(); renderLiveScoringBlock('A'); renderLiveScoringBlock('B'); calculateDashboardMetrics(); saveStateToLocalStorage();
}

function processOutcomeClick(groupName, outcome) {
  saveStateToHistory();

  let list = groupName === 'A' ? fixtureListA : fixtureListB;
  let idx = groupName === 'A' ? currentMatchIdxA : currentMatchIdxB;
  let m = list[idx];

  m.done = true;

  if (outcome === 'draw') {
    m.winText = "Draw Match";
    stats[m.p1].draws++; stats[m.p1].pts += 1;
    stats[m.p2].draws++; stats[m.p2].pts += 1;
  } else if (outcome === 1) {
    m.winText = `${m.p1} Won`;
    stats[m.p1].wins++; stats[m.p1].pts += 2; stats[m.p2].losses++;
  } else {
    m.winText = `${m.p2} Won`;
    stats[m.p2].wins++; stats[m.p2].pts += 2; stats[m.p1].losses++;
  }

  if (groupName === 'A') currentMatchIdxA++; else currentMatchIdxB++;

  updateTables(); renderTimelineSchedules(); renderLiveScoringBlock(groupName); calculateDashboardMetrics(); saveStateToLocalStorage();
}

function checkGroupCompletion() {
  if (currentMatchIdxA >= fixtureListA.length && currentMatchIdxB >= fixtureListB.length) {
    document.getElementById("groupLiveControlSection").classList.add("hidden");
    document.getElementById("schedulesContainer").classList.add("hidden");
    document.getElementById("groupFormationsSection").classList.add("hidden");
    document.getElementById("standings-container").classList.remove("hidden");
    
    evaluateGroupTies();
  }
}

function evaluateGroupTies() {
  let A = sortGroupEntries(groupA); let B = sortGroupEntries(groupB);
  tieMatchesQueue = [];

  if (Math.abs(stats[A[1]].pts - stats[A[2]].pts) < 0.05) {
    tieMatchesQueue.push({ id: 'A_qual', title: "Group A Advancement Cutoff Tie Playoff", p1: A[1], p2: A[2], group: 'A' });
  }
  if (Math.abs(stats[B[1]].pts - stats[B[2]].pts) < 0.05) {
    tieMatchesQueue.push({ id: 'B_qual', title: "Group B Advancement Cutoff Tie Playoff", p1: B[1], p2: B[2], group: 'B' });
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
      <div class="match-item animate-fade-in" style="border: 1px solid #fbbf24;" id="tie_card_${m.id}">
        <div class="center" style="font-size:0.8rem; font-weight:bold; color:#fbbf24; margin-bottom:4px;">${m.title}</div>
        <div class="match-row">
          <div class="team-action-block">
            <span class="match-team-name">${m.p1}</span>
            <button class="btn-success" style="margin-top:6px; padding:6px 12px; min-height:34px;" onclick="resolveTieMatch('${m.id}', 1)">Wins Playoff</button>
          </div>
          <div class="match-vs-box">VS</div>
          <div class="team-action-block">
            <span class="match-team-name">${m.p2}</span>
            <button class="btn-success" style="margin-top:6px; padding:6px 12px; min-height:34px;" onclick="resolveTieMatch('${m.id}', 2)">Wins Playoff</button>
          </div>
        </div>
      </div>`;
  });
  document.getElementById("tieBreakerMatchesContainer").innerHTML = html;
}

function resolveTieMatch(id, winnerSide) {
  saveStateToHistory();

  let m = tieMatchesQueue.find(x => x.id === id);
  let winner = winnerSide === 1 ? m.p1 : m.p2;
  let loser = winnerSide === 1 ? m.p2 : m.p1;

  stats[winner].pts += 0.1; stats[winner].wins++; stats[loser].losses++;

  document.getElementById(`tie_card_${id}`).innerHTML = `
    <div class="center status-badge saved" style="background:#fbbf24; color:#000000; font-size: 0.8rem;">
      Playoff Logged: ${winner} advanced in ranking order
    </div>`;

  tieMatchesQueue = tieMatchesQueue.filter(x => x.id !== id);
  updateTables();
  
  setTimeout(() => {
    if (tieMatchesQueue.length === 0) {
      document.getElementById("tieBreakerSection").classList.add("hidden");
      evaluateGroupTies();
    }
  }, 1000);
}

function sortGroupEntries(group) {
  return [...group].sort((a, b) => stats[b].pts - stats[a].pts || stats[b].wins - stats[a].wins);
}

function updateTables() {
  let sortedA = sortGroupEntries(groupA); let sortedB = sortGroupEntries(groupB);

  function fillHTML(id, list) {
    document.getElementById(id).innerHTML = list.map((p, idx) => `
      <tr>
        <td style="font-weight:700; text-align:left;"><span style="color:var(--text-muted); font-size:0.75rem; margin-right:6px;">#${idx+1}</span>${p}</td>
        <td>${stats[p].wins}</td><td>${stats[p].losses}</td><td>${stats[p].draws}</td>
        <td style="font-weight:bold; color:var(--primary-color);">${Math.floor(stats[p].pts)}</td>
      </tr>`).join("");
  }
  fillHTML("tableA", sortedA); fillHTML("tableB", sortedB);
}

function calculateDashboardMetrics() {
  document.getElementById("dashTitle").innerText = `🏆 ${tournamentName} Summary Board`;
  document.getElementById("dashPlayers").innerText = "8 Enrolled";
  
  let playedCount = fixtureListA.filter(x => x.done).length + fixtureListB.filter(x => x.done).length;
  document.getElementById("dashPlayed").innerText = `${playedCount} / 12`;
  document.getElementById("dashRemaining").innerText = `${12 - playedCount}`;

  let sortedA = sortGroupEntries(groupA); let sortedB = sortGroupEntries(groupB);
  let leader = "---";
  if (playedCount > 0) {
    leader = sortedA[0];
    if (stats[sortedB[0]].pts > stats[sortedA[0]].pts) leader = sortedB[0];
  }
  document.getElementById("dashLeader").innerText = leader;
}

function initQuarterFinals() {
  let A = sortGroupEntries(groupA); let B = sortGroupEntries(groupB);

  quarterMatches = [
    { id: 0, title: "Quarter Final 1 (A1 vs B2)", p1: A[0], p2: B[1], winner: null, loser: null },
    { id: 1, title: "Quarter Final 2 (B1 vs A2)", p1: B[0], p2: A[1], winner: null, loser: null }
  ];

  document.getElementById("quarterSection").classList.remove("hidden");
  renderQuarterUI(); calculateDashboardMetrics(); saveStateToLocalStorage();
}

function renderQuarterUI() {
  let html = "";
  quarterMatches.forEach((m, idx) => {
    if (m.winner) {
      html += `<div class="match-item center animate-fade-in"><div style="font-size:0.75rem; font-weight:bold; color:var(--text-muted);">${m.title} Completed</div><span class="status-badge saved">Winner: ${m.winner}</span></div>`;
    } else {
      html += `
        <div class="match-item animate-fade-in">
          <div class="center" style="font-size:0.75rem; font-weight:bold; color:var(--primary-color); margin-bottom:5px;">${m.title}</div>
          <div class="match-row">
            <div class="team-action-block"><span class="match-team-name">${m.p1}</span><button class="btn-success" style="width:100%; margin-top:6px;" onclick="saveQuarterResult(${idx}, 1)">Winner</button></div>
            <div class="match-vs-box">VS</div>
            <div class="team-action-block"><span class="match-team-name">${m.p2}</span><button class="btn-success" style="width:100%; margin-top:6px;" onclick="saveQuarterResult(${idx}, 2)">Winner</button></div>
          </div>
        </div>`;
    }
  });
  document.getElementById("quarters").innerHTML = html;
}

function saveQuarterResult(idx, winnerSide) {
  saveStateToHistory();

  let m = quarterMatches[idx];
  m.winner = winnerSide === 1 ? m.p1 : m.p2; m.loser = winnerSide === 1 ? m.p2 : m.p1;
  stats[m.winner].wins++; stats[m.loser].losses++;

  renderQuarterUI();
  if (quarterMatches.every(x => x.winner !== null)) {
    document.getElementById("path-line-qf1").innerText = `QF1 Path: ${quarterMatches[0].winner} advanced over ${quarterMatches[0].loser}`;
    document.getElementById("path-line-qf2").innerText = `QF2 Path: ${quarterMatches[1].winner} advanced over ${quarterMatches[1].loser}`;
    initBronzeSemifinal();
  }
  saveStateToLocalStorage();
}

function findTrueRecord(name) {
  let w = 0, l = 0, d = 0;
  fixtureListA.concat(fixtureListB).forEach(m => {
    if(!m.done) return;
    if(m.p1 === name || m.p2 === name) {
      if(m.winText === "Draw Match") d++;
      else if(m.winText.startsWith(name)) w++;
      else l++;
    }
  });
  quarterMatches.forEach(m => { if(m.winner === name) w++; if(m.loser === name) l++; });
  if(bronzeSemiMatch) { if(bronzeSemiMatch.winner === name) w++; if((bronzeSemiMatch.p1 === name || bronzeSemiMatch.p2 === name) && bronzeSemiMatch.winner !== name) l++; }
  if(grandFinalMatch) { if(podium.first === name) w++; if(podium.second === name) l++; }
  return `${w}W - ${l}L - ${d}D`;
}

function initBronzeSemifinal() {
  document.body.classList.remove('final-stage-theme');
  document.body.classList.add('bronze-stage-theme');

  bronzeSemiMatch = { p1: quarterMatches[0].loser, p2: quarterMatches[1].loser, winner: null };
  document.getElementById("semiSection").classList.remove("hidden");

  document.getElementById("semis").innerHTML = `
    <div class="match-item animate-fade-in" id="bronzeSemiCard">
      <div class="center" style="font-size:0.75rem; font-weight:bold; color:var(--warning-color); margin-bottom:5px;">Semifinal (Bronze Match Tracker)</div>
      <div class="match-row">
        <div class="team-action-block"><span class="match-team-name">${bronzeSemiMatch.p1}</span><button class="btn-warning" style="width:100%; margin-top:6px;" onclick="saveBronzeSemiResult(1)">Win Bronze</button></div>
        <div class="match-vs-box">VS</div>
        <div class="team-action-block"><span class="match-team-name">${bronzeSemiMatch.p2}</span><button class="btn-warning" style="width:100%; margin-top:6px;" onclick="saveBronzeSemiResult(2)">Win Bronze</button></div>
      </div>
    </div>`;
  saveStateToLocalStorage();
}

function saveBronzeSemiResult(winnerSide) {
  saveStateToHistory();
  document.getElementById("bronzeSemiCard").innerHTML = `<div class="center status-badge saved">Bronze Winner Decided</div>`;
  podium.third = winnerSide === 1 ? bronzeSemiMatch.p1 : bronzeSemiMatch.p2; bronzeSemiMatch.winner = podium.third;
  
  let playoffLoser = winnerSide === 1 ? bronzeSemiMatch.p2 : bronzeSemiMatch.p1;
  document.getElementById("path-line-bsf").innerText = `Bronze Track: ${podium.third} earned 3rd Rank over ${playoffLoser}`;
  initGrandFinal();
}

function initGrandFinal() {
  document.body.classList.remove('bronze-stage-theme');
  document.body.classList.add('final-stage-theme');

  grandFinalMatch = { p1: quarterMatches[0].winner, p2: quarterMatches[1].winner };
  document.getElementById("finalSection").classList.remove("hidden");

  document.getElementById("final").innerHTML = `
    <div class="match-item animate-fade-in" id="finalCard">
      <div class="center" style="font-size:0.75rem; font-weight:bold; color:var(--success-color); margin-bottom:5px;">Championship Grand Final Match</div>
      <div class="match-row">
        <div class="team-action-block"><span class="match-team-name">${grandFinalMatch.p1}</span><button class="btn-success" style="width:100%; margin-top:6px;" onclick="saveFinalResult(1)">Crown Winner</button></div>
        <div class="match-vs-box">VS</div>
        <div class="team-action-block"><span class="match-team-name">${grandFinalMatch.p2}</span><button class="btn-success" style="width:100%; margin-top:6px;" onclick="saveFinalResult(2)">Crown Winner</button></div>
      </div>
    </div>`;
}

function saveFinalResult(winnerSide) {
  saveStateToHistory();
  document.getElementById("finalCard").innerHTML = `<div class="center status-badge saved">Tournament Concluded</div>`;
  
  // FIX: Revert layout modifiers safely right when match completes
  document.body.classList.remove('bronze-stage-theme', 'final-stage-theme');

  podium.first = winnerSide === 1 ? grandFinalMatch.p1 : grandFinalMatch.p2;
  podium.second = winnerSide === 1 ? grandFinalMatch.p2 : grandFinalMatch.p1;

  document.getElementById("path-line-gf").innerText = `Grand Final: ${podium.first} won Gold vs ${podium.second}`;

  document.getElementById("lbl-rank-1").innerText = podium.first;
  document.getElementById("lbl-rank-2").innerText = podium.second;
  document.getElementById("lbl-rank-3").innerText = podium.third;

  document.getElementById("stats-rank-1").innerText = findTrueRecord(podium.first);
  document.getElementById("stats-rank-2").innerText = findTrueRecord(podium.second);
  document.getElementById("stats-rank-3").innerText = findTrueRecord(podium.third);

  document.getElementById("p-first").innerText = podium.first;
  document.getElementById("p-second").innerText = podium.second;
  document.getElementById("p-third").innerText = podium.third;
  
  document.getElementById("lblSummaryTourneyName").innerText = `🏸 ${tournamentName.toUpperCase()}`;
  document.getElementById("summary-timestamp").innerText = new Date().toLocaleDateString() + " | Final Summary Board";

  // Build true 1-8 standings table tracking
  generateMasterRankLedger();

  document.getElementById("screenshot-summary-area").classList.remove("hidden");
  document.getElementById("screenshot-summary-area").scrollIntoView({ behavior: 'smooth' });
  saveStateToLocalStorage();
}

/* 📊 FIX: Re-engineered Ledger tracking cleanly eliminates duplicate entry slots */
function generateMasterRankLedger() {
  let sortedA = sortGroupEntries(groupA);
  let sortedB = sortGroupEntries(groupB);

  // Extract absolute 3rd place seeds from Group stages to evaluate Ranks 5 and 6
  let thirdPlaces = [sortedA[2], sortedB[2]].sort((a, b) => stats[b].pts - stats[a].pts || stats[b].wins - stats[a].wins);
  
  // Extract absolute 4th place seeds from Group stages to evaluate Ranks 7 and 8
  let fourthPlaces = [sortedA[3], sortedB[3]].sort((a, b) => stats[b].pts - stats[a].pts || stats[b].wins - stats[a].wins);

  let fourthPlacePlayer = (bronzeSemiMatch.p1 === podium.third ? bronzeSemiMatch.p2 : bronzeSemiMatch.p1);

  let finalRankOrder = [
    { rank: 1, name: podium.first, track: "Championship Gold Medalist" },
    { rank: 2, name: podium.second, track: "Championship Silver Medalist" },
    { rank: 3, name: podium.third, track: "Playoff Bronze Medalist" },
    { rank: 4, name: fourthPlacePlayer, track: "Playoff 4th Position Placement" },
    { rank: 5, name: thirdPlaces[0], track: "Group Stage #3 Seed Rank" },
    { rank: 6, name: thirdPlaces[1], track: "Group Stage #3 Seed Rank" },
    { rank: 7, name: fourthPlaces[0], track: "Group Stage #4 Seed Rank" },
    { rank: 8, name: fourthPlaces[1], track: "Group Stage #4 Seed Rank" }
  ];

  document.getElementById("masterLedgerTableBody").innerHTML = finalRankOrder.map(item => `
    <tr>
      <td style="font-weight:bold; color:var(--primary-color);">Rank Position #${item.rank}</td>
      <td style="font-weight:700; text-align:left;">${item.name}</td>
      <td style="font-size:0.8rem; color:var(--text-muted); text-align:left;">${item.track} (${findTrueRecord(item.name)})</td>
    </tr>
  `).join("");

  document.getElementById("masterLedgerSection").classList.remove("hidden");
}

function saveStateToLocalStorage() {
  let state = {
    groupingMode, groupA, groupB, stats, tournamentName,
    fixtureListA, fixtureListB, currentMatchIdxA, currentMatchIdxB,
    tieMatchesQueue, quarterMatches, bronzeSemiMatch, grandFinalMatch, podium,
    isLightMode: document.body.classList.contains('light-mode'),
    isMainVisible: !document.getElementById("main").classList.contains("hidden"),
    customSetupVisible: !document.getElementById("customMatchmakingWrapper").classList.contains("hidden"),
    historyCount: actionHistory.length
  };
  localStorage.setItem('badminton_pro_final_v5', JSON.stringify(state));
}

function loadStateFromLocalStorage() {
  let saved = localStorage.getItem('badminton_pro_final_v5');
  if (!saved) return;
  try {
    let state = JSON.parse(saved);
    if (state.isLightMode) document.body.classList.add('light-mode');
    groupingMode = state.groupingMode; groupA = state.groupA; groupB = state.groupB; stats = state.stats;
    tournamentName = state.tournamentName || "Championship Open";
    document.getElementById("txtTournamentName").value = tournamentName;
    fixtureListA = state.fixtureListA; fixtureListB = state.fixtureListB;
    currentMatchIdxA = state.currentMatchIdxA; currentMatchIdxB = state.currentMatchIdxB;
    tieMatchesQueue = state.tieMatchesQueue; quarterMatches = state.quarterMatches;
    bronzeSemiMatch = state.bronzeSemiMatch; grandFinalMatch = state.grandFinalMatch; podium = state.podium;

    if (state.isMainVisible) {
      document.getElementById("setup").classList.add("hidden");
      document.getElementById("main").classList.remove("hidden");
      renderGroupFormations(); updateTables(); renderTimelineSchedules();
      renderLiveScoringBlock('A'); renderLiveScoringBlock('B'); calculateDashboardMetrics();

      if (currentMatchIdxA >= fixtureListA.length && currentMatchIdxB >= fixtureListB.length) {
        document.getElementById("groupLiveControlSection").classList.add("hidden");
        document.getElementById("schedulesContainer").classList.add("hidden");
        document.getElementById("groupFormationsSection").classList.add("hidden");
        document.getElementById("standings-container").classList.remove("hidden");
      }
      if (tieMatchesQueue && tieMatchesQueue.length > 0) { document.getElementById("tieBreakerSection").classList.remove("hidden"); renderTieBreakersUI(); }
      if (quarterMatches && quarterMatches.length > 0) { document.getElementById("quarterSection").classList.remove("hidden"); renderQuarterUI(); }
      if (bronzeSemiMatch) {
        document.getElementById("semiSection").classList.remove("hidden");
        if (!podium.third) {
          document.body.classList.add('bronze-stage-theme');
          initBronzeSemifinal();
        } else {
          document.getElementById("semis").innerHTML = `<div class="center status-badge saved">Bronze Winner Decided</div>`;
        }
      }
      if (grandFinalMatch) {
        document.getElementById("finalSection").classList.remove("hidden");
        if (!podium.first) {
          document.body.classList.add('final-stage-theme');
          initGrandFinal();
        } else {
          document.getElementById("final").innerHTML = `<div class="center status-badge saved">Tournament Concluded</div>`;
        }
      }
      if (podium.first) {
        // Enforce basic normal theme fallback if completely closed out upon reloads
        document.body.classList.remove('bronze-stage-theme', 'final-stage-theme');
        document.getElementById("lbl-rank-1").innerText = podium.first; document.getElementById("lbl-rank-2").innerText = podium.second; document.getElementById("lbl-rank-3").innerText = podium.third;
        document.getElementById("stats-rank-1").innerText = findTrueRecord(podium.first); document.getElementById("stats-rank-2").innerText = findTrueRecord(podium.second); document.getElementById("stats-rank-3").innerText = findTrueRecord(podium.third);
        document.getElementById("p-first").innerText = podium.first; document.getElementById("p-second").innerText = podium.second; document.getElementById("p-third").innerText = podium.third;
        document.getElementById("lblSummaryTourneyName").innerText = `固定 ${tournamentName.toUpperCase()}`;
        document.getElementById("summary-timestamp").innerText = new Date().toLocaleDateString() + " | Final Summary Board";
        generateMasterRankLedger();
        document.getElementById("screenshot-summary-area").classList.remove("hidden");
      }
    } else if (state.customSetupVisible) {
      document.getElementById("setup").classList.add("hidden");
      document.getElementById("customMatchmakingWrapper").classList.remove("hidden");
      buildCustomDropdowns();
    }
  } catch (e) { console.error("LocalStorage load configuration properties parsing failure", e); }
}

function clearFullTournamentData() {
  if (!confirm("Wipe all local synchronized storage workspace data profiles completely?")) return;
  localStorage.removeItem('badminton_pro_final_v5'); location.reload();
}

window.addEventListener("DOMContentLoaded", loadStateFromLocalStorage);
