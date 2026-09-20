// Explicit local opponents only. Never connect bots to matchmaking or award online scores.
export const botPracticeEnabled = () => {
  const p = new URLSearchParams(location.search);
  return p.get('practice') === '1' && p.get('bots') === '1';
};
export function botPracticeUrl(mode) {
  if (!['balloon', 'basket', 'penalty', 'race', 'rockets'].includes(mode)) throw Error('Unknown minigame');
  return (mode === 'basket' || mode === 'penalty' ? `/67park-foundation-next/sports/?mode=${mode}&` : `/67park-foundation-next/${mode}/?`) + 'practice=1&bots=1';
}
export function practiceRoster(player, count) {
  return [player, ...['Mint', 'Honey', 'Sky', 'Rose'].slice(0, count).map((name, i) => ({
    id: `training-bot-${i}`, name: `${name} BOT`, combo: player.combo, bot: true,
  }))];
}
// The same aim/charge/release and keeper inputs as a person, with reaction time
// and imperfect aim. No direct ball, score or character position writes.
export function stepSportsBots(sim, humanId) {
  if (sim.over) return;
  const shooter = sim.current();
  if (shooter.id !== humanId && sim.phase === 'aim') {
    const round = shooter.attempts;
    if (sim.phaseTime >= 1 && sim.chargeStart === null) {
      const x = sim.mode === 'basket' ? [.015, -.035, .2, .025, -.03][round % 5] : [-.58, .48, -.25, .62, -.45][round % 5];
      sim.input(shooter.id, {action: 'aim', x, y: sim.mode === 'basket' ? .01 : .12});
      sim.input(shooter.id, {action: 'charge'});
    } else if (sim.chargeStart !== null && sim.tick - sim.chargeStart >= 47) {
      sim.input(shooter.id, {action: 'release'});
    }
  }
  const defender = sim.defender();
  if (sim.mode === 'penalty' && defender && defender !== humanId) {
    const reacting = sim.phase === 'flight' && sim.shot.age > .22;
    const target = reacting ? sim.shot.origin[0] + sim.shot.velocity[0] * sim.rules.flightSeconds : Math.sin(sim.age * .9) * .75;
    const error = Math.sin(sim.turn * 2.3 + 1) * .85;
    sim.input(defender, {action: 'keeper', x: Math.max(-1, Math.min(1, (target + error) / sim.rules.keeperRange))});
    if (reacting && sim.shot.age > .39 && sim.keeper.cd <= 0) sim.input(defender, {action: 'dive'});
  }
}
export function raceBotInputs(sim, humanId, humanInput, followTrack) {
  const inputs = new Map([[humanId, humanInput]]);
  for (const bot of sim.players) if (bot.id !== humanId && bot.alive && !bot.finished) {
    inputs.set(bot.id, {...followTrack(bot), reset: Math.abs(bot.speed) < .3 && sim.age > 8 && bot.resetAge > 8});
  }
  return inputs;
}
export const botPracticeStyles = `
.community-game-option{display:flex;flex-direction:column;gap:6px;min-width:0}
.community-game-option>button{flex:1;width:100%}
.online-dialog a.community-bot-test{display:flex;align-items:center;justify-content:center;min-height:44px;padding:7px 8px;border:1px solid #83bca8;border-radius:14px;background:#dff2e9;color:#294f43;text-align:center;font-size:12px;font-weight:750;text-decoration:none;touch-action:manipulation;transition:transform 120ms ease}
.community-bot-test:active{transform:scale(.97)}
.community-bot-test:focus-visible{outline:3px solid #548fbc;outline-offset:2px}
.community-bot-test[aria-disabled=true]{opacity:.5;cursor:not-allowed}
@media(prefers-reduced-motion:reduce){.online-dialog a.community-bot-test{transition:none;transform:none}}
`;
