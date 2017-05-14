class Gamepad {
    constructor() {
        this.haveEvents = 'ongamepadconnected' in window;
        this.debug = false;
        this.scanGamepadsDelay = 1000;
        this.gamepads = {};
        this.$gamepad = $('.gamepad');
        this.$nogamepad = $('.no-gamepad');
        this.$debug = $('.debug');
        this.$help = $('.help');
        this.gamepadIdentifiers = {
            'debug': {
                'id': /debug/,
                'colors': []
            },
            'ds4': {
                'id': /054c.*?05c4/,
                'colors': ['black', 'white', 'red', 'blue']
            },
            'xbox-one': {
                'id': /xinput|XInput/,
                'colors': ['black', 'white']
            }
        };
        this.gamepadHelpTimeout = null;
        this.gamepadHelpDelay = 5000;
        this.activeGamepad = null;
        this.activeGamepadIndex = null;
        this.activeGamepadType = null;
        this.activeGamepadIdentifier = null;
        this.activeGamepadColorIndex = null;
        this.activeGamepadColorName = null;
        this.activeGamepadZoomLevel = 1;
        this.mapping = {
            buttons: [],
            axes: []
        };

        window.addEventListener("gamepadconnected", this.onGamepadConnect.bind(this));
        window.addEventListener("gamepaddisconnected", this.onGamepadDisconnect.bind(this));
        window.addEventListener("keydown", this.onKeyDown.bind(this));

        window.setInterval(this.scanGamepads.bind(this), this.scanGamepadsDelay);

        this.params = {
            gamepadColor: $.urlParam('color') || $.urlParam('c') || null,
            zoom: $.urlParam('zoom') || $.urlParam('z') || null
        };

        this.displayGamepadHelp();
    }
    
    displayGamepadHelp() {
        this.gamepadHelpTimeout = window.setTimeout(() => {
            this.$nogamepad.fadeIn();
        }, this.gamepadHelpDelay);
    }
    hideGamepadHelp() {
        window.clearTimeout(this.gamepadHelpTimeout);
        this.$nogamepad.hide();
    }

    onGamepadConnect(e) {
        this.addGamepad(e.gamepad);
    }

    onGamepadDisconnect(e) {
        this.removeGamepad(e.gamepad.index);
    }

    onKeyDown(e) {
        switch (e.code) {
            case "Delete":
            case "Escape":
                this.removeGamepad(this.activeGamepadIndex);
                break;
            case "KeyC":
                this.changeGamepadColor();
                break;
            case "KeyD":
                this.toggleDebug();
                break;
            case "KeyH":
                this.toggleHelp();
                break;
            case "NumpadAdd":
            case "Equal":
                this.changeZoom("+");
                break;
            case "NumpadSubtract":
            case "Minus":
                this.changeZoom("-");
                break;
            case "Numpad0":
            case "Digit0":
                this.changeZoom("0");
                break;
        }
    }

    refreshGamepads() {
        this.gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    }

    getActiveGamepad() {
        return this.activeGamepad;
    }

    addGamepad(gamepad) {
        this.gamepads[gamepad.index] = gamepad;
    }

    removeGamepad(gamepadIndex) {
        if ('undefined' === typeof gamepadIndex) {
            return;
        }
        if (gamepadIndex === this.activeGamepadIndex) {
            this.activeGamepadIndex = null;
            this.$gamepad.empty();
        }
        delete this.gamepads[gamepadIndex];

        this.displayGamepadHelp();
        this.debug = false;
    }

    scanGamepads() {
        if (null !== this.activeGamepadIndex) {
            return;
        }

        this.refreshGamepads();
        for (let gamepadIndex = 0; gamepadIndex < this.gamepads.length; gamepadIndex++) {
            const gamepad = this.gamepads[gamepadIndex];
            if (gamepad) {
                if (gamepad.index in this.gamepads) {
                    this.gamepads[gamepad.index] = gamepad;
                }

                let button;
                for (let buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
                    button = gamepad.buttons[buttonIndex];
                    if (button.pressed) {
                        this.mapGamepad(gamepad.index);
                    }
                }
            }
        }
    }

    mapGamepad(gamepadIndex) {
        if ('undefined' === typeof gamepadIndex) {
            return;
        }

        this.activeGamepadIndex = gamepadIndex;
        this.activeGamepad = this.gamepads[this.activeGamepadIndex];

        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            this.activeGamepadIndex = null;
            this.activeGamepad = null;
            this.displayGamepadHelp(true);

            return;
        }

        if (this.debug) {
            this.activeGamepadType = 'debug';
            this.activeGamepadIdentifier = this.gamepadIdentifiers[this.activeGamepadType];
            this.activeGamepadColorIndex = 0;
        } else {
            for (let gamepadType in this.gamepadIdentifiers) {
                if (this.gamepadIdentifiers[gamepadType].id.test(this.activeGamepad.id)) {
                    this.activeGamepadType = gamepadType;
                    this.activeGamepadIdentifier = this.gamepadIdentifiers[gamepadType];
                    this.activeGamepadColorIndex = 0;
                }
            }
        }

        if (!this.activeGamepadType) {
            return;
        }

        let button;
        let axis;
        this.hideGamepadHelp();
        $.ajax(
            'templates/' + this.activeGamepadType + '/template.html'
        ).done((template) => {
            this.$gamepad.html(template);

            if (this.params.gamepadColor) {
                this.changeGamepadColor(this.params.gamepadColor);
            }
            if (this.params.zoom) {
                this.changeZoom(this.params.zoom);
            }

            this.mapping.buttons = [];
            for (let buttonIndex = 0; buttonIndex < this.activeGamepad.buttons.length; buttonIndex++) {
                button = this.activeGamepad.buttons[buttonIndex];
                this.mapping.buttons[buttonIndex] = $('[data-button=' + buttonIndex + ']');
            }

            this.mapping.axes = [];
            for (let axisIndex = 0; axisIndex < this.activeGamepad.axes.length; axisIndex++) {
                axis = this.activeGamepad.axes[axisIndex];
                this.mapping.axes[axisIndex] = $('[data-axis=' + axisIndex + '], [data-axis-x=' + axisIndex + '], [data-axis-y=' + axisIndex + '], [data-axis-z=' + axisIndex + ']');
            }

            this.updateVisualStatus();
        });
    }

    updateVisualStatus() {
        this.refreshGamepads();

        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

        requestAnimationFrame(this.updateVisualStatus.bind(this));

        let button;
        let $button;
        for (let buttonIndex = 0; buttonIndex < this.activeGamepad.buttons.length; buttonIndex++) {
            $button = this.mapping.buttons[buttonIndex];
            if (!$button) {
                break;
            }

            button = this.activeGamepad.buttons[buttonIndex];

            $button.attr('data-pressed', button.pressed);
            $button.attr('data-value', button.value);

            if ("function" === typeof this.updateButton) {
                this.updateButton($button);
            }
        }

        let axis;
        let $axis;
        for (let axisIndex = 0; axisIndex < this.activeGamepad.axes.length; axisIndex++) {
            $axis = this.mapping.axes[axisIndex];
            if (!$axis) {
                break;
            }

            axis = this.activeGamepad.axes[axisIndex];

            if ($axis.is('[data-axis=' + axisIndex + ']')) {
                $axis.attr('data-value', axis);
            }
            if ($axis.is('[data-axis-x=' + axisIndex + ']')) {
                $axis.attr('data-value-x', axis);
            }
            if ($axis.is('[data-axis-y=' + axisIndex + ']')) {
                $axis.attr('data-value-y', axis);
            }
            if ($axis.is('[data-axis-z=' + axisIndex + ']')) {
                $axis.attr('data-value-z', axis);
            }

            if ("function" === typeof this.updateAxis) {
                this.updateAxis($axis);
            }
        }
    }

    changeGamepadColor(gamepadColor) {
        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

        if (!gamepadColor) {
            this.activeGamepadColorIndex++;
            if (this.activeGamepadColorIndex > this.activeGamepadIdentifier.colors.length - 1) {
                this.activeGamepadColorIndex = 0;
            }

            this.activeGamepadColorName = this.activeGamepadIdentifier.colors[this.activeGamepadColorIndex];
        } else {
            if (! isNaN(parseInt(gamepadColor))) {
                this.activeGamepadColorIndex = gamepadColor;
                this.activeGamepadColorName = this.activeGamepadIdentifier.colors[this.activeGamepadColorIndex];
            } else {
                this.activeGamepadColorName = gamepadColor;
                this.activeGamepadColorIndex = 0;
                for (let gamepadColorName in this.activeGamepadIdentifier.colors) {
                    if (this.activeGamepadColorName === gamepadColorName) {
                        break;
                    }
                    this.activeGamepadColorIndex++;
                }
            }
        }

        this.$gamepad.attr('data-color', this.activeGamepadColorName);
    }

    changeZoom(zoomLevel) {
        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

        if (!zoomLevel) {
            return;
        }

        if ('0' === zoomLevel) {
            this.activeGamepadZoomLevel = 1;
        }
        else if ('+' === zoomLevel && this.activeGamepadZoomLevel < 2) {
            this.activeGamepadZoomLevel += 0.1;
        }
        else if ('-' === zoomLevel && this.activeGamepadZoomLevel > 0.2) {
            this.activeGamepadZoomLevel -= 0.1;
        }
        else if (! isNaN(zoomLevel = parseFloat(zoomLevel))) {
            this.activeGamepadZoomLevel = zoomLevel;
        }

        // hack: fix js float issues
        this.activeGamepadZoomLevel = +this.activeGamepadZoomLevel.toFixed(1);

        this.$gamepad.css(
            'transform',
            'translate(-50%, -50%) scale(' + this.activeGamepadZoomLevel + ', ' + this.activeGamepadZoomLevel + ')'
        );
    }

    toggleHelp(zoomLevel) {
        this.$help.toggleClass('active');
    }

    toggleDebug() {
        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

        // update debug value
        this.debug = !this.debug;

        // remap current gamepad
        this.mapGamepad(this.activeGamepadIndex);
    }
}
