#!/usr/bin/env node

/**
 * Suspicion Level Test - Shows calculation examples
 * Run with: node suspicion-test.js
 */

// Mock the votingHistory format
function testSuspicionCalculation(scenario) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`SCENARIO: ${scenario.name}`);
    console.log(`${'='.repeat(70)}`);
    
    const targetHistory = scenario.votingHistory;
    let suspicionScore = 0;
    let reasons = [];

    // Get tracking data
    const innocentAccusations = targetHistory.innocentAccusations ? targetHistory.innocentAccusations.length : 0;
    const innocentGuiltyVotes = targetHistory.innocentGuiltyVotes ? targetHistory.innocentGuiltyVotes.length : 0;
    const verdictGuiltyVotesAgainst = targetHistory.verdictGuiltyVotes ? targetHistory.verdictGuiltyVotes.length : 0;
    const votesAgainst = scenario.votesAgainst || 0;
    let votesFor = targetHistory.accusationVotes ? targetHistory.accusationVotes.length : 0;
    const rumorsAgainstThem = scenario.rumors || 0;

    console.log(`\n📊 VOTING PATTERN ANALYSIS:`);
    console.log(`   • Innocent Accusations Made: ${innocentAccusations}`);
    console.log(`   • Innocent Guilty Votes Made: ${innocentGuiltyVotes}`);
    console.log(`   • Guilty Votes Received: ${verdictGuiltyVotesAgainst}`);
    console.log(`   • Total Accusations Made: ${votesFor}`);
    console.log(`   • Accusation Votes Against Them: ${votesAgainst}`);
    console.log(`   • Rumors About Them: ${rumorsAgainstThem}`);

    // INCOMING SUSPICION
    if (votesAgainst >= 2) {
        const points = votesAgainst * 15;
        suspicionScore += points;
        reasons.push(`+${points} - ${votesAgainst} players voted to accuse them`);
    }

    if (verdictGuiltyVotesAgainst >= 1) {
        const points = verdictGuiltyVotesAgainst * 25;
        suspicionScore += points;
        reasons.push(`+${points} - ${verdictGuiltyVotesAgainst} guilty vote(s) received during verdict`);
    }

    // OUTGOING SUSPICION
    if (innocentAccusations >= 1) {
        const points = innocentAccusations * 20;
        suspicionScore += points;
        reasons.push(`+${points} - Accused ${innocentAccusations} innocent player(s)`);
    }

    if (innocentGuiltyVotes >= 1) {
        const points = innocentGuiltyVotes * 30;
        suspicionScore += points;
        reasons.push(`+${points} - Voted guilty for ${innocentGuiltyVotes} innocent player(s)`);
    }

    // RUMORS
    if (rumorsAgainstThem >= 1) {
        const points = rumorsAgainstThem * 35;
        suspicionScore += points;
        reasons.push(`+${points} - ${rumorsAgainstThem} rumor(s) in circulation about them`);
    }

    // BONUS FOR CLEAR INNOCENTS
    if (innocentAccusations === 0 && innocentGuiltyVotes === 0 && votesFor >= 2) {
        const points = 15;
        suspicionScore -= points;
        reasons.push(`-${points} - Clean voting record - consistently accurate`);
    }

    // Clamp and determine level
    suspicionScore = Math.max(0, Math.min(100, suspicionScore));
    
    let level = 'Clear';
    if (suspicionScore >= 90) {
        level = 'Very Suspicious';
    } else if (suspicionScore >= 65) {
        level = 'Suspicious';
    } else if (suspicionScore >= 40) {
        level = 'Moderate';
    } else if (suspicionScore >= 15) {
        level = 'Low';
    }

    console.log(`\n🔍 CALCULATION BREAKDOWN:`);
    reasons.forEach(r => console.log(`   ${r}`));
    
    console.log(`\n📈 FINAL SUSPICION SCORE: ${suspicionScore}/100`);
    console.log(`🏷️  SUSPICION LEVEL: ${level}`);
    
    // Color coding for output
    const levelEmoji = level === 'Very Suspicious' ? '🔴' :
                      level === 'Suspicious' ? '🟠' :
                      level === 'Moderate' ? '🟡' :
                      level === 'Low' ? '🟢' : '⚪';
    console.log(`\n${levelEmoji} DETECTIVE'S ASSESSMENT: ${level}`);
}

// TEST SCENARIOS
const scenarios = [
    {
        name: "Innocent Player (Good Voting)",
        votingHistory: {
            innocentAccusations: [],
            innocentGuiltyVotes: [],
            verdictGuiltyVotes: [],
            accusationVotes: ['Syndicate1', 'Syndicate2']
        },
        votesAgainst: 0,
        rumors: 0
    },
    {
        name: "Syndicate (Voting Guilty for All Innocents)",
        votingHistory: {
            innocentAccusations: [],
            innocentGuiltyVotes: ['Innocent1', 'Innocent2', 'Innocent3'],
            verdictGuiltyVotes: [],
            accusationVotes: ['Innocent1', 'Innocent2', 'Innocent3']
        },
        votesAgainst: 1,
        rumors: 0
    },
    {
        name: "Innocent Making Mistakes (Accused Wrong Player Twice)",
        votingHistory: {
            innocentAccusations: ['Syndicate1', 'Innocent2'],
            innocentGuiltyVotes: ['Innocent1'],
            verdictGuiltyVotes: [],
            accusationVotes: ['Syndicate1', 'Innocent2', 'Innocent3']
        },
        votesAgainst: 0,
        rumors: 0
    },
    {
        name: "Suspected Player (Multiple Accusations + Rumors)",
        votingHistory: {
            innocentAccusations: ['Innocent1', 'Innocent2'],
            innocentGuiltyVotes: ['Innocent1'],
            verdictGuiltyVotes: ['Player1', 'Player2'],
            accusationVotes: ['Innocent1', 'Innocent2']
        },
        votesAgainst: 3,
        rumors: 2
    },
    {
        name: "Syndicate Being Watched (Multiple Guilty Votes)",
        votingHistory: {
            innocentAccusations: [],
            innocentGuiltyVotes: ['Innocent1', 'Innocent2', 'Innocent3'],
            verdictGuiltyVotes: ['Player1', 'Player2', 'Player3'],
            accusationVotes: ['Innocent1', 'Innocent2']
        },
        votesAgainst: 2,
        rumors: 1
    }
];

// Run all scenarios
scenarios.forEach(scenario => testSuspicionCalculation(scenario));

console.log(`\n${'='.repeat(70)}`);
console.log('LEGEND:');
console.log('  🔴 Very Suspicious (80+)  - Likely Syndicate');
console.log('  🟠 Suspicious (65-89)     - Strong suspicion');
console.log('  🟡 Moderate (40-64)       - Some concerns');
console.log('  🟢 Low (15-39)            - Minor suspicion');
console.log('  ⚪ Clear (0-14)           - Seems trustworthy');
console.log(`${'='.repeat(70)}\n`);
