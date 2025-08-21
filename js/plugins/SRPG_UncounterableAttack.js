/*:
@plugindesc SRPGコンバータMVに反撃不能攻撃のルールを追加
@author アンチョビ

@help
スキルのメモ欄に
<srpgUncounterable>と書くと反撃されないスキルになる。
*/
(function(){
    var _Scene_Map_srpgBattleStart = Scene_Map.prototype.srpgBattleStart;
    Scene_Map.prototype.srpgBattleStart = function(actionArray, targetArray) {
        _Scene_Map_srpgBattleStart.call(this, actionArray, targetArray);
        if (actionArray[0] != targetArray[0] && actionArray[1].currentAction().item().meta.srpgUncounterable) {
            targetArray[1].clearActions();
        }
    };

})();