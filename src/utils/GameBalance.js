// src/utils/GameBalance.js

class GameBalance {
    constructor() {
      // Base stats for different unit types
      this.unitBaseStats = {
        // Player units
        'player_assault': { health: 100, damage: 15, armor: 3, attackSpeed: 0.8 },
        'player_sniper': { health: 80, damage: 30, armor: 1, attackSpeed: 2.0 },
        'player_tank': { health: 200, damage: 10, armor: 8, attackSpeed: 1.2 },
        'player_support': { health: 90, damage: 7, armor: 2, attackSpeed: 0.7 },
        
        // Enemy units
        'lightInfantry': { health: 60, damage: 10, armor: 2, attackSpeed: 0.7 },
        'heavyInfantry': { health: 150, damage: 12, armor: 8, attackSpeed: 1.2 },
        'sniperUnit': { health: 70, damage: 25, armor: 1, attackSpeed: 2.0 },
        'supportUnit': { health: 80, damage: 5, armor: 3, attackSpeed: 0.7 },
        'specialistUnit': { health: 90, damage: 15, armor: 4, attackSpeed: 0.9 },
        'eliteUnit': { health: 250, damage: 20, armor: 12, attackSpeed: 1.0 },
      };
    }
    
    // Calculate effective health (considering armor)
    calculateEffectiveHealth(unit) {
      const baseStats = this.unitBaseStats[unit.type] || { health: 100, armor: 0 };
      
      // Apply any modifiers from the unit
      const health = unit.health || baseStats.health;
      const armor = unit.armor || baseStats.armor;
      
      // Armor provides diminishing returns. Formula: effectiveHealth = health * (1 + armor/100)
      return health * (1 + armor/100);
    }
    
    // Calculate DPS (damage per second)
    calculateDPS(unit) {
      const baseStats = this.unitBaseStats[unit.type] || { damage: 10, attackSpeed: 1.0 };
      
      // Apply any modifiers from the unit
      const damage = unit.damage || baseStats.damage;
      const attackSpeed = unit.attackSpeed || baseStats.attackSpeed;
      
      return damage / attackSpeed;
    }
    
    // Calculate combat effectiveness score
    calculateCombatScore(unit) {
      const effectiveHealth = this.calculateEffectiveHealth(unit);
      const dps = this.calculateDPS(unit);
      
      // Combat score is a combination of offensive and defensive capabilities
      return effectiveHealth * dps;
    }
    
    // Simulate combat between unit groups
    simulateCombat(playerUnits, enemyUnits, iterations = 10) {
      let playerWins = 0;
      let enemyWins = 0;
      let averageTimeToResolve = 0;
      
      for (let i = 0; i < iterations; i++) {
        // Calculate total combat power for both sides with some randomness
        let playerPower = playerUnits.reduce((total, unit) => {
          const score = this.calculateCombatScore(unit);
          return total + score * (0.9 + Math.random() * 0.2); // Add 10% variance
        }, 0);
        
        let enemyPower = enemyUnits.reduce((total, unit) => {
          const score = this.calculateCombatScore(unit);
          return total + score * (0.9 + Math.random() * 0.2); // Add 10% variance
        }, 0);
        
        // Simulate combat round by round
        let totalHealth_player = playerUnits.reduce((total, unit) => 
          total + this.calculateEffectiveHealth(unit), 0);
        let totalHealth_enemy = enemyUnits.reduce((total, unit) => 
          total + this.calculateEffectiveHealth(unit), 0);
        
        let totalDPS_player = playerUnits.reduce((total, unit) => 
          total + this.calculateDPS(unit), 0);
        let totalDPS_enemy = enemyUnits.reduce((total, unit) => 
          total + this.calculateDPS(unit), 0);
        
        // Calculate time to resolve (in seconds of game time)
        let timeToResolve = 0;
        
        while (totalHealth_player > 0 && totalHealth_enemy > 0 && timeToResolve < 60) {
          // Both sides deal damage simultaneously
          totalHealth_player -= totalDPS_enemy;
          totalHealth_enemy -= totalDPS_player;
          timeToResolve += 1;
        }
        
        if (totalHealth_player <= 0 && totalHealth_enemy <= 0) {
          // Draw - give win to side with more remaining health percentage
          const playerHealthPct = totalHealth_player / playerUnits.reduce((total, unit) => 
            total + this.calculateEffectiveHealth(unit), 0);
          const enemyHealthPct = totalHealth_enemy / enemyUnits.reduce((total, unit) => 
            total + this.calculateEffectiveHealth(unit), 0);
          
          if (playerHealthPct > enemyHealthPct) {
            playerWins++;
          } else {
            enemyWins++;
          }
        } else if (totalHealth_player <= 0) {
          enemyWins++;
        } else {
          playerWins++;
        }
        
        averageTimeToResolve += timeToResolve;
      }
      
      averageTimeToResolve /= iterations;
      
      return {
        playerWins,
        enemyWins,
        winRatio: playerWins / iterations,
        averageTimeToResolve
      };
    }
    
    // Calculate ideal enemy count for balanced encounter
    calculateBalancedEncounter(playerUnits, enemyUnitTypes, targetWinRatio = 0.6, timeToResolve = 20) {
      // Start with a 1:1 ratio
      let enemyCount = playerUnits.length;
      let result = null;
      
      // Try different enemy counts
      for (let attempt = 0; attempt < 10; attempt++) {
        // Create enemy units based on distribution
        const enemyUnits = [];
        
        for (let i = 0; i < enemyCount; i++) {
          const typeIndex = i % enemyUnitTypes.length;
          enemyUnits.push({ type: enemyUnitTypes[typeIndex] });
        }
        
        // Simulate combat
        result = this.simulateCombat(playerUnits, enemyUnits);
        
        // Check if we're close to target win ratio
        if (Math.abs(result.winRatio - targetWinRatio) < 0.1 && 
            Math.abs(result.averageTimeToResolve - timeToResolve) < 5) {
          break;
        }
        
        // Adjust enemy count based on results
        if (result.winRatio > targetWinRatio) {
          // Player winning too much, add more enemies
          enemyCount = Math.ceil(enemyCount * 1.2);
        } else {
          // Enemy winning too much, reduce enemies
          enemyCount = Math.max(1, Math.floor(enemyCount * 0.8));
        }
      }
      
      return {
        recommendedEnemyCount: enemyCount,
        simulationResult: result
      };
    }
  }
  
  export default GameBalance;