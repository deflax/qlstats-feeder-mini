(function(exports) {
  // this is a backport of https://github.com/mmai/glicko2js to Glicko-1
  
  var MinRd = 30; // avoid that a player gets locked-in on a rating
  var q = Math.log(10) / 400; // 0.0057565
  var mathPow = Math.pow;
  Math.pow = function (b, e) { return e == 2 ? b * b : mathPow(b, e); }

  function Player(rating, rd) {
    this.__period = 0;

    this.setRating(rating);
    this.setRd(rd);
    this.__oldR = rating;
    this.__oldRd = rd;
  }

  Player.prototype.getRating = function() {
    return this.__rating;
  };

  Player.prototype.setRating = function(rating) {
    this.__rating = rating;
  };

  Player.prototype.getRd = function() {
    return this.__rd;
  };

  Player.prototype.setRd = function(rd) {
    this.__rd = rd;
  };

  Player.prototype.addResult = function(opponent, outcome) {
    this.opponents.push(opponent);
    this.outcomes.push(outcome);
  };

  Player.prototype.setPeriod = function(c2, period) {
    if (c2 && this.__period)
      this.__rd = Math.max(MinRd, Math.min(Math.sqrt(Math.pow(this.__rd, 2) + c2 * (period - this.__period)), this.defaultRd));
    this.__period = period;
  }

  // Calculates the new rating and rating deviation of the player.
  // Follows the steps of the algorithm described at http://www.glicko.net/glicko/glicko.pdf
  Player.prototype.update_rank = function(c2, period) {

    //Step 1a : done by Player initialization

    //Step 1b: increase rating deviation for the time a player didn't play
    this.setPeriod(c2, period);

    //Step 2

    var d2 = this.deviation();

    var tempSum = 0;
    for (var i = 0, len = this.opponents.length; i < len; i++) {
      var opp = this.opponents[i];
      tempSum += this._g(opp.__oldRd) * (this.outcomes[i] - this._E(opp.__oldR, opp.__oldRd));
    }


    var b = 1 / (1 / Math.pow(this.__rd, 2) + 1 / d2);

    this.__rating += q * b * tempSum;

    this.__rd = Math.max(MinRd, Math.sqrt(b));
  };


  // Calculation of the estimated deviation of the player's rating based on game outcomes
  Player.prototype.deviation = function() {
    var tempSum = 0;
    for (var i = 0, len = this.opponents.length; i < len; i++) {
      var opp = this.opponents[i];
      var tempE = this._E(opp.__oldR, opp.__oldRd);
      tempSum += Math.pow(this._g(opp.__oldRd), 2) * tempE * (1 - tempE);
    }
    return 1 / (Math.pow(q, 2) * tempSum);
  };

  // The Glicko E function.
  Player.prototype._E = function(p2rating, p2RD) {
    return 1 / (1 + Math.pow(10, -1 * this._g(p2RD) * (this.__rating - p2rating) / 400));
  };

  // The Glicko g(RD) function.
  Player.prototype._g = function(RD) {
    return 1 / Math.sqrt(1 + 3 * Math.pow(q * RD / Math.PI, 2));
  };
  
  //=========================  Glicko class =============================================
  function Glicko(settings) {
    settings = settings || {};

    // Default rating
    this._default_rating = settings.rating || 1500;

    // Default rating deviation (small number = good confidence on the
    // rating accuracy)
    this._default_rd = settings.rd || 350;

    this._period = 0;
    this._c2 = Math.pow(settings.c || 0, 2);

    this.players_index = 0;
    this.activePlayers = {};
  }
  
  Glicko.prototype.makePlayer = function (rating, rd) {
    id = ++this.players_index;
    var player = new Player(rating || this._default_rating, rd || this._default_rd);
    var playerProto = Object.getPrototypeOf(player);
    
    // Set this specific Player's `defaultRating`. This _has_ to be done
    // here in order to ensure that new `Glicko` instances do not change
    // the `defaultRating` of `Player` instances created under previous
    // `Glicko` instances.
    playerProto.defaultRating = this._default_rating;
    playerProto.defaultRd = this._default_rd;
    
    // Since this `Player`'s rating was calculated upon instantiation,
    // before the `defaultRating` was defined above, we much re-calculate
    // the rating manually.
    player.setRating(rating || this._default_rating);
    
    player.id = id;
    player.opponents = [];
    player.outcomes = [];
    return player;
  };
  
  Glicko.prototype.getActivePlayers = function () {
    var self = this;
    return Object.keys(this.activePlayers).map(function(key) { return self.activePlayers[key] });
  };

  Glicko.prototype.cleanPreviousMatches = function () {
    this.getActivePlayers().forEach(function(player) {
      player.opponents = [];
      player.outcomes = [];
      player.__oldR = player.__rating;
      player.__oldRd = player.__rd;
    });
    this.activePlayers = {};
  };

  Glicko.prototype.calculatePlayersRatings = function(period) {
    this._period = period || this._period + 1;
    var self = this;
    this.getActivePlayers().forEach(function(player) {
      player.update_rank(self._c2, self._period);
    });
  };

  /** 
    * Add a match result to be taken in account for the new rankings calculation
    * @param {Player} player1 The first player
    * @param {Player} player2 The second player
    * @param {number} outcome The outcome : 0 = defeat, 1 = victory, 0.5 = draw
    */
  Glicko.prototype.addResult = function(player1, player2, outcome) {
    player1.addResult(player2, outcome);
    player2.addResult(player1, 1 - outcome);
    this.activePlayers[player1.id] = player1;
    this.activePlayers[player2.id] = player2;
  };

  Glicko.prototype.setPeriod = function(players, period) {
    for (var i=0, len=players.length; i<len; i++)
      players[i].setPeriod(this._c2, period);
  }

  exports.Glicko = Glicko;

})(typeof exports === 'undefined' ? this['glicko'] = {} : exports);