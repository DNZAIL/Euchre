/*:
@plugindesc SRPGコンバータMVにZOCのルールを追加
@author アンチョビ

@param Default
@desc ZOCタグ未設定の場合ZOCを持つかどうか(on/off)
@default on

@help
<srpgZOC_on:n>（nは任意の正の数値）を設定すると
そのユニットは敵ユニットに対してのZOCを持つ。
範囲は隣接する上下左右の４マス。
<srpgZOC_off:n>（nは任意の正の数値）タグで無効化。
<srpgZOC_on>タグと<srpgZOC_off>タグが重複している場合、
数値が最大のものが適用される。
例：
<srpgZOC_on:10>
<srpgZOC_off:50>
↑この場合offが優先。ZOCを持たない。
on/offのそれぞれの最大数値が同数の場合はデフォルトが適用される。
また、<srpgZOC_through:n>（nは任意の正の数値）を設定すると
n以下の<srpgZOC_on>タグを無視して移動できる。

今のところ、
「職業」「エネミー」「武器」「防具」
「ステート」「スキル（習得しているもの）」
のメモ欄を参照する。
*/
(function(){
    var parameters = PluginManager.parameters('SRPG_ZOC');
    var DefaultZOC = (parameters['Default'] == 'on');
    
    var _Game_CharacterBase_makeMoveTable = Game_CharacterBase.prototype.makeMoveTable;
    Game_CharacterBase.prototype.makeMoveTable = function(x, y, move, route) {
        var inZOC = false;
        inZOC = inZOC || $gameMap.eventsXyNt(x, y - 1).some(function(event) {
            if (event) {
                return this.isHoveZOC(event);
            } else {
                return false;
            }
        }, this);
        inZOC = inZOC || $gameMap.eventsXyNt(x + 1, y).some(function(event) {
            if (event) {
                return this.isHoveZOC(event);
            } else {
                return false;
            }
        }, this);
        inZOC = inZOC || $gameMap.eventsXyNt(x - 1, y).some(function(event) {
            if (event) {
                return this.isHoveZOC(event);
            } else {
                return false;
            }
        }, this);
        inZOC = inZOC || $gameMap.eventsXyNt(x, y + 1).some(function(event) {
            if (event) {
                return this.isHoveZOC(event);
            } else {
                return false;
            }
        }, this);
        if ($gameSystem.EventToUnit(this.eventId())[1].srpgMove() == move) {
            inZOC = false;
        }
        if (inZOC) {
            move = 0;
        }
        _Game_CharacterBase_makeMoveTable.call(this, x, y, move, route);
    };
    Game_CharacterBase.prototype.isHoveZOC = function(event) {
        if (event.isErased()) {
            return false;
        }
        if ((event.isType() != 'actor') && (event.isType() != 'enemy')) {
            return false;
        }
        if (event.isType() === $gameTemp.activeEvent().isType()) {
            return false;
        }
        var activeUnit = $gameSystem.EventToUnit($gameTemp.activeEvent().eventId())[1];
        var ZocThrough = activeUnit.srpgZocPower()[2];
        var checkUnit = $gameSystem.EventToUnit(event.eventId())[1];
        var ZocOnPower = checkUnit.srpgZocPower()[0];
        var ZocOffPower = checkUnit.srpgZocPower()[1];
        if ((ZocThrough <= 0) || (ZocThrough < ZocOnPower)) {
            if (ZocOnPower == ZocOffPower) {
                return DefaultZOC;
            } else {
                return ZocOnPower > ZocOffPower;
            }
        } else {
            return false;
        }
    };
    
    Game_CharacterBase.prototype.srpgZocPower = function() {
        return [0, 0, 0];
    };
    Game_Actor.prototype.srpgZocPower = function() {
        var ZocOnPower = this.currentClass().meta.srpgZOC_on ? Number(this.currentClass().meta.srpgZOC_on) : 0;
        var ZocOffPower = this.currentClass().meta.srpgZOC_off ? Number(this.currentClass().meta.srpgZOC_off) : 0;
        var ZocThrough = this.currentClass().meta.srpgZOC_through ? Number(this.currentClass().meta.srpgZOC_through) : 0;
        this.states().forEach(function(state) {
            if (state.meta.srpgZOC_on) {
                ZocOnPower = Math.max(ZocOnPower, Number(state.meta.srpgZOC_on));
            }
            if (state.meta.srpgZOC_off) {
                ZocOffPower = Math.max(ZocOffPower, Number(state.meta.srpgZOC_off));
            }
            if (state.meta.srpgZOC_through) {
                ZocThrough = Math.max(ZocThrough, Number(state.meta.srpgZOC_through));
            }
        }, this);
        var equips = this.equips();
        for (var i = 0; i < equips.length; i++) {
            var item = equips[i];
            if (item) {
                if (item.meta.srpgZOC_on) {
                    ZocOnPower = Math.max(ZocOnPower, Number(item.meta.srpgZOC_on));
                }
                if (item.meta.srpgZOC_off) {
                    ZocOffPower = Math.max(ZocOffPower, Number(item.meta.srpgZOC_off));
                }
                if (item.meta.srpgZOC_through) {
                    ZocThrough = Math.max(ZocThrough, Number(item.meta.srpgZOC_through));
                }
            }
        }
        this.skills().forEach(function(skill) {
            if (skill.meta.srpgZOC_on) {
                ZocOnPower = Math.max(ZocOnPower, Number(skill.meta.srpgZOC_on));
            }
            if (skill.meta.srpgZOC_off) {
                ZocOffPower = Math.max(ZocOffPower, Number(skill.meta.srpgZOC_off));
            }
            if (skill.meta.srpgZOC_through) {
                ZocThrough = Math.max(ZocThrough, Number(skill.meta.srpgZOC_through));
            }
        });
        return [ZocOnPower, ZocOffPower, ZocThrough];
    };
    Game_Enemy.prototype.srpgZocPower = function() {
        var ZocOnPower = this.enemy().meta.srpgZOC_on ? Number(this.enemy().meta.srpgZOC_on) : 0;
        var ZocOffPower = this.enemy().meta.srpgZOC_off ? Number(this.enemy().meta.srpgZOC_off) : 0;
        var ZocThrough = this.enemy().meta.srpgZOC_through ? Number(this.enemy().meta.srpgZOC_through) : 0;
        this.states().forEach(function(state) {
            if (state.meta.srpgZOC_on) {
                ZocOnPower = Math.max(ZocOnPower, Number(state.meta.srpgZOC_on));
            }
            if (state.meta.srpgZOC_off) {
                ZocOffPower = Math.max(ZocOffPower, Number(state.meta.srpgZOC_off));
            }
            if (state.meta.srpgZOC_through) {
                ZocThrough = Math.max(ZocThrough, Number(state.meta.srpgZOC_through));
            }
        }, this);
        if (!this.hasNoWeapons()) {
            var item = $dataWeapons[this.enemy().meta.srpgWeapon];
            if (item) {
                if (item.meta.srpgZOC_on) {
                    ZocOnPower = Math.max(ZocOnPower, Number(item.meta.srpgZOC_on));
                }
                if (item.meta.srpgZOC_off) {
                    ZocOffPower = Math.max(ZocOffPower, Number(item.meta.srpgZOC_off));
                }
                if (item.meta.srpgZOC_through) {
                    ZocThrough = Math.max(ZocThrough, Number(item.meta.srpgZOC_through));
                }
            }
        }
        return [ZocOnPower, ZocOffPower, ZocThrough];
    };
})();