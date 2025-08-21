/*:
 * @plugindesc SRPG control and display improvements
 * @author Dr. Q
 *
 * @param Hide no EXP
 * @desc Don't show the exp bar if you didn't get any
 * @type boolean
 * @on YES
 * @off NO
 * @default true
 *
 * @param Cursor-Style Movement
 * @desc Make the cursor move like a cursor
 * @type boolean
 * @on YES
 * @off NO
 * @default true
 * 
 * @param Cursor Delay
 * @desc Frame delay for cursor movement
 * @parent Cursor-Style Movement
 * @type number
 * @default 10
 *
 * @help
 * An assortment of changes and settings to make combat
 * easier to play
 * 
 * Options:
 * - Hide no EXP: Don't show the experience bar after
 *   battles that didn't grant experience, and hides
 *   the pop-up entirely if there were no rewards
 *
 *  -Cursor-Style Movement: The cursor snaps directly from
 *   one cell to the next with a sound effect. Cursor Delay
 *   controls the speed (higher = slower).
 *   This may conflict with SRPG_etcMod's cursor-style movement
 *
 * Automatic changes:
 * - Cancelling out of targeting, action select, or movement
 *   moves the cursor back to the actor
 *
 * - Status windows can also be closed with cancel/menu
 *
 * - Pressing page up, page down, or tab cycles through usable
 *   actors
 *
 * Known issues:
 * - Exp bar still appears when you get money or items, without changes to SRPG_core
 *
 */

(function(){
	// parameters
	var parameters = PluginManager.parameters('SRPG_Q_UX+');
	var hideReward = !!eval(parameters['Hide no EXP']);
	var cursorStyle = !!eval(parameters['Cursor-Style Movement']);
	var cursorDelay = Number(parameters['Cursor Delay']) || 10;

	/** don't show exp rewards if you didn't get any **/

	// rewritten victory processing, optionally skips reward window if there's no rewards
	BattleManager.processSrpgVictory = function() {
		if ($gameTroop.members()[0] && $gameTroop.isAllDead()) {
			$gameParty.performVictory();
		}
		this.makeRewards();
		// only show the rewards if there's something to show
		if (!hideReward || this._rewards.exp > 0 || this._rewards.gold > 0 || this._rewards.items.length > 0) {
			this._srpgBattleResultWindow.setRewards(this._rewards);
			var se = {}; // TODO: I'm pretty sure I can make this a parameter
			se.name = 'Item3';
			se.pan = 0;
			se.pitch = 100;
			se.volume = 90;
			AudioManager.playSe(se);
			this._srpgBattleResultWindow.open();
			this.gainRewards();
		}
		// otherwise, skip right to the end
		else {
			this.endBattle(3);
		}
	};

	// don't show the xp bar if no xp was gained
	// (protected from crashing if closures are misused)
	if (Window_SrpgBattleResult) {
		Window_SrpgBattleResult.prototype.drawContents = function() {
			var lineHeight = this.lineHeight();
			var pos = 0;
			
			// check for exp
			if (this._rewards.exp > 0) {
				this.drawGainExp(6, lineHeight * pos);
				pos += 2;
			} else {
				this._changeExp = 0;
			}
			
			// check for gold
			if (this._rewards.gold > 0) {
				this.drawGainGold(6, lineHeight * pos);
				pos += 1;
			}
			
			// items are last, so they just happen
			this.drawGainItem(0, lineHeight * pos);
		};
	}

	/** cursor-style movement **/

	var _UX_moveByInput = Game_Player.prototype.moveByInput;
	Game_Player.prototype.moveByInput = function() {
		if ($gameSystem.isSRPGMode() && cursorStyle && !this.isMoving() && this.canMove()) {
			// initialize cursor delay on the fly
			this._cursorDelay = this._cursorDelay || 0;
			this._cursorDelay--;
			
			// at the moment, no mouse support
			if (this._cursorDelay <= 0) {
				var direction = this.getInputDirection();
				if (direction > 0 && this.canPass(this._x, this._y, direction)) {
					SoundManager.playCursor();
					this.setDirection(direction);
					var x = $gameMap.roundXWithDirection(this._x, direction);
					var y = $gameMap.roundYWithDirection(this._y, direction);
					this.locate(x, y);
					this.setMovementSuccess(true);
					$gameTemp.clearDestination();
					this._cursorDelay = cursorDelay;
				}
			}
			return;
		}
		_UX_moveByInput.call(this);
	}

	/** cursor returns to actor as you cancel things **/

	// Cancel while selecting movement or target
	var _UX_updateCallMenu = Scene_Map.prototype.updateCallMenu;
	Scene_Map.prototype.updateCallMenu = function() {
		if ($gameSystem.isSRPGMode() && !$gameSystem.srpgWaitMoving()) {
			// return cursor when deselecting
			if (($gameSystem.isSubBattlePhase() === 'actor_move' ||
				$gameSystem.isSubBattlePhase() === 'actor_target') &&
				this.isMenuCalled()) {
				var event = $gameTemp.activeEvent();
				$gamePlayer.locate(event.posX(), event.posY());
			}
			// cycle through valid selections
			else if ($gameSystem.isSubBattlePhase() === 'normal') {
				this.updateSwitchActor();
			}
			else if ($gameSystem.isSubBattlePhase() === 'actor_target') {
				this.updateSwitchTarget();
			}
			// close status windows with cancel
			else if ($gameSystem.isSubBattlePhase() === 'status_window' && this.isMenuCalled()) {
				$gameSystem.clearSrpgStatusWindowNeedRefresh();
				SoundManager.playCancel();
				$gameTemp.clearActiveEvent();
				$gameSystem.setSubBattlePhase('normal');
				$gameTemp.clearMoveTable();
				return;
			}
		}
		_UX_updateCallMenu.call(this);
	};
	
	// Cancel while selecting action
	var _UX_selectPreviousActorCommand = Scene_Map.prototype.selectPreviousActorCommand;
	Scene_Map.prototype.selectPreviousActorCommand = function() {
		_UX_selectPreviousActorCommand.call(this);
		var event = $gameTemp.activeEvent();
		$gamePlayer.locate(event.posX(), event.posY());
	};

	/** cycle through valid selections **/

	// Cycle between usable actors with pageup, pagedown, or tab
	Scene_Map.prototype.updateSwitchActor = function() {
		// figure out which one we're on
		var id = 0;
		var max = $gameMap.isMaxEventId();
		var events = $gameMap.eventsXyNt($gamePlayer.x, $gamePlayer.y);
		if (events && events.length > 0) {
			id = events[0].eventId();
		}
		// scan forward to find the next available actor
		if (Input.isTriggered('pagedown') || Input.isTriggered('tab')) {
			SoundManager.playCursor();
			for (var off = (id+1)%max; off != id; off = (off+1)%max) {
				var unitArray = $gameSystem.EventToUnit(off);
				if (unitArray && (unitArray[0] === 'actor') && unitArray[1].canInput()) {
					var event = $gameMap.event(off);
					$gamePlayer.locate(event.posX(), event.posY());
					return;
				}
			}
		}
		// scan backward to find the previous available actor
		else if (Input.isTriggered('pageup')) {
			SoundManager.playCursor();
			for (var off = (id+max-1)%max; off != id; off = (off+max-1)%max) {
				var unitArray = $gameSystem.EventToUnit(off);
				if (unitArray && (unitArray[0] === 'actor') && unitArray[1].canInput()) {
					var event = $gameMap.event(off);
					$gamePlayer.locate(event.posX(), event.posY());
					return;
				}
			}
		}
	};

	// Cycle between usable actors with pageup, pagedown, or tab
	Scene_Map.prototype.updateSwitchTarget = function() {
		// figure out which one we're on
		var id = 0;
		var max = $gameMap.isMaxEventId();
		var events = $gameMap.eventsXyNt($gamePlayer.x, $gamePlayer.y);
		if (events && events.length > 0) {
			id = events[0].eventId();
		}
		// scan forward to find the next available target
		if (Input.isTriggered('pagedown') || Input.isTriggered('tab')) {
			SoundManager.playCursor();
			for (var off = (id+1)%max; off != id; off = (off+1)%max) {
				var unitArray = $gameSystem.EventToUnit(off);
				var action = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].currentAction();
				if (unitArray && action && 
					((unitArray[0] === 'enemy' && action.isForOpponent()) ||
					(unitArray[0] === 'actor' && action.isForFriend()))) {
					var event = $gameMap.event(off);
					$gamePlayer.locate(event.posX(), event.posY());
					return;
				}
			}
		}
		// scan backward to find the previous available target
		else if (Input.isTriggered('pageup')) {
			SoundManager.playCursor();
			for (var off = (id+max-1)%max; off != id; off = (off+max-1)%max) {
				var unitArray = $gameSystem.EventToUnit(off);
				var action = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1].currentAction();
				if (unitArray && action && 
					((unitArray[0] === 'enemy' && action.isForOpponent()) ||
					(unitArray[0] === 'actor' && action.isForFriend()))) {
					var event = $gameMap.event(off);
					$gamePlayer.locate(event.posX(), event.posY());
					return;
				}
			}
		}
	};

})();