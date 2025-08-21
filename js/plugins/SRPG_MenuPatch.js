/*:
@plugindesc SRPGコンバータMVの不正なタイミングでメニューが開ける問題の修正
@author アンチョビ

@help
ターンの切れ目などにメニューが呼び出せて、
コマンド入力するとエラー落ちする問題を修正。
*/
(function(){
    var _SceneMap_updateCallMenu = Scene_Map.prototype.updateCallMenu;
    Scene_Map.prototype.updateCallMenu = function() {
        if ($gameSystem.isSRPGMode() == true) {
            if ($gameSystem.isBattlePhase() != 'actor_phase') {
                this.menuCalling = false;
            } else {
                _SceneMap_updateCallMenu.call(this);
            }
        } else {
            _SceneMap_updateCallMenu.call(this);
        }
    };
})();