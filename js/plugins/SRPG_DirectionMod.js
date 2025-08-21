/*:
@plugindesc SRPGコンバータMVに方向補正のルールを追加
@author アンチョビ

@param SideAttack_Mod:HIT
@desc 側面攻撃：命中率補正
@default 1.2
@param SideAttack_Mod:EVA
@desc 側面攻撃：回避率補正
@default 0.8
@param SideAttack_Mod:DMG
@desc 側面攻撃：ダメージ補正
@default 1.2

@param BackAttack_Mod:HIT
@desc 背面攻撃：命中率補正
@default 1.4
@param BackAttack_Mod:EVA
@desc 背面攻撃：回避率補正
@default 0.6
@param BackAttack_Mod:DMG
@desc 背面攻撃：ダメージ補正
@default 1.4

@help
Scene_Map の preBattleSetDirection関数を書き換えます。
なるべく上の方に置いてください。(SRPG_core直下が望ましいです)

攻撃方向によって修正を加える。正面攻撃で等倍。
同陣営のユニットを対象にした場合は修正を受けない。
ユニットの上でメニューキーを押すと方向転換。
スキルのメモ欄に<srpgDirection:false>と書くと
方向による修正を受けないスキルになる。

・更新履歴
2017/11/16    var1.01 細かい修正
2018/07/07    var1.02 ユニット以外のイベントの向きを変えようとするとエラー落ちする問題の修正
*/
(function(){
    var parameters = PluginManager.parameters('SRPG_DirectionMod');
    var side_hit = Number(parameters['SideAttack_Mod:HIT']);
    var side_eva = Number(parameters['SideAttack_Mod:EVA']);
    var side_dmg = Number(parameters['SideAttack_Mod:DMG']);
    var back_hit = Number(parameters['BackAttack_Mod:HIT']);
    var back_eva = Number(parameters['BackAttack_Mod:EVA']);
    var back_dmg = Number(parameters['BackAttack_Mod:DMG']);

    var _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._attackDirection = 'front';
    };
    Game_Temp.prototype.getAttackDirection = function() {
        return this._attackDirection;
    };
    Game_Temp.prototype.setAttackDirection = function(direction) {
        this._attackDirection = direction;
    };
    
    var _Game_Action_evalDamageFormula = Game_Action.prototype.evalDamageFormula;
    Game_Action.prototype.evalDamageFormula = function(target) {
        var value = _Game_Action_evalDamageFormula.call(this, target);
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameTemp.activeEvent() && $gameTemp.targetEvent()) {
                if (this.subject() == $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] &&
                    $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[0] !=
                    $gameSystem.EventToUnit($gameTemp.targetEvent().eventId())[0]) {
                    if ($gameTemp.getAttackDirection() == 'side') {
                        value *= side_dmg;
                    } else if ($gameTemp.getAttackDirection() == 'back') {
                        value *= back_dmg;
                    }
                }
            }
        }
        return value;
    };
    var _Game_Action_itemHit = Game_Action.prototype.itemHit;
    Game_Action.prototype.itemHit = function(target) {
        var value = _Game_Action_itemHit.call(this, target);
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameTemp.activeEvent() && $gameTemp.targetEvent()) {
                if (this.subject() == $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] &&
                    $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[0] !=
                    $gameSystem.EventToUnit($gameTemp.targetEvent().eventId())[0]) {
                    if ($gameTemp.getAttackDirection() == 'side') {
                        value *= side_hit;
                    } else if ($gameTemp.getAttackDirection() == 'back') {
                        value *= back_hit;
                    }
                }
            }
        }
        return value;
    };
    var _Game_Action_itemEva = Game_Action.prototype.itemEva;
    Game_Action.prototype.itemEva = function(target) {
        var value = _Game_Action_itemEva.call(this, target);
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameTemp.activeEvent() && $gameTemp.targetEvent()) {
                if (this.subject() == $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] &&
                    $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[0] !=
                    $gameSystem.EventToUnit($gameTemp.targetEvent().eventId())[0]) {
                    if ($gameTemp.getAttackDirection() == 'side') {
                        value *= side_eva;
                    } else if ($gameTemp.getAttackDirection() == 'back') {
                        value *= back_eva;
                    }
                }
            }
        }
        return value;
    };
    
    var _Scene_Map_preBattleSetDirection = Scene_Map.prototype.preBattleSetDirection;
    Scene_Map.prototype.preBattleSetDirection = function() {
        var differenceX = $gameTemp.activeEvent().posX() - $gameTemp.targetEvent().posX();
        var differenceY = $gameTemp.activeEvent().posY() - $gameTemp.targetEvent().posY();
        if (Math.abs(differenceX) == Math.abs(differenceY)) {
            if (differenceX < 0 && differenceY < 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(2);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(6);
                        break;
                }
            }
            if (differenceX > 0 && differenceY < 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(2);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(4);
                        break;
                }
            }
            if (differenceX < 0 && differenceY > 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(8);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(6);
                        break;
                }
            }
            if (differenceX > 0 && differenceY > 0) {
                switch ($gameTemp.targetEvent().direction()) {
                    case 2:
                    case 8:
                        $gameTemp.activeEvent().setDirection(8);
                        break;
                    case 4:
                    case 6:
                        $gameTemp.activeEvent().setDirection(4);
                        break;
                }
            }
        } else {
            if (Math.abs(differenceX) > Math.abs(differenceY)) {
                if (differenceX < 0) {
                    $gameTemp.activeEvent().setDirection(6);
                } else if (differenceX > 0) {
                    $gameTemp.activeEvent().setDirection(4);
                }
            } else {
                if (differenceY < 0) {
                    $gameTemp.activeEvent().setDirection(2);
                } else if (differenceY > 0) {
                    $gameTemp.activeEvent().setDirection(8);
                }
            }
        }
        var direction = 'side';
        switch ($gameTemp.targetEvent().direction()) {
            case 2:
                switch ($gameTemp.activeEvent().direction()) {
                    case 2:
                        direction = 'back';
                        break;
                    case 8:
                        direction = 'front';
                        break;
                }
                break;
            case 4:
                switch ($gameTemp.activeEvent().direction()) {
                    case 4:
                        direction = 'back';
                        break;
                    case 6:
                        direction = 'front';
                        break;
                }
                break;
            case 6:
                switch ($gameTemp.activeEvent().direction()) {
                    case 4:
                        direction = 'front';
                        break;
                    case 6:
                        direction = 'back';
                        break;
                }
                break;
            case 8:
                switch ($gameTemp.activeEvent().direction()) {
                    case 2:
                        direction = 'front';
                        break;
                    case 8:
                        direction = 'back';
                        break;
                }
                break;
        }
        var battlerArray = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId());
        var skill = battlerArray[1].action(0).item();
        if (skill.meta.srpgDirection) {
            if (skill.meta.srpgDirection == 'false') {
                direction = 'front';
            }
        }
        $gameTemp.setAttackDirection(direction);
        switch ($gameTemp.activeEvent().direction()) {
            case 2:
                $gameTemp.targetEvent().setDirection(8);
                break;
            case 4:
                $gameTemp.targetEvent().setDirection(6);
                break;
            case 6:
                $gameTemp.targetEvent().setDirection(4);
                break;
            case 8:
                $gameTemp.targetEvent().setDirection(2);
                break;
        }
    };
    var _SceneMap_updateCallMenu = Scene_Map.prototype.updateCallMenu;
    Scene_Map.prototype.updateCallMenu = function() {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.srpgWaitMoving() == true ||
                $gameTemp.isAutoMoveDestinationValid() == true) {
                _SceneMap_updateCallMenu.call(this);
            } else if ($gameSystem.isSubBattlePhase() === 'normal') {
                if (this.isMenuCalled()) {
                    var callmenu = true;
                    var events = $gameMap.eventsXyNt($gamePlayer.x, $gamePlayer.y);
                    events.forEach(function(event){
                        var battlerArray = $gameSystem.EventToUnit(event.eventId());
                        //var type = battlerArray[0];
                        if (battlerArray && battlerArray[0] === 'actor') {
                            var battler = battlerArray[1];
                            if (battler.isAppeared() && !battler.isRestricted() && !battler.isAutoBattle()) {
                                SoundManager.playCursor();
                                event.turnRight90();
                                callmenu = false;
                            }
                        }
                    });
                    if (callmenu) {
                        _SceneMap_updateCallMenu.call(this);
                    }
                }
            } else {
                _SceneMap_updateCallMenu.call(this);
            }
        } else {
            _SceneMap_updateCallMenu.call(this);
        }
    };
    var _Scene_Map_srpgBattlerDeadAfterBattle = Scene_Map.prototype.srpgBattlerDeadAfterBattle;
    Scene_Map.prototype.srpgBattlerDeadAfterBattle = function() {
        _Scene_Map_srpgBattlerDeadAfterBattle.call(this);
        $gameTemp.setAttackDirection('front');
    };
})();