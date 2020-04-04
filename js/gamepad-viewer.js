
var currentGamepad = 0;

$(document).ready(function () {
    window.gamepad = new Gamepad();

    gamepad.bind(Gamepad.Event.CONNECTED, function (device) {
        console.log("Connected");
    });

    gamepad.bind(Gamepad.Event.DISCONNECTED, function (device) {
        console.log("Disonnected");
    });

    gamepad.bind(Gamepad.Event.TICK, function (device) {
        var pad = gamepad.gamepads[0];

        ['LEFT_STICK', 'RIGHT_STICK'].forEach(function (axis) {
            var axis_x = pad.state[axis + "_X"]
            var axis_y = pad.state[axis + "_Y"]
            $("#" + axis).css({
                "margin-top": axis_y * 25,
                "margin-left": axis_x * 25,
                "transform": 'rotateX(' + -parseFloat(axis_y * 30, 8) + 'deg) ' +
                           'rotateY(' + parseFloat(axis_x * 30, 8) + 'deg)'
            });
        });

        ['LEFT_BOTTOM_SHOULDER', 'RIGHT_BOTTOM_SHOULDER'].forEach(function (axis) {
            var value = parseFloat(pad.state[axis], 10);
            $("#" + axis).css({
                "-webkit-clip-path": `inset(${(1 - value) * 100}% 0px 0px 0pc)`
            });
        });
    });

    gamepad.bind(Gamepad.Event.BUTTON_DOWN, function (e) {
        if (e.gamepad.index == currentGamepad) {
            if (e.control == "RIGHT_BOTTOM_SHOULDER" || e.control == "LEFT_BOTTOM_SHOULDER") {
                // These are really axes, but can act as buttons, which we don't need
                return;
            }
            // update the display values
            $("#" + e.control).attr("data-pressed", true);
        }
    });

    gamepad.bind(Gamepad.Event.BUTTON_UP, function (e) {
        if (e.gamepad.index == currentGamepad) {
            if (e.control == "RIGHT_BOTTOM_SHOULDER" || e.control == "LEFT_BOTTOM_SHOULDER") {
                // These are really axes, but can act as buttons, which we don't need
                return;
            }
            // update the display values
            $("#" + e.control).attr("data-pressed", false);
        }
    });

    if (!gamepad.init()) {
		// Your browser does not support gamepads, get the latest Google Chrome or Firefox
	}

});
