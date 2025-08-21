/*:
@plugindesc SRPGコンバータMVに間接攻撃のルールを追加
@author アンチョビ

@help
Game_System の srpgMakeMoveTable関数
Scene_Map の srpgAfterActorEquip関数を書き換えます。
なるべく上の方に置いてください。(SRPG_core直下が望ましいです)

<srpgIndirect:true>
移動したターンはそのスキルを使用できない。

今のところ、
「スキル」「アイテム」
のメモ欄を参照する。
*/
(function(){
    Game_System.prototype.srpgMakeMoveTable = function(event) {
        e_pos = [event.posX(), event.posY()];
        $gameSystem.srpgMakeMoveTableMain(event, e_pos);
    };
    Game_System.prototype.srpgMakeMoveTableOri = function(event) {
        e_pos = [$gameTemp.originalPos()[0], $gameTemp.originalPos()[1]];
        $gameSystem.srpgMakeMoveTableMain(event, e_pos);
    };
    Game_System.prototype.srpgMakeMoveTableMain = function(event, e_pos) {
        var battlerArray = $gameSystem.EventToUnit(event.eventId());
        $gameTemp.clearMoveTable();
        $gameTemp.initialMoveTable(e_pos[0], e_pos[1], battlerArray[1].srpgMove());
        event.makeMoveTable(e_pos[0], e_pos[1], battlerArray[1].srpgMove(), [0]);
        var list = $gameTemp.moveList();
        var item;
        if (battlerArray[1].action(0) && battlerArray[1].action(0).item()) {
            item = battlerArray[1].action(0).item();
        } else {
            item = $dataSkills[battlerArray[1].attackSkillId()];
        }
        for (var i = 0; i < list.length; i++) {
            var pos = list[i];
            if (item.meta.srpgIndirect) {
                if (item.meta.srpgIndirect == 'true') {
                    if (e_pos[0] != pos[0] || e_pos[1] != pos[1]) {
                        continue;
                    }
                }
            }
            if (battlerArray[1].action(0) && battlerArray[1].action(0).item()) {
                event.makeRangeTable(pos[0], pos[1], battlerArray[1].srpgSkillRange(battlerArray[1].action(0).item()), [0]);
            } else {
                event.makeRangeTable(pos[0], pos[1], battlerArray[1].srpgWeaponRange(), [0]);
            }
        }
        $gameTemp.pushRangeListToMoveList();
    };
    
    Scene_Map.prototype.srpgAfterActorEquip = function() {
        var event = $gameTemp.activeEvent();
        $gameSystem.srpgMakeMoveTableOri(event);
        $gameTemp.setResetMoveList(true);
        $gameTemp.setSrpgActorEquipFlag(false);
        return;
    };
    var _SceneMap_updateCallMenu = Scene_Map.prototype.updateCallMenu;
    Scene_Map.prototype.updateCallMenu = function() {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.srpgWaitMoving() == true ||
                $gameTemp.isAutoMoveDestinationValid() == true) {
                _SceneMap_updateCallMenu.call(this);
            } else if ($gameSystem.isSubBattlePhase() === 'actor_target') {
                if (this.isMenuCalled()) {
                    SoundManager.playCancel();
                    var event = $gameTemp.activeEvent();
                    var battlerArray = $gameSystem.EventToUnit(event.eventId());
                    battlerArray[1].action(0).clear();
                    $gameTemp.clearMoveTable();
                    $gameSystem.srpgMakeMoveTableOri(event);
                    $gameTemp.setResetMoveList(true);
                    $gameSystem.setSrpgActorCommandWindowNeedRefresh(battlerArray);
                    $gameSystem.setSubBattlePhase('actor_command_window');
                }
            } else {
                _SceneMap_updateCallMenu.call(this);
            }
        } else {
            _SceneMap_updateCallMenu.call(this);
        }
    };
    var _Scene_Map_srpgInvokeAutoActorMove = Scene_Map.prototype.srpgInvokeAutoActorMove;
    Scene_Map.prototype.srpgInvokeAutoActorMove = function() {
        $gameTemp.reserveOriginalPos($gameTemp.activeEvent().posX(), $gameTemp.activeEvent().posY());
        _Scene_Map_srpgInvokeAutoActorMove.call(this);
    };
    var _Scene_Map_srpgInvokeEnemyMove = Scene_Map.prototype.srpgInvokeEnemyMove;
    Scene_Map.prototype.srpgInvokeEnemyMove = function() {
        $gameTemp.reserveOriginalPos($gameTemp.activeEvent().posX(), $gameTemp.activeEvent().posY());
        _Scene_Map_srpgInvokeEnemyMove.call(this);
    };
    var _Scene_Map_srpgSearchOptimalPos = Scene_Map.prototype.srpgSearchOptimalPos;
    Scene_Map.prototype.srpgSearchOptimalPos = function(targetEvent, battler, type) {
        if (!!targetEvent) {
            var indirect = false;
            if (battler.currentAction().item().meta.srpgIndirect) {
                if (battler.currentAction().item().meta.srpgIndirect == 'true') {
                    indirect = true;
                }
            }
            if (indirect) {
                var list = $gameTemp.moveList();
                var skill = battler.currentAction().item();
                var range = battler.srpgSkillRange(skill);
                var minRange = battler.srpgSkillMinRange(skill);
                if ($gameTemp.activeEvent() == targetEvent) {
                    return ([$gameTemp.activeEvent().posX(), $gameTemp.activeEvent().posY()]);
                } else {
                    var dis = Math.abs($gameTemp.activeEvent().posX() - targetEvent.posX())
                            + Math.abs($gameTemp.activeEvent().posY() - targetEvent.posY());
                    if (range >= dis && minRange <= dis) {
                        return ([$gameTemp.activeEvent().posX(), $gameTemp.activeEvent().posY()]);
                    }
                }
            }
        }
        return _Scene_Map_srpgSearchOptimalPos.call(this, targetEvent, battler, type);
    };
    
    var _Game_BattlerBase_canUse = Game_BattlerBase.prototype.canUse;
    Game_BattlerBase.prototype.canUse = function(item) {
        if ($gameSystem.isSRPGMode() == true) {
            if (!item) {
                return false;
            }
            if (item.meta.srpgIndirect) {
                if (item.meta.srpgIndirect == 'true' && !this.canIndirectAttack()) {
                    return false;
                }
            }
        }
        return _Game_BattlerBase_canUse.call(this, item);
    };
    Game_BattlerBase.prototype.canIndirectAttack = function() {
        if (!$gameTemp.originalPos()) {
            return true;
        }
        if (!$gameTemp.activeEvent()) {
            return true;
        }
        if ($gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1] == this) {
            return $gameTemp.originalPos()[0] == $gameTemp.activeEvent().posX() &&
                   $gameTemp.originalPos()[1] == $gameTemp.activeEvent().posY();
        } else {
            return true;
        }
    };
})();