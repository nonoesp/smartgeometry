// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License.
/**
 * Author: David Ha <hadavid@google.com>
 *
 * 2018
 * 
 * Author: Nono Martínez Alonso <mail@nono.ma>
 * 
 * @fileoverview Adaptation of simple_predict.js to use sketch-rnn
 * to finish a drawing from an input set of strokes as a module.
 */

var sk = require('./sketch_rnn.js');
var bird_model = require('./models/bird.gen.js');
var model_raw_data = bird_model.model_raw_data;

// sketch_rnn model
var model;
var model_data;
var temperature = 0.25;
var min_sequence_length = 5;
var screen_scale_factor = 5.0;

var model_pdf; // store all the parameters of a mixture-density distribution
var model_state, model_state_orig;
var model_prev_pen;
var model_x, model_y;

// output
var predicted_strokes;

module.exports.output_strokes = function() {
    return predicted_strokes;
};

var strokes = [
    [-4, 0, 1, 0, 0],
    [-15, 9, 1, 0, 0],
    [-10, 17, 1, 0, 0],
    [-1, 28, 1, 0, 0],
    [14, 13, 1, 0, 0],
    [12, 4, 1, 0, 0],
    [22, 1, 1, 0, 0],
    [14, -11, 1, 0, 0],
    [5, -12, 1, 0, 0],
    [2, -19, 1, 0, 0],
    [-12, -23, 1, 0, 0],
    [-13, -7, 1, 0, 0],
    [-14, -1, 0, 1, 0]
];

module.exports.set_strokes = function(s) {
    strokes = s;
}

module.exports.predict = function() {

    var restart = function() {
        model_state = model.copy_state(model_state_orig);
        // nono: defines model_x and model_y with the end point of the given drawing "strokes"
        model_x = 0; //end_x;
        model_y = 0; //end_y;
        model_prev_pen = [0, 1, 0]; // nono: sets the previous status to 
    }

    var encode_strokes = function() {
        console.log('using these strokes:');
        console.log(strokes);
        model_state_orig = model.zero_state();
        // encode strokes
        model_state_orig = model.update(model.zero_input(), model_state_orig);
        for (var i = 0; i < strokes.length; i++) {
            model_state_orig = model.update(strokes[i], model_state_orig);
        }
    }

    var getModelStrokes = function() {

        var ended = false;
        var prediction = [];

        while (ended == false) {

            if (!ended) {
                var model_dx, model_dy;
                var model_pen_down, model_pen_up, model_pen_end;

                model_pdf = model.get_pdf(model_state);
                [model_dx, model_dy, model_pen_down, model_pen_up, model_pen_end] = model.sample(model_pdf, temperature);

                // nono: store sketch values on a flat array of floats
                // nono: dx, dy, p1, p2, p3
                prediction.push(model_dx);
                prediction.push(model_dy);
                prediction.push(model_pen_down);
                prediction.push(model_pen_up);
                prediction.push(model_pen_end);

                if (model_prev_pen[0] === 1) {
                    // draw line connecting prev point to current point.
                }

                model_prev_pen = [model_pen_down, model_pen_up, model_pen_end];
                model_state = model.update([model_dx, model_dy, model_pen_down, model_pen_up, model_pen_end], model_state);

                model_x += model_dx;
                model_y += model_dy;

                if (model_pen_end === 1) {
                    ended = true;
                }
            }
        }

        return prediction;

    };

    var setup = function() {
        sk.set_init_model(model_raw_data);
        model_data = sk.get_model_data();
        model = new sk.SketchRNN(model_data);
        model.set_pixel_factor(screen_scale_factor);
        encode_strokes();
        restart();
    }

    setup();
    predicted_strokes = getModelStrokes();
};