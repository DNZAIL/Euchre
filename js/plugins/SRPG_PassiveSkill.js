/*:
@plugindesc SRPGコンバータMVにパッシブスキルのルールを追加
@author アンチョビ

@help
習得しているスキルのメモ欄を参照して以下の修正を行う。
<srpgMovePlus:n>            #移動力をn加算する
擬似的にレベルアップによって移動力を上昇させたりできる。
*/
(function(){
    var _Game_Actor_srpgMove = Game_Actor.prototype.srpgMove;
    Game_Actor.prototype.srpgMove = function() {
        var n = _Game_Actor_srpgMove.call(this);
        this.skills().forEach(function(skill) {
            if (skill.meta.srpgMovePlus) {
                n += Number(skill.meta.srpgMovePlus);
            }
        });
        n = Number(Math.max(n, 0));
        return n;
    };
})();