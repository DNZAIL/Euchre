/*:
@plugindesc SRPGコンバータMVに範囲攻撃のルールを追加
@author アンチョビ

@help
<srpgAreaRange:n>とすると、範囲攻撃と認識する。
対象点から距離nの範囲に効果。
選択後、もう一度範囲内の敵を選択する必要があるため
対象がいない状態で発動することは出来ない。
範囲攻撃が通常攻撃に設定されている場合反撃不可。
*/
(function(){
    var _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._AreaPos = [];
        this._actionStack = [];
        this._firstAction = false;
    };
    Game_Temp.prototype.areaX = function() {
        return this._AreaPos[0];
    };
    Game_Temp.prototype.areaY = function() {
        return this._AreaPos[1];
    };
    Game_Temp.prototype.setAreaPos = function(pos) {
        this._AreaPos[0] = pos[0];
        this._AreaPos[1] = pos[1];
    };
    Game_Temp.prototype.clearActionStack = function() {
        this._actionStack = [];
    };
    Game_Temp.prototype.setActionStack = function(actions) {
        this._actionStack.push(actions);
    };
    Game_Temp.prototype.StackActions = function() {
        return this._actionStack;
    };
    Game_Temp.prototype.setFirstAction = function(flag) {
        this._firstAction = flag;
    };
    Game_Temp.prototype.isFirstAction = function() {
        return this._firstAction;
    };
    
    var _Game_BattlerBase_canUse = Game_BattlerBase.prototype.canUse;
    Game_BattlerBase.prototype.canUse = function(item) {
        if ($gameSystem.isSRPGMode() == true) {
            if (!item) {
                return false;
            }
            if ($gameSystem.isBattlePhase() === 'actor_phase' && 
                $gameSystem.isSubBattlePhase() === 'normal') {
                return false;
            }
            if (($gameSystem.isSubBattlePhase() === 'invoke_action' ||
                 $gameSystem.isSubBattlePhase() === 'battle_window')) {
                if (this.srpgSkillAreaRange(item) > 0) {
                    if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] == this) {
                        var dist = Math.abs($gameTemp.targetEvent().posX() - $gameTemp.areaX()) + 
                                   Math.abs($gameTemp.targetEvent().posY() - $gameTemp.areaY());
                        if (this.srpgSkillAreaRange(item) >= dist) {
                            return true;
                        }
                    } else {
                        return false;
                    }
                }
            }
        }
        return _Game_BattlerBase_canUse.call(this, item);
    };
    var _Game_BattlerBase_paySkillCost = Game_BattlerBase.prototype.paySkillCost;
    Game_BattlerBase.prototype.paySkillCost = function(skill) {
        if ((this.srpgSkillAreaRange(skill) <= 0) || ($gameTemp.isFirstAction())) {
            _Game_BattlerBase_paySkillCost.call(this, skill);
        }
    };
    
    Game_Battler.prototype.srpgSkillAreaRange = function(skill) {
        var range = 0;
        if (skill.meta.srpgAreaRange) {
            range = skill.meta.srpgAreaRange;
        } else {
            range = 0;
        }
        return Number(range);
    };
    
    var _Game_Player_triggerAction = Game_Player.prototype.triggerAction;
    Game_Player.prototype.triggerAction = function() {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.isSubBattlePhase() === 'actor_targetArea') {
                if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
                    var list = $gameTemp.rangeList();
                    for (var i = 0; i < list.length; i++) {
                        var pos = list[i];
                        if (pos[0] == this._x && pos[1] == this._y) {
                            SoundManager.playOk();
                            $gameTemp.setAreaPos([pos[0], pos[1]]);
                            var event = $gameTemp.activeEvent();
                            var battler = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1];
                            var skill = battler.currentAction().item();
                            var a_pos = [$gameTemp.areaX(), $gameTemp.areaY()];
                            $gameTemp.clearMoveTable();
                            $gameTemp.initialRangeTable($gameTemp.areaX(), $gameTemp.areaY(), battler.srpgMove());
                            event.makeRangeTable($gameTemp.areaX(), $gameTemp.areaY(), battler.srpgSkillAreaRange(skill), [0]);
                            $gameTemp.pushRangeListToMoveList();
                            $gameTemp.setResetMoveList(true);
                            $gameSystem.clearSrpgActorCommandWindowNeedRefresh();
                            $gameSystem.setSubBattlePhase('actor_target');
                        }
                    }
                    return true;
                }
            }
        }
        return _Game_Player_triggerAction.call(this);
    };
    
    var _Scene_Map_commandBattleStart = Scene_Map.prototype.commandBattleStart;
    Scene_Map.prototype.commandBattleStart = function() {
        var actionArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
        var targetArray = $gameSystem.EventToUnit($gameTemp.targetEvent().eventId());
        var skill = actionArray[1].currentAction().item();
        if (actionArray[1].srpgSkillAreaRange(skill) > 0) {
            $gameTemp.clearActionStack();
            var events = $gameMap.events();
            for (var i = 0; i <  events.length; i++) {
                var event = events[i];
                var dist = Math.abs(event.posX() - $gameTemp.areaX()) + 
                           Math.abs(event.posY() - $gameTemp.areaY());
                var targetType = targetArray[0];
                var range = actionArray[1].srpgSkillAreaRange(skill);
                if (event.isType() === targetType && !event.isErased() && range >= dist) {
                    targetArray = $gameSystem.EventToUnit(event.eventId());
                    $gameTemp.setActionStack([skill, targetArray[0], targetArray[1], event]);
                }
            }
            firstaction = $gameTemp.StackActions().pop();
            actionArray[1].srpgMakeNewActions();
            actionArray[1].action(0).setItemObject(firstaction[0]);
            targetArray = [firstaction[1], firstaction[2]];
            $gameTemp.setTargetEvent(firstaction[3]);
            $gameTemp.setFirstAction(true);
            $gameSystem.clearSrpgStatusWindowNeedRefresh();
            $gameSystem.clearSrpgBattleWindowNeedRefresh();
            $gameSystem.setSubBattlePhase('invoke_action');
            this.srpgBattleStart(actionArray, targetArray);
            return;
        }
        _Scene_Map_commandBattleStart.call(this);
    };
    var _Scene_Map_srpgInvokeAutoUnitAction = Scene_Map.prototype.srpgInvokeAutoUnitAction;
    Scene_Map.prototype.srpgInvokeAutoUnitAction = function() {
        if ($gameTemp.targetEvent()) {
            var actionArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
            var targetArray = $gameSystem.EventToUnit($gameTemp.targetEvent().eventId());
            var skill = actionArray[1].currentAction().item();
            $gameTemp.setSrpgDistance($gameSystem.unitDistance($gameTemp.activeEvent(), $gameTemp.targetEvent()));
            if (actionArray[1].canUse(skill)) {
                if (actionArray[1].srpgSkillAreaRange(skill) > 0) {
                    $gameTemp.setAreaPos([$gameTemp.targetEvent().posX(), $gameTemp.targetEvent().posY()]);
                    var a_pos = [$gameTemp.areaX(), $gameTemp.areaY()];
                    $gameTemp.clearMoveTable();
                    $gameTemp.initialRangeTable($gameTemp.areaX(), $gameTemp.areaY(), actionArray[1].srpgMove());
                    $gameTemp.activeEvent().makeRangeTable($gameTemp.areaX(), $gameTemp.areaY(), actionArray[1].srpgSkillAreaRange(skill), [0]);
                    $gameTemp.pushRangeListToMoveList();
                    $gameTemp.setResetMoveList(true);
                    $gameSystem.clearSrpgActorCommandWindowNeedRefresh();
                    $gameTemp.setAutoMoveDestinationValid(true);
                    $gameTemp.setAutoMoveDestination($gameTemp.targetEvent().posX(), $gameTemp.targetEvent().posY());
                    $gameTemp.clearActionStack();
                    var events = $gameMap.events();
                    for (var i = 0; i <  events.length; i++) {
                        var event = events[i];
                        var dist = Math.abs(event.posX() - $gameTemp.areaX()) + 
                                   Math.abs(event.posY() - $gameTemp.areaY());
                        var targetType = targetArray[0];
                        var range = actionArray[1].srpgSkillAreaRange(skill);
                        if (event.isType() === targetType && !event.isErased() && range >= dist) {
                            targetArray = $gameSystem.EventToUnit(event.eventId());
                            $gameTemp.setActionStack([skill, targetArray[0], targetArray[1], event]);
                        }
                    }
                    firstaction = $gameTemp.StackActions().pop();
                    actionArray[1].srpgMakeNewActions();
                    actionArray[1].action(0).setItemObject(firstaction[0]);
                    targetArray = [firstaction[1], firstaction[2]];
                    $gameTemp.setTargetEvent(firstaction[3]);
                    $gameTemp.setFirstAction(true);
                    $gameSystem.setSubBattlePhase('invoke_action');
                    this.srpgBattleStart(actionArray, targetArray);
                    return;
                }
            } 
        }
        _Scene_Map_srpgInvokeAutoUnitAction.call(this);
    };
    
    var _SceneMap_updateCallMenu = Scene_Map.prototype.updateCallMenu;
    Scene_Map.prototype.updateCallMenu = function() {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.isSubBattlePhase() === 'actor_targetArea') {
                if (this.isMenuCalled()) {
                    $gameSystem.setSubBattlePhase('actor_target');
                }
            }
        }
        _SceneMap_updateCallMenu.call(this);
    };
    var _Scene_Map_startActorTargetting = Scene_Map.prototype.startActorTargetting;
    Scene_Map.prototype.startActorTargetting = function() {
        _Scene_Map_startActorTargetting.call(this);
        var event = $gameTemp.activeEvent();
        var battler = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1];
        var skill = battler.currentAction().item();
        if (battler.srpgSkillAreaRange(skill) > 0) {
            $gameSystem.setSubBattlePhase('actor_targetArea');
        }
    };
    
    var _Scene_Map_srpgAfterAction = Scene_Map.prototype.srpgAfterAction;
    Scene_Map.prototype.srpgAfterAction = function() {
        if ($gameTemp.StackActions().length > 0) {
            this.srpgBattlerDeadAfterBattle();
            var actionArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
            nextaction = $gameTemp.StackActions().pop();
            actionArray[1].srpgMakeNewActions();
            actionArray[1].action(0).setItemObject(nextaction[0]);
            var targetArray = [nextaction[1], nextaction[2]];
            $gameTemp.setTargetEvent(nextaction[3]);
            $gameTemp.setFirstAction(false);
            $gameSystem.setSubBattlePhase('invoke_action');
            this.srpgBattleStart(actionArray, targetArray);
        } else {
            _Scene_Map_srpgAfterAction.call(this);
        }
    };
})();