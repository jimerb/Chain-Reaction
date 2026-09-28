/* Computer opponents use the same public actions and legal choices as humans. */
(function (root) {
    function computerAction(game) {
        if (game.phase === 'READY') return { type: 'roll' };
        if (game.phase === 'TURN_END') return { type: 'next' };
        if (game.phase === 'REVIEW') {
            const choices = game.choices().sort((a, b) => b.score - a.score || a.count - b.count);
            if (game.canUse('fusion')) {
                const alt = game.fusionOptions.sort((a, b) => b.score - a.score)[0];
                const score = alt.score;
                if (score >= 18 || !choices.length || score + game.player.score >= game.target) return { type: 'fusion', value: alt.value };
            }
            if (!choices.length) {
                if (game.canUse('enrichment')) return { type: 'enrich', ...game.enrichmentOptions().sort((a, b) => b.value - a.value)[0] };
                if (game.canUse('controlRod')) return { type: 'controlRod' };
                return { type: 'fail' };
            }
            return { type: 'choose', value: choices[0].value };
        }
        if (game.phase === 'DECISION') {
            if (game.canUse('fusion')) {
                const alt = game.fusionOptions.sort((a, b) => b.score - a.score)[0];
                const score = alt.score;
                if (score >= 18 || game.player.score + score >= game.target) return { type: 'fusion', value: alt.value };
            }
            if (game.canUse('enrichment') && (game.held.length >= 4 || game.player.score + game.chainScore + game.chain >= game.target)) return { type: 'enrich', ...game.enrichmentOptions()[0] };
            const leader = Math.max(...game.players.map(p => p.score));
            const mustChase = game.finalRound && game.player.score + game.chainScore <= leader && game.player.score < leader;
            const insured = game.player.tokens.controlRod || game.player.tokens.enrichment;
            if (mustChase || (insured && game.available.length >= 2) || game.rollOutlook().expected > game.chainScore) return { type: 'roll' };
            return { type: 'bank' };
        }
        return null;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { computerAction };
    else root.computerAction = computerAction;
})(typeof window !== 'undefined' ? window : globalThis);
