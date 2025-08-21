/*:
@plugindesc SRPGコンバータMVに攻撃側先制攻撃のルールを追加
@author アンチョビ

@help
デフォルトでは敏捷値で攻撃順が決まるところを、
攻撃→反撃の順になるように修正する。
*/
(function(){
    var _Game_Action_speed = Game_Action.prototype.speed;
    Game_Action.prototype.speed = function() {
        if ($gameSystem.isSRPGMode() == true) {
            var speed = 0;
            if (this.subject() == $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1]) {
                speed = 1000;
            }
            return speed;
        } else {
            speed = _Game_Action_speed.call(this);
            return speed;
        }
    };
})();