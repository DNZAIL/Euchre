/*:
@plugindesc SRPGコンバータMVのAI拡張：条件に合うユニットを無視
@author アンチョビ

@help
<srpgNeglect:???>
???の式がtrueであるユニットをいないものとして行動する。
「いないものとする」というのは攻撃や検索の対象に含まないという意味で、
すりぬけて移動するわけではない。
例：
<srpgNeglect:a.atk &lt; b.atk>
↑自分より攻撃力の高い敵ユニットを無視する。
（&lt;は<、&gt;は>に変換される）

<srpgPriority:???>
???の式がtrueであるユニットを優先的に対象として選ぶ。
例：
<srpgPriority:b.hp / b.mhp &lt; 0.5>
↑HPが半分を切っている敵を優先的に攻撃する。
あるいはHPが半分を切っている味方を優先的に回復する。
（&lt;は<、&gt;は>に変換される）

今のところ、
「職業」「エネミー」
のメモ欄を参照する。

・更新履歴
2017/11/16    var1.01 細かい修正、優先攻撃機能を追加
*/
(function(){
    var _Scene_Map_srpgMakeCanAttackTargets = Scene_Map.prototype.srpgMakeCanAttackTargets;
    Scene_Map.prototype.srpgMakeCanAttackTargets = function(battler, targetType) {
        var trgList_min = _Scene_Map_srpgMakeCanAttackTargets.call(this, battler, targetType).filter(function(event) {
            var a = battler;
            var b = $gameSystem.EventToUnit(event.eventId())[1];
            var neglectEval = 'false';
            if (a.isActor()) {
                if (a.currentClass().meta.srpgNeglect) {
                    neglectEval = a.currentClass().meta.srpgNeglect;
                }
            }
            if (a.isEnemy()) {
                if (a.enemy().meta.srpgNeglect) {
                    neglectEval = a.enemy().meta.srpgNeglect;
                }
            }
            neglectEval = neglectEval.replace(/&gt;?/gi, '>');
            neglectEval = neglectEval.replace(/&lt;?/gi, '<');
            var neglectflag = false;
            try {
                neglectflag = !!eval(neglectEval);
            } catch (e) {
                neglectflag = false;
            }
            return !neglectflag;
        }, this);
        var trgList_pri = trgList_min.filter(function(event) {
            var a = battler;
            var b = $gameSystem.EventToUnit(event.eventId())[1];
            var priorityEval = 'false';
            if (a.isActor()) {
                if (a.currentClass().meta.srpgNeglect) {
                    priorityEval = a.currentClass().meta.srpgPriority;
                }
            }
            if (a.isEnemy()) {
                if (a.enemy().meta.srpgNeglect) {
                    priorityEval = a.enemy().meta.srpgPriority;
                }
            }
            priorityEval = priorityEval.replace(/&gt;?/gi, '>');
            priorityEval = priorityEval.replace(/&lt;?/gi, '<');
            var priorityflag = false;
            try {
                priorityflag = !!eval(priorityEval);
            } catch (e) {
                priorityflag = false;
            }
            return priorityflag;
        }, this);
        if (trgList_pri.length > 0) {
            return trgList_pri;
        }
        return trgList_min;
    };
    var _Scene_Map_srpgDecideTarget = Scene_Map.prototype.srpgDecideTarget;
    Scene_Map.prototype.srpgDecideTarget = function(canAttackTargets, activeEvent, targetType) {
        var targetEvent = _Scene_Map_srpgDecideTarget.call(this, canAttackTargets, activeEvent, targetType);
        if (canAttackTargets.length === 0) {
            targetEvent = null;
            var minDis = 9999;
            var events = $gameMap.events().filter(function(event) {
                if (event.isType() != targetType) {
                    return false;
                }
                var a = $gameSystem.EventToUnit(activeEvent.eventId())[1];
                var b = $gameSystem.EventToUnit(event.eventId())[1];
                var neglectEval = 'false';
                if (a.isActor()) {
                    if (a.currentClass().meta.srpgNeglect) {
                        neglectEval = a.currentClass().meta.srpgNeglect;
                    }
                }
                if (a.isEnemy()) {
                    if (a.enemy().meta.srpgNeglect) {
                        neglectEval = a.enemy().meta.srpgNeglect;
                    }
                }
                neglectEval = neglectEval.replace(/&gt;?/gi, '>');
                neglectEval = neglectEval.replace(/&lt;?/gi, '<');
                var neglectflag = false;
                try {
                    neglectflag = !!eval(neglectEval);
                } catch (e) {
                    neglectflag = false;
                }
                return !neglectflag;
            }, this);
            for (var i = 0; i <  events.length; i++) {
                var event = events[i];
                var dis = $gameSystem.unitDistance(activeEvent, event);
                if (!event.isErased() && dis < minDis && $gameTemp.activeEvent() != event) {
                    minDis = dis;
                    targetEvent = event;
                }
            }
        }
        return targetEvent;
    };
})();